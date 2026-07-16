import crypto from "crypto";
import { db } from "@/lib/db";
import { ORDER_STATUS, type DbOrder, type PaymentChannel } from "./orders";
import { transitionOrderState, canInitiateRefund, ORDER_STATE_MACHINE } from "./payment-state-machine";
import { getPaymentConfig, amountStringToCents } from "./payments";
import { normalizePlanCode } from "./plans";
import { isPaymentSimulationAllowed } from "./payment-safety";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";

export type RefundRequestParams = {
  orderId: string;
  actorUserId: string;
  actorRole: string;
  reason: string;
  amountCents?: number;
  refundType?: "full" | "partial";
  operator?: string;
};

export type RefundResult = {
  success: boolean;
  error?: string;
  refundId?: string;
  refundAmount?: number;
  orderStatus?: string;
  providerRefundId?: string;
  needsManualReview?: boolean;
};

export type RefundRecord = {
  id: string;
  orderId: string;
  orderNo: string;
  userId: string;
  amountCents: number;
  reason: string;
  status: "pending" | "success" | "failed";
  providerRefundId: string | null;
  refundedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function generateRefundId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RF${timestamp}${random}`;
}

function getRefundAmount(order: DbOrder, requestedAmount?: number): { amount: number; type: "full" | "partial" } {
  const payable = order.payableAmount;
  const alreadyRefunded = Number(
    (order.metadata as Record<string, unknown>)?.refundAmount ?? 0,
  );
  const remaining = payable - alreadyRefunded;

  if (requestedAmount === undefined || requestedAmount >= remaining) {
    return { amount: remaining, type: remaining === payable ? "full" : "partial" };
  }

  return { amount: requestedAmount, type: "partial" };
}

async function callAlipayRefund(
  orderNo: string,
  tradeNo: string,
  refundAmountCents: number,
  reason: string,
  config: Awaited<ReturnType<typeof getPaymentConfig>>,
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  if (config.testMode) {
    if (!isPaymentSimulationAllowed(config.testMode)) {
      return { success: false, error: "当前环境禁止测试退款模式，请关闭测试模式后使用支付宝真实退款。" };
    }
    return {
      success: true,
      refundId: `test_refund_${orderNo}_${Date.now()}`,
    };
  }

  const ALIPAY_GATEWAY = "https://openapi.alipay.com/gateway.do";

  try {
    const privateKey = crypto.createPrivateKey(
      config.alipayAppPrivateKey.replace(/\\n/g, "\n"),
    );

    const refundId = generateRefundId();
    const totalAmountStr = (refundAmountCents / 100).toFixed(2);

    const params: Record<string, string> = {
      app_id: config.alipayAppId,
      method: "alipay.trade.refund",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      version: "1.0",
      biz_content: JSON.stringify({
        out_trade_no: orderNo,
        trade_no: tradeNo,
        refund_amount: totalAmountStr,
        refund_reason: reason.slice(0, 256),
        out_request_no: refundId,
      }),
    };

    const sortedKeys = Object.keys(params).sort();
    const signContent = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signContent, "utf8");
    signer.end();
    params.sign = signer.sign(privateKey).toString("base64");

    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    const response = await fetch(`${ALIPAY_GATEWAY}?${queryString}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { success: false, error: "支付宝响应解析失败" };
    }

    const respKey = "alipay_trade_refund_response";
    const resp = (result[respKey] ?? {}) as Record<string, unknown>;
    const code = String(resp.code ?? "");

    if (code === "10000") {
      return {
        success: true,
        refundId: String(resp.trade_no || refundId),
      };
    }

    return {
      success: false,
      error: String(resp.sub_msg || resp.msg || `支付宝退款失败: ${code}`),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "支付宝退款请求异常",
    };
  }
}

async function revokeMembershipOnFullRefund(
  order: DbOrder,
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
): Promise<{ revoked: boolean; previousPlan?: string }> {
  const subscription = await tx.membershipSubscription.findUnique({
    where: { userId: order.userId },
  });

  if (!subscription || subscription.planCode === "free") {
    return { revoked: false };
  }

  // 核对被退款订单与当前订阅的套餐关系
  if (normalizePlanCode(subscription.planCode) !== normalizePlanCode(order.planCode)) {
    return { revoked: false };
  }

  // 如果存在更新的已支付订单，说明会员可能由后续订单产生/续期，不撤销
  const newerPaidOrder = await tx.order.findFirst({
    where: {
      userId: order.userId,
      id: { not: order.id },
      status: { in: [ORDER_STATUS.PAID, ORDER_STATUS.PARTIALLY_REFUNDED] },
      createdAt: { gt: order.createdAt },
    },
  });
  if (newerPaidOrder) return { revoked: false };

  await tx.membershipSubscription.update({
    where: { userId: order.userId },
    data: {
      planCode: "free",
      status: "cancelled",
      cancelReason: "full_refund",
      cancelledAt: new Date(),
    },
  });

  return { revoked: true, previousPlan: subscription.planCode };
}

