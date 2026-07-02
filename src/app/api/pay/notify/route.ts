import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// MOCK notify endpoint (replace with Alipay signature verification later)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.orderId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const { orderId } = body;

  const order = await db.paymentOrder.findUnique({ where: { orderId } });
  if (!order) {
    return NextResponse.json({ success: false, error: "order not found" }, { status: 404 });
  }

  await db.paymentOrder.update({
    where: { orderId },
    data: { status: "paid" }
  });

  await db.membershipSubscription.upsert({
    where: { userId: order.userId },
    update: {
      planCode: order.planCode,
      status: "active"
    },
    create: {
      userId: order.userId,
      planCode: order.planCode,
      status: "active"
    }
  });

  return NextResponse.json({ success: true });
}
