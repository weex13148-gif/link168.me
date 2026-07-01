import { db } from "@/lib/db";
import { ORDER_STATUS, processPaymentSuccess } from "./orders";
import { getPaymentConfig, validateAlipayNotify, validateWechatNotify } from "./payments";
import { recordAlipayDiagnostic } from "./payment-diagnostics";
import type { PaymentChannel } from "./orders";

export type CallbackResult = {
  success: boolean;
  handled: boolean;
  orderId?: string;
  error?: string;
};

export async function handleWechatPayNotify(params: Record<string, string>): Promise<CallbackResult> {
  try {
    const config = await getPaymentConfig();

    if (!config.enabled) {
      console.error("[webhook/wechat] 支付功能已关闭");
      return { success: false, handled: false, error: "支付功能已关闭" };
    }

    if (!config.wechatEnabled) {
      console.error("[webhook/wechat] 微信支付已关闭");
      return { success: false, handled: false, error: "微信支付已关闭" };
    }

    if (!config.merchantId || !config.wechatAppId || !config.apiKey) {
      console.error("[webhook/wechat] 微信支付未完整配置");
      return { success: false, handled: false, error: "微信支付未完整配置" };
    }

    const validation = validateWechatNotify(params, config.apiKey);
    if (!validation.valid || !validation.orderNo || !validation.tradeNo || validation.totalFee === undefined) {
      console.error("[webhook/wechat] 验证失败:", validation.error);
      return { success: false, handled: false, error: validation.error || "微信回调验证失败" };
    }

    const order = await db.order.findUnique({ where: { orderNo: validation.orderNo } });
    if (!order) {
      console.error("[webhook/wechat] 订单不存在:", validation.orderNo);
      return { success: false, handled: false, error: "订单不存在" };
    }

    if (order.payableAmount !== validation.totalFee) {
      console.error("[webhook/wechat] 金额不匹配: orderNo=%s expected=%s actual=%s", validation.orderNo, order.payableAmount, validation.totalFee);
      return { success: false, handled: false, error: "金额不匹配" };
    }

    const result = await processPaymentSuccess({
      orderNo: validation.orderNo,
      providerTradeNo: validation.tradeNo,
      paymentChannel: "wechat" as PaymentChannel,
      paidAmountCents: validation.totalFee,
    });

    if (!result.success) {
      console.error("[webhook/wechat] 处理失败:", result.error);
      return { success: false, handled: false, error: result.error };
    }

    return { success: true, handled: true, orderId: result.order?.id };
  } catch (err) {
    console.error("[webhook/wechat] 异常:", err);
    return { success: false, handled: false, error: "系统错误" };
  }
}