export async function requestRefund(params: RefundRequestParams): Promise<RefundResult> {
  const { orderId, actorUserId, actorRole, reason, amountCents, operator } = params;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  if (!canInitiateRefund(order.status)) {
    return { success: false, error: `订单状态不允许退款：${order.status}` };
  }

  if (!order.providerTradeNo) {
    return { success: false, error: "订单无第三方交易号，无法发起第三方退款" };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "退款原因不能为空" };
  }

  const { amount: refundAmount, type } = getRefundAmount(order, amountCents);

  if (refundAmount <= 0) {
    return { success: false, error: "没有可退金额" };
  }

  const refundId = generateRefundId();

  try {
    const stateResult = await transitionOrderState({
      orderId,
      toState: ORDER_STATE_MACHINE.REFUND_PROCESSING,
      actorUserId,
      actorRole,
      reason: `发起退款：${reason}`,
      metadata: {
        refundId,
        refundAmount,
        refundType: type,
        operator: operator || actorUserId,
      },
    });

    if (!stateResult.success) {
      return { success: false, error: stateResult.error || "订单状态更新失败" };
    }

    const config = await getPaymentConfig();

    let providerResult: { success: boolean; refundId?: string; error?: string };

    if (order.paymentChannel === "alipay") {
      providerResult = await callAlipayRefund(
        order.orderNo,
        order.providerTradeNo,
        refundAmount,
        reason,
        config,
      );
    } else if (order.paymentChannel === "sandbox") {
      providerResult = {
        success: true,
        refundId: `sandbox_refund_${order.orderNo}`,
      };
    } else {
      await transitionOrderState({
        orderId,
        toState: order.status === "partially_refunded"
          ? ORDER_STATE_MACHINE.PARTIALLY_REFUNDED
          : ORDER_STATE_MACHINE.PAID,
        actorUserId,
        actorRole,
        reason: "退款发起失败：不支持的支付渠道",
      });
      return { success: false, error: `不支持的支付渠道：${order.paymentChannel}` };
    }

    if (!providerResult.success) {
      await transitionOrderState({
        orderId,
        toState: ORDER_STATE_MACHINE.REFUND_FAILED,
        actorUserId,
        actorRole,
        reason: providerResult.error || "第三方退款失败",
        metadata: {
          refundId,
          refundAmount,
          providerError: providerResult.error,
        },
      });

      return {
        success: false,
        error: providerResult.error || "退款失败",
        orderStatus: ORDER_STATE_MACHINE.REFUND_FAILED,
      };
    }

    const alreadyRefunded = Number(
      (order.metadata as Record<string, unknown>)?.refundAmount ?? 0,
    );
    const newRefundTotal = alreadyRefunded + refundAmount;
    const isFullRefund = newRefundTotal >= order.payableAmount;

    const finalState = isFullRefund
      ? ORDER_STATE_MACHINE.REFUNDED
      : ORDER_STATE_MACHINE.PARTIALLY_REFUNDED;

    const finalResult = await db.$transaction(async (tx) => {
      const stateRes = await transitionOrderState({
        orderId,
        toState: finalState,
        actorUserId,
        actorRole,
        reason: `退款成功：${reason}`,
        metadata: {
          refundId,
          providerRefundId: providerResult.refundId,
          refundAmount,
          totalRefunded: newRefundTotal,
          refundType: type,
        },
        extraUpdateData: {
          refundReason: reason,
          refundBy: operator || actorUserId,
        },
      });

      if (!stateRes.success) {
        throw new Error(stateRes.error || "状态更新失败");
      }

      if (isFullRefund) {
        await revokeMembershipOnFullRefund(order, tx);
      }

      return { finalState, isFullRefund };
    });

    await writeAdminAuditLog({
      actorUserId,
      actorRole,
      action: "billing.refund_success",
      targetType: "order",
      targetId: orderId,
      success: true,
      metadata: {
        refundId,
        providerRefundId: providerResult.refundId,
        refundAmount,
        totalRefunded: newRefundTotal,
        refundType: type,
        isFullRefund,
        orderNo: order.orderNo,
        paymentChannel: order.paymentChannel,
        planCode: order.planCode,
        reason,
      },
    });

    return {
      success: true,
      refundId,
      refundAmount,
      orderStatus: finalResult.finalState,
      providerRefundId: providerResult.refundId,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[refund-service] 退款处理异常:", { orderId, error: errorMsg });

    await writeAdminAuditLog({
      actorUserId,
      actorRole,
      action: "billing.refund_exception",
      targetType: "order",
      targetId: orderId,
      success: false,
      metadata: {
        refundId,
        refundAmount,
        error: errorMsg,
        orderNo: order.orderNo,
      },
    });

    return { success: false, error: errorMsg };
  }
}

export async function queryRefundStatus(
  orderId: string,
  actorUserId: string,
  actorRole: string,
): Promise<{
  success: boolean;
  refundStatus?: string;
  refundedAmount?: number;
  totalAmount?: number;
  error?: string;
}> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  const metadata = (order.metadata as Record<string, unknown>) || {};
  const refundAmount = Number(metadata.refundAmount ?? 0);

  return {
    success: true,
    refundStatus: order.status,
    refundedAmount: refundAmount,
    totalAmount: order.payableAmount,
  };
}

export async function handleAlipayRefundNotify(
  params: Record<string, string>,
  publicKey: string,
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  const sign = params.sign;
  if (!sign) {
    return { success: false, error: "缺少签名" };
  }

  const tradeNo = params.trade_no || "";
  const outTradeNo = params.out_trade_no || "";
  const refundAmountStr = params.refund_amount || "";

  const refundAmountCents = amountStringToCents(refundAmountStr);

  const order = await db.order.findUnique({ where: { orderNo: outTradeNo } });
  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  if (order.status === ORDER_STATUS.REFUNDED || order.status === ORDER_STATUS.PARTIALLY_REFUNDED) {
    return { success: true, orderId: order.id };
  }

  return {
    success: true,
    orderId: order.id,
  };
}
