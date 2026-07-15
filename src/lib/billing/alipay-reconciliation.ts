import { db } from "@/lib/db";
import { queryAlipayTrade } from "@/lib/billing/alipay-query";
import { recordAlipayDiagnostic } from "@/lib/billing/payment-diagnostics";
import { ORDER_STATUS, processPaymentSuccess } from "@/lib/billing/orders";

const SUCCESS_STATUSES = new Set(["TRADE_SUCCESS", "TRADE_FINISHED"]);
const RECONCILABLE_STATUSES = new Set<string>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.EXPIRED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.FAILED,
]);

export type AlipayReconciliationResult = {
  success: boolean;
  reconciled: boolean;
  alreadyPaid?: boolean;
  orderNo: string;
  orderStatus?: string;
  tradeStatus?: string;
  tradeNo?: string;
  providerTested?: boolean;
  providerVerified?: boolean;
  error?: string;
};

export async function queryAndReconcileAlipayOrder(params: {
  orderNo: string;
  reconcile?: boolean;
  source: "admin" | "scheduled" | "callback_recovery";
}): Promise<AlipayReconciliationResult> {
  const orderNo = params.orderNo.trim();
  const order = await db.order.findUnique({ where: { orderNo } });
  if (!order) {
    await recordAlipayDiagnostic({ type: "QUERY_ORDER_NOT_FOUND", success: false, orderNo, error: "本地订单不存在" });
    return { success: false, reconciled: false, orderNo, error: "本地订单不存在。" };
  }

  if (order.status === ORDER_STATUS.PAID) {
    return {
      success: true,
      reconciled: false,
      alreadyPaid: true,
      orderNo,
      orderStatus: order.status,
      tradeNo: order.providerTradeNo || undefined,
    };
  }

  const query = await queryAlipayTrade(orderNo);
  const providerEvidence = {
    providerTested: true,
    providerVerified: query.responseVerified === true,
  };
  await recordAlipayDiagnostic({
    type: "TRADE_QUERY",
    success: query.success,
    orderNo,
    tradeNo: query.tradeNo,
    error: query.errorMessage,
    metadata: {
      found: query.found,
      tradeStatus: query.tradeStatus || null,
      totalAmountCents: query.totalAmountCents ?? null,
      responseVerified: query.responseVerified ?? false,
      source: params.source,
      errorCode: query.errorCode || null,
    },
  });

  if (!query.success || !query.found) {
    return {
      ...providerEvidence,
      success: query.success,
      reconciled: false,
      orderNo,
      orderStatus: order.status,
      tradeStatus: query.tradeStatus,
      error: query.errorMessage || "支付宝未查询到已支付交易。",
    };
  }

  if (!query.responseVerified) {
    return { ...providerEvidence, success: false, reconciled: false, orderNo, orderStatus: order.status, error: "支付宝查单响应未通过验签。" };
  }
  if (!query.tradeStatus || !SUCCESS_STATUSES.has(query.tradeStatus)) {
    return {
      ...providerEvidence,
      success: true,
      reconciled: false,
      orderNo,
      orderStatus: order.status,
      tradeStatus: query.tradeStatus,
      tradeNo: query.tradeNo,
      error: `支付宝交易尚未成功：${query.tradeStatus || "UNKNOWN"}`,
    };
  }
  if (!query.tradeNo) {
    return { ...providerEvidence, success: false, reconciled: false, orderNo, orderStatus: order.status, error: "支付宝查单结果缺少交易号。" };
  }
  if (query.totalAmountCents === undefined || query.totalAmountCents !== order.payableAmount) {
    await recordAlipayDiagnostic({
      type: "QUERY_AMOUNT_MISMATCH",
      success: false,
      orderNo,
      tradeNo: query.tradeNo,
      error: "主动查单金额不匹配",
      metadata: { expected: order.payableAmount, actual: query.totalAmountCents ?? null },
    });
    return { ...providerEvidence, success: false, reconciled: false, orderNo, orderStatus: order.status, error: "支付宝金额与本地订单不一致。" };
  }

  if (params.reconcile === false) {
    return {
      ...providerEvidence,
      success: true,
      reconciled: false,
      orderNo,
      orderStatus: order.status,
      tradeStatus: query.tradeStatus,
      tradeNo: query.tradeNo,
    };
  }

  if (!RECONCILABLE_STATUSES.has(order.status)) {
    return { ...providerEvidence, success: false, reconciled: false, orderNo, orderStatus: order.status, error: `订单状态不允许补单：${order.status}` };
  }

  const existingMetadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
    ? order.metadata as Record<string, unknown>
    : {};

  await db.order.update({
    where: { id: order.id },
    data: {
      status: ORDER_STATUS.PROCESSING,
      paymentChannel: "alipay",
      expiresAt: null,
      metadata: {
        ...existingMetadata,
        lastReconciliation: {
          source: params.source,
          previousStatus: order.status,
          queriedAt: new Date().toISOString(),
          tradeStatus: query.tradeStatus,
          tradeNo: query.tradeNo,
        },
      },
    },
  });

  const processed = await processPaymentSuccess({
    orderNo,
    providerTradeNo: query.tradeNo,
    paymentChannel: "alipay",
    paidAmountCents: query.totalAmountCents,
  });

  await recordAlipayDiagnostic({
    type: processed.success ? "RECONCILE_SUCCESS" : "RECONCILE_FAILED",
    success: processed.success,
    orderNo,
    tradeNo: query.tradeNo,
    error: processed.error,
    metadata: { source: params.source, previousStatus: order.status, tradeStatus: query.tradeStatus },
  });

  return {
    ...providerEvidence,
    success: processed.success,
    reconciled: processed.success,
    orderNo,
    orderStatus: processed.order?.status || ORDER_STATUS.PROCESSING,
    tradeStatus: query.tradeStatus,
    tradeNo: query.tradeNo,
    error: processed.error,
  };
}

export async function reconcilePendingAlipayOrders(limit = 30) {
  const candidates = await db.order.findMany({
    where: {
      status: { in: [ORDER_STATUS.PROCESSING, ORDER_STATUS.EXPIRED, ORDER_STATUS.PENDING] },
      OR: [{ paymentChannel: "alipay" }, { paymentChannel: null }],
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: { orderNo: true },
  });

  const results: AlipayReconciliationResult[] = [];
  for (const candidate of candidates) {
    results.push(await queryAndReconcileAlipayOrder({
      orderNo: candidate.orderNo,
      reconcile: true,
      source: "scheduled",
    }));
  }

  return {
    checked: results.length,
    reconciled: results.filter((item) => item.reconciled).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}
