import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  closeExpiredOrders,
  createOrder,
  getUserOrders,
  updateOrderPaymentChannel,
  BillingPermissionError,
  type BillingOrder,
} from "@/lib/billing/orders";
import { createPayment, getPaymentAvailability } from "@/lib/billing/payments";
import { PLAN_DEFINITIONS, getPlanDefinition, isPriceConfirmed, type PlanCode } from "@/lib/billing/plans";

export const runtime = "nodejs";

function serializeOrder(order: BillingOrder) {
  return {
    ...order,
    order_no: order.orderNo,
    plan_code: order.planCode,
    plan_name: order.planName,
    billing_cycle: order.billingCycle,
    amount: order.payableAmount,
    payment_method: order.paymentChannel,
    paid_at: order.paidAt,
    created_at: order.createdAt,
    refund_amount: order.refundAmount,
  };
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    await closeExpiredOrders();
    const orders = await getUserOrders(user.id);
    return NextResponse.json({ success: true, orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error("[billing/orders] 获取订单失败:", error);
    return NextResponse.json({ success: false, error: "获取订单失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  if (!user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "请先完成邮箱验证，再购买会员。", blockedType: "EMAIL_UNVERIFIED" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const planCodeRaw = String(body.planCode ?? body.plan_code ?? "").trim();
    const billingCycleRaw = String(body.billingCycle ?? body.billing_cycle ?? "yearly").trim();
    const paymentChannelRaw = String(body.paymentChannel ?? body.payment_method ?? "alipay").trim();

    if (!planCodeRaw || !(planCodeRaw in PLAN_DEFINITIONS)) {
      return NextResponse.json({ success: false, error: "请选择有效套餐" }, { status: 400 });
    }

    const planCode = planCodeRaw as PlanCode;
    if (planCode === "free") {
      return NextResponse.json({ success: false, error: "免费版无需下单" }, { status: 400 });
    }

    if (billingCycleRaw !== "yearly") {
      return NextResponse.json({ success: false, error: "当前正式销售仅支持年付" }, { status: 400 });
    }

    if (paymentChannelRaw === "wechat") {
      return NextResponse.json({ success: false, error: "微信支付后续开放，当前请使用支付宝。" }, { status: 400 });
    }
    if (paymentChannelRaw !== "alipay") {
      return NextResponse.json({ success: false, error: "当前仅支持支付宝" }, { status: 400 });
    }

    if (planCode === "internal_test" && user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "无权使用内部测试套餐" }, { status: 403 });
    }

    if (!isPriceConfirmed(planCode, "yearly")) {
      const plan = getPlanDefinition(planCode);
      return NextResponse.json({ success: false, error: `${plan.name} 年付价格尚未确认` }, { status: 400 });
    }

    const availability = await getPaymentAvailability();
    if (!availability.paymentEnabled) {
      return NextResponse.json({ success: false, error: "当前环境暂不支持在线支付" }, { status: 503 });
    }
    if (!availability.alipayAvailable) {
      return NextResponse.json(
        { success: false, error: availability.alipayReason || "支付宝暂不可用" },
        { status: 503 },
      );
    }

    // 支付成功发放额度时依赖额度账户；下单前幂等创建，兼容历史用户。
    await db.aiCreditAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const order = await createOrder({
      userId: user.id,
      planCode,
      billingCycle: "yearly",
      metadata: { source: "workbench_membership", paymentChannel: "alipay" },
    });

    const paymentResult = await createPayment(order, "alipay");
    if (!paymentResult.success) {
      return NextResponse.json(
        { success: false, error: paymentResult.errorMessage || "支付宝下单失败", order: serializeOrder(order) },
        { status: 502 },
      );
    }

    const processingOrder = await updateOrderPaymentChannel(order.id, user.id, "alipay");
    if (!processingOrder) {
      return NextResponse.json({ success: false, error: "订单状态更新失败，请重新下单" }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      order: serializeOrder(processingOrder),
      payment: {
        method: "alipay",
        payUrl: paymentResult.payUrl,
        pay_url: paymentResult.payUrl,
        orderInfo: paymentResult.orderInfo,
        order_info: paymentResult.orderInfo,
      },
    });
  } catch (error) {
    if (error instanceof BillingPermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("[billing/orders] 创建订单失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "创建订单失败" },
      { status: 500 },
    );
  }
}
