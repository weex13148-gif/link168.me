import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { closeExpiredOrders, createOrder, getUserOrders, updateOrderPaymentChannel, BillingPermissionError } from "@/lib/billing/orders";
import { createPayment, getPaymentAvailability } from "@/lib/billing/payments";
import { getPlanDefinition, isPriceConfirmed } from "@/lib/billing/plans";
import type { PlanCode } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    await closeExpiredOrders();
    const orders = await getUserOrders(user.id);
    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error("[billing/orders] 获取订单失败:", err);
    return NextResponse.json({ success: false, error: "获取订单失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const body = (await request.json()) as {
      planCode?: string;
      billingCycle?: string;
      paymentChannel?: string;
    };

    const { planCode, billingCycle = "yearly", paymentChannel } = body;

    if (!planCode) {
      return NextResponse.json({ success: false, error: "缺少 planCode 参数" }, { status: 400 });
    }

    if (billingCycle !== "monthly" && billingCycle !== "yearly") {
      return NextResponse.json({ success: false, error: "billingCycle 必须是 monthly 或 yearly" }, { status: 400 });
    }

    const availability = await getPaymentAvailability();
    if (!availability.paymentEnabled) {
      return NextResponse.json({ success: false, error: "支付功能暂未开放" }, { status: 400 });
    }

    if (!availability.wechatAvailable && !availability.alipayAvailable) {
      return NextResponse.json({ success: false, error: "暂无可用支付方式" }, { status: 400 });
    }

    if (!isPriceConfirmed(planCode as PlanCode, billingCycle)) {
      const plan = getPlanDefinition(planCode);
      return NextResponse.json(
        {
          success: false,
          error: `${plan.name} 的${billingCycle === "yearly" ? "年付" : "月付"}价格尚未确认，暂不支持购买`,
        },
        { status: 400 },
      );
    }

    // Layer 1: API 层强制校验 — 仅 super_admin 可创建 internal_test 订单
    if (planCode === "internal_test" && user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "无权使用内部测试套餐" },
        { status: 403 },
      );
    }

    const order = await createOrder({
      userId: user.id,
      planCode: planCode as PlanCode,
      billingCycle,
    });

    if (paymentChannel && (paymentChannel === "wechat" || paymentChannel === "alipay")) {
      const paymentResult = await createPayment(order, paymentChannel);
      if (!paymentResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: paymentResult.errorMessage,
            order,
          },
          { status: 400 },
        );
      }

      const processingOrder = await updateOrderPaymentChannel(order.id, user.id, paymentChannel);
      if (!processingOrder) {
        return NextResponse.json(
          {
            success: false,
            error: "订单状态更新失败，请刷新后重试",
            order,
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        order: processingOrder,
        payment: {
          qrCodeUrl: paymentResult.qrCodeUrl,
          payUrl: paymentResult.payUrl,
          prepayId: paymentResult.prepayId,
          orderInfo: paymentResult.orderInfo,
        },
      });
    }

    return NextResponse.json({
      success: true,
      order,
      availability,
    });
  } catch (err) {
    if (err instanceof BillingPermissionError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 });
    }
    console.error("[billing/orders] 创建订单失败:", err);
    const message = err instanceof Error ? err.message : "创建订单失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
