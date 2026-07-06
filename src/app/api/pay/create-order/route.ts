import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  BillingPermissionError,
  createOrder,
  updateOrderPaymentChannel,
} from "@/lib/billing/orders";
import { createPayment, getPaymentAvailability } from "@/lib/billing/payments";
import { PLAN_DEFINITIONS, type PlanCode } from "@/lib/billing/plans";

export const runtime = "nodejs";

const LEGACY_PLAN_MAP: Record<string, PlanCode> = {
  basic: "member_plus",
  plus: "member_plus",
  pro: "pro",
  member_basic: "member_basic",
  member_plus: "member_plus",
  enterprise: "enterprise",
  enterprise_pro_plus: "enterprise_pro_plus",
  internal_test: "internal_test",
};

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  if (!user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "请先完成邮箱验证，再购买会员。" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawPlanCode = String(body.planCode ?? body.plan_code ?? "").trim();
    const planCode = LEGACY_PLAN_MAP[rawPlanCode];

    if (!planCode || !(planCode in PLAN_DEFINITIONS) || planCode === "free") {
      return NextResponse.json({ success: false, error: "请选择有效套餐" }, { status: 400 });
    }

    if (planCode === "internal_test" && user.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "无权使用内部测试套餐" }, { status: 403 });
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

    await db.aiCreditAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const order = await createOrder({
      userId: user.id,
      planCode,
      billingCycle: "yearly",
      metadata: { source: "legacy_pay_create_order", legacyPlanCode: rawPlanCode },
    });

    const paymentResult = await createPayment(order, "alipay");
    if (!paymentResult.success) {
      return NextResponse.json(
        { success: false, error: paymentResult.errorMessage || "支付宝下单失败" },
        { status: 502 },
      );
    }

    const processingOrder = await updateOrderPaymentChannel(order.id, user.id, "alipay");
    if (!processingOrder) {
      return NextResponse.json({ success: false, error: "订单状态更新失败，请重新下单" }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: processingOrder.id,
        orderNo: processingOrder.orderNo,
        payUrl: paymentResult.payUrl,
        orderInfo: paymentResult.orderInfo,
        amount: processingOrder.payableAmount / 100,
        amountCents: processingOrder.payableAmount,
        planCode: processingOrder.planCode,
        legacyPlanCode: rawPlanCode,
      },
    });
  } catch (error) {
    if (error instanceof BillingPermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("[pay/create-order] 创建兼容订单失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "创建订单失败" },
      { status: 500 },
    );
  }
}
