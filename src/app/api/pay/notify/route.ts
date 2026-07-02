import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// MOCK notify endpoint (replace with Alipay signature verification later)
// IMPORTANT: This is a legacy endpoint for backward compatibility with the old payment flow
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

  // Idempotency: if already paid, skip processing and return success
  if (order.status === "paid") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  // Only process if order is in pending state
  if (order.status !== "pending") {
    return NextResponse.json({ success: false, error: "order not in pending state" }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      // Re-check status inside transaction for safety (optimistic concurrency)
      const currentOrder = await tx.paymentOrder.findUnique({
        where: { orderId },
      });

      if (!currentOrder) {
        throw new Error("order not found");
      }

      if (currentOrder.status === "paid") {
        // Already paid by concurrent request - idempotent
        return;
      }

      if (currentOrder.status !== "pending") {
        throw new Error("order not in pending state");
      }

      // Update order status
      await tx.paymentOrder.update({
        where: { orderId },
        data: { status: "paid" },
      });

      // Update or create subscription
      await tx.membershipSubscription.upsert({
        where: { userId: order.userId },
        update: {
          planCode: order.planCode,
          status: "active",
        },
        create: {
          userId: order.userId,
          planCode: order.planCode,
          status: "active",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pay/notify] transaction error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "processing failed" },
      { status: 500 }
    );
  }
}