export async function handleAlipayNotify(params: Record<string, string>): Promise<CallbackResult> {
  const orderNoHint = params.out_trade_no || "";
  const tradeNoHint = params.trade_no || "";

  async function fail(type: string, error: string, metadata?: Record<string, unknown>): Promise<CallbackResult> {
    await recordAlipayDiagnostic({
      type,
      success: false,
      orderNo: orderNoHint || undefined,
      tradeNo: tradeNoHint || undefined,
      error,
      metadata,
    });
    return { success: false, handled: false, error };
  }

  try {
    const config = await getPaymentConfig();

    if (!config.enabled) return fail("CALLBACK_PAYMENT_DISABLED", "支付功能已关闭");
    if (!config.alipayEnabled) return fail("CALLBACK_ALIPAY_DISABLED", "支付宝已关闭");
    if (!config.alipayAppId || !config.alipayPublicKey) return fail("CALLBACK_CONFIG_INCOMPLETE", "支付宝未完整配置");

    const validation = validateAlipayNotify(params, config.alipayPublicKey);
    if (
      !validation.valid ||
      !validation.orderNo ||
      !validation.tradeNo ||
      !validation.tradeStatus ||
      !validation.appId ||
      validation.totalAmountCents === undefined
    ) {
      console.error("[webhook/alipay] 验证失败:", validation.error);
      return fail("CALLBACK_VERIFY_FAILED", validation.error || "支付宝回调验证失败", {
        receivedFields: Object.keys(params).sort(),
      });
    }

    if (validation.appId !== config.alipayAppId) {
      console.error("[webhook/alipay] app_id 不匹配: orderNo=%s", validation.orderNo);
      return fail("CALLBACK_APP_ID_MISMATCH", "app_id 不匹配", { receivedAppId: validation.appId });
    }

    if (config.alipaySellerId && validation.sellerId !== config.alipaySellerId) {
      console.error("[webhook/alipay] seller_id 不匹配: orderNo=%s", validation.orderNo);
      return fail("CALLBACK_SELLER_ID_MISMATCH", "seller_id 不匹配", { receivedSellerId: validation.sellerId || null });
    }

    const order = await db.order.findUnique({ where: { orderNo: validation.orderNo } });
    if (!order) {
      console.error("[webhook/alipay] 订单不存在:", validation.orderNo);
      return fail("CALLBACK_ORDER_NOT_FOUND", "订单不存在");
    }

    if (order.payableAmount !== validation.totalAmountCents) {
      console.error(
        "[webhook/alipay] 金额不匹配: orderNo=%s expected=%s actual=%s",
        validation.orderNo,
        order.payableAmount,
        validation.totalAmountCents,
      );
      return fail("CALLBACK_AMOUNT_MISMATCH", "金额不匹配", {
        expected: order.payableAmount,
        actual: validation.totalAmountCents,
      });
    }

    if (order.paymentChannel && order.paymentChannel !== "alipay") {
      console.error("[webhook/alipay] 支付渠道不匹配: orderNo=%s channel=%s", validation.orderNo, order.paymentChannel);
      return fail("CALLBACK_CHANNEL_MISMATCH", "支付渠道不匹配", { paymentChannel: order.paymentChannel });
    }

    if (order.status === ORDER_STATUS.PAID) {
      if (order.providerTradeNo === validation.tradeNo) {
        await recordAlipayDiagnostic({
          type: "CALLBACK_DUPLICATE_SUCCESS",
          success: true,
          orderNo: validation.orderNo,
          tradeNo: validation.tradeNo,
          metadata: { status: order.status },
        });
        return { success: true, handled: true, orderId: order.id };
      }
      return fail("CALLBACK_TRADE_NO_MISMATCH", "订单已支付且交易号不匹配", {
        existingTradeNo: order.providerTradeNo,
      });
    }

    if ([ORDER_STATUS.REFUNDED, ORDER_STATUS.PARTIALLY_REFUNDED, ORDER_STATUS.REFUND_PENDING].includes(order.status as never)) {
      return fail("CALLBACK_REFUND_STATE", `订单处于退款状态，不能重新开通：${order.status}`);
    }

    const existingMetadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? order.metadata as Record<string, unknown>
      : {};

    if (order.status !== ORDER_STATUS.PROCESSING || order.expiresAt) {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.PROCESSING,
          paymentChannel: "alipay",
          expiresAt: null,
          metadata: {
            ...existingMetadata,
            callbackRecovery: {
              previousStatus: order.status,
              recoveredAt: new Date().toISOString(),
              tradeStatus: validation.tradeStatus,
            },
          },
        },
      });
    }

    const result = await processPaymentSuccess({
      orderNo: validation.orderNo,
      providerTradeNo: validation.tradeNo,
      paymentChannel: "alipay" as PaymentChannel,
      paidAmountCents: validation.totalAmountCents,
    });

    if (!result.success) {
      console.error("[webhook/alipay] 处理失败:", result.error);
      return fail("CALLBACK_PROCESS_FAILED", result.error || "支付成功处理失败", {
        previousStatus: order.status,
        tradeStatus: validation.tradeStatus,
      });
    }

    await recordAlipayDiagnostic({
      type: "CALLBACK_SUCCESS",
      success: true,
      orderNo: validation.orderNo,
      tradeNo: validation.tradeNo,
      metadata: {
        previousStatus: order.status,
        tradeStatus: validation.tradeStatus,
        amount: validation.totalAmountCents,
        recovered: order.status !== ORDER_STATUS.PROCESSING || Boolean(order.expiresAt),
      },
    });
    return { success: true, handled: true, orderId: result.order?.id };
  } catch (err) {
    console.error("[webhook/alipay] 异常:", err);
    return fail("CALLBACK_EXCEPTION", err instanceof Error ? err.message : "系统错误");
  }
}
