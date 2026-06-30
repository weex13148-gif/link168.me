import { db } from "@/lib/db";
import { ORDER_STATUS, processPaymentSuccess } from "./orders";
import { getPaymentConfig, validateAlipayNotify, validateWechatNotify } from "./payments";
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

    const order = await db.order.findUnique({
      where: { orderNo: validation.orderNo },
    });

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
  try {
    const config = await getPaymentConfig();

    if (!config.enabled) {
      console.error("[webhook/alipay] 支付功能已关闭");
      return { success: false, handled: false, error: "支付功能已关闭" };
    }

    if (!config.alipayEnabled) {
      console.error("[webhook/alipay] 支付宝已关闭");
      return { success: false, handled: false, error: "支付宝已关闭" };
    }

    if (!config.alipayAppId || !config.alipayPublicKey) {
      console.error("[webhook/alipay] 支付宝未完整配置");
      return { success: false, handled: false, error: "支付宝未完整配置" };
    }

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
      return { success: false, handled: false, error: validation.error || "支付宝回调验证失败" };
    }

    if (validation.appId !== config.alipayAppId) {
      console.error("[webhook/alipay] app_id 不匹配: orderNo=%s", validation.orderNo);
      return { success: false, handled: false, error: "app_id 不匹配" };
    }

    if (config.alipaySellerId && validation.sellerId !== config.alipaySellerId) {
      console.error("[webhook/alipay] seller_id 不匹配: orderNo=%s", validation.orderNo);
      return { success: false, handled: false, error: "seller_id 不匹配" };
    }

    const order = await db.order.findUnique({
      where: { orderNo: validation.orderNo },
    });

    if (!order) {
      console.error("[webhook/alipay] 订单不存在:", validation.orderNo);
      return { success: false, handled: false, error: "订单不存在" };
    }

    if (order.payableAmount !== validation.totalAmountCents) {
      console.error(
        "[webhook/alipay] 金额不匹配: orderNo=%s expected=%s actual=%s",
        validation.orderNo,
        order.payableAmount,
        validation.totalAmountCents,
      );
      return { success: false, handled: false, error: "金额不匹配" };
    }

    if (order.paymentChannel && order.paymentChannel !== "alipay") {
      console.error("[webhook/alipay] 支付渠道不匹配: orderNo=%s channel=%s", validation.orderNo, order.paymentChannel);
      return { success: false, handled: false, error: "支付渠道不匹配" };
    }

    if (order.status === ORDER_STATUS.PAID) {
      if (order.providerTradeNo === validation.tradeNo) {
        return { success: true, handled: true, orderId: order.id };
      }

      console.error("[webhook/alipay] 已支付订单的交易号不匹配: orderNo=%s", validation.orderNo);
      return { success: false, handled: false, error: "订单已支付且交易号不匹配" };
    }

    if (order.status !== ORDER_STATUS.PROCESSING) {
      console.error("[webhook/alipay] 订单状态不允许处理成功回调: orderNo=%s status=%s", validation.orderNo, order.status);
      return { success: false, handled: false, error: `订单状态不允许支付：${order.status}` };
    }

    const result = await processPaymentSuccess({
      orderNo: validation.orderNo,
      providerTradeNo: validation.tradeNo,
      paymentChannel: "alipay" as PaymentChannel,
      paidAmountCents: validation.totalAmountCents,
    });

    if (!result.success) {
      console.error("[webhook/alipay] 处理失败:", result.error);
      return { success: false, handled: false, error: result.error };
    }

    return { success: true, handled: true, orderId: result.order?.id };
  } catch (err) {
    console.error("[webhook/alipay] 异常:", err);
    return { success: false, handled: false, error: "系统错误" };
  }
}
