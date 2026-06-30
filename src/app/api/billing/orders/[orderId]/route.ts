import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { cancelOrder, getOrderById, ORDER_STATUS, updateOrderPaymentChannel } from "@/lib/billing/orders";
import { createPayment, getPaymentAvailability, isPaymentMethodAvailable } from "@/lib/billing/payments";
import type { BillingOrder, PaymentChannel } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const order = await getOrderById(orderId, user.id);
  if (!order) {
    return NextResponse.json({ success: false, error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true, order });
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const order = await getOrderById(orderId, user.id);
  if (!order) {
    return NextResponse.json({ success: false, error: "订单不存在" }, { status: 404 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "pay") {
    return handlePay(order, request);
  }

  if (action === "cancel") {
    return handleCancel(orderId, user.id);
  }

  return NextResponse.json({ success: false, error: "无效的操作" }, { status: 400 });
}

async function handlePay(order: BillingOrder, request: Request) {
  if (order.status !== ORDER_STATUS.PENDING) {
    return NextResponse.json({ success: false, error: "订单状态不支持支付" }, { status: 400 });
  }

  let body: { paymentChannel?: string };
  try {
    body = (await request.json()) as { paymentChannel?: string };
  } catch {
    return NextResponse.json({ success: false, error: "请求参数无效" }, { status: 400 });
  }

  const paymentChannel = body.paymentChannel;
  if (!paymentChannel || (paymentChannel !== "wechat" && paymentChannel !== "alipay")) {
    return NextResponse.json({ success: false, error: "无效的支付方式" }, { status: 400 });
  }

  const available = await isPaymentMethodAvailable(paymentChannel as PaymentChannel);
  if (!available) {
    const availability = await getPaymentAvailability();
    const reason =
      paymentChannel === "wechat"
        ? availability.wechatReason || "微信支付暂未开放"
        : availability.alipayReason || "支付宝暂未开放";

    return NextResponse.json({ success: false, error: reason }, { status: 503 });
  }

  const payResult = await createPayment(order, paymentChannel as PaymentChannel);
  if (!payResult.success) {
    return NextResponse.json(
      { success: false, error: payResult.errorMessage || "支付下单失败" },
      { status: 500 },
    );
  }

  const processingOrder = await updateOrderPaymentChannel(order.id, order.userId, paymentChannel as PaymentChannel);
  if (!processingOrder) {
    return NextResponse.json({ success: false, error: "订单状态更新失败，请刷新后重试" }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    order: processingOrder,
    payment: {
      method: paymentChannel,
      payUrl: payResult.payUrl,
      qrCodeUrl: payResult.qrCodeUrl,
      prepayId: payResult.prepayId,
      orderInfo: payResult.orderInfo,
    },
  });
}

async function handleCancel(orderId: string, userId: string) {
  const order = await getOrderById(orderId, userId);
  if (!order) {
    return NextResponse.json({ success: false, error: "订单不存在" }, { status: 404 });
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    return NextResponse.json({ success: false, error: "订单状态不支持取消" }, { status: 400 });
  }

  const result = await cancelOrder(orderId, userId, "用户主动取消");
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "订单已取消" });
}
