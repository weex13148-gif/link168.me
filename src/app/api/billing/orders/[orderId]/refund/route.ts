import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getOrderById, ORDER_STATUS } from "@/lib/billing/orders";
import { requestRefund, queryRefundStatus } from "@/lib/billing/refund-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const order = await getOrderById(orderId, user.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const reason = String(body.reason || "").trim();

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "请填写退款原因" },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { success: false, error: "退款原因不能超过 500 字" },
        { status: 400 }
      );
    }

    const result = await requestRefund({
      orderId,
      actorUserId: user.id,
      actorRole: user.role || "user",
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "退款申请失败" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "退款申请已提交，请等待处理",
      refundId: result.refundId,
      refundAmount: result.refundAmount,
      orderStatus: result.orderStatus,
    });
  } catch (error) {
    console.error("[billing/refund] 退款申请失败:", error);
    return NextResponse.json(
      { success: false, error: "退款申请失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const order = await getOrderById(orderId, user.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const refundable =
      order.status === ORDER_STATUS.PAID ||
      order.status === ORDER_STATUS.PARTIALLY_REFUNDED;

    const alreadyRefunded = order.refundAmount || 0;
    const remainingAmount = order.payableAmount - alreadyRefunded;

    return NextResponse.json({
      success: true,
      refundable,
      refundStatus: order.status,
      refundedAmount: alreadyRefunded,
      remainingAmount,
      orderAmount: order.payableAmount,
      canRefund: refundable && remainingAmount > 0,
    });
  } catch (error) {
    console.error("[billing/refund] 查询退款状态失败:", error);
    return NextResponse.json(
      { success: false, error: "查询失败，请稍后重试" },
      { status: 500 }
    );
  }
}
