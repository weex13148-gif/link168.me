import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAlipayOrder, PayPlan } from "@/lib/pay/alipay";

export const runtime = "nodejs";

const PLAN_PRICE: Record<PayPlan, number> = {
  basic: 25.8,
  plus: 108,
  pro: 188
};

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const body = await request.json().catch(() => ({}));
  const planCode = body.planCode as PayPlan;

  if (!planCode || !PLAN_PRICE[planCode]) {
    return NextResponse.json({ success: false, error: "非法套餐" }, { status: 400 });
  }

  const amount = PLAN_PRICE[planCode];

  // One pending order per user: return existing pending order if exists
  const existingPending = await db.paymentOrder.findFirst({
    where: {
      userId: user.id,
      planCode,
      status: "pending"
    },
    orderBy: { createdAt: "desc" }
  });

  if (existingPending) {
    const order = createAlipayOrder({
      userId: user.id,
      planCode,
      amount
    });
    return NextResponse.json({
      success: true,
      data: {
        orderId: existingPending.orderId,
        payUrl: order.payUrl,
        amount: existingPending.amount,
        planCode: existingPending.planCode,
        reused: true
      }
    });
  }

  const order = createAlipayOrder({
    userId: user.id,
    planCode,
    amount
  });

  await db.paymentOrder.create({
    data: {
      orderId: order.orderId,
      userId: user.id,
      planCode,
      amount,
      status: "pending"
    }
  });

  return NextResponse.json({
    success: true,
    data: order
  });
}
