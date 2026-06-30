import { NextResponse } from "next/server";
import { requireSuperAdmin, getCurrentAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { writeAdminAuditLog, AUDIT_ACTION } from "@/lib/admin-audit-log";
import { getOrdersForAdmin, updateOrderStatus, processRefund, ORDER_STATUS } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const errorResponse = await requireSuperAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const orderNo = url.searchParams.get("orderNo");
  const userId = url.searchParams.get("userId");
  const email = url.searchParams.get("email");
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

  try {
    let targetUserId = userId;

    if (email && !userId) {
      const user = await db.user.findUnique({
        where: { email },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    const filters: Record<string, unknown> = {};
    if (orderNo) filters.orderNo = orderNo;
    if (targetUserId) filters.userId = targetUserId;
    if (status) {
      const validStatuses = Object.values(ORDER_STATUS);
      if (validStatuses.includes(status as typeof ORDER_STATUS[keyof typeof ORDER_STATUS])) {
        filters.status = status;
      }
    }

    const { orders, total } = await getOrdersForAdmin({
      filters,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, orders, total, page, pageSize });
  } catch (error) {
    console.error("[admin/orders] 查询订单失败:", error);
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const errorResponse = await requireSuperAdmin(request);
  if (errorResponse) return errorResponse;

  const admin = await getCurrentAdmin(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求参数无效" },
      { status: 400 }
    );
  }

  const { action, orderId } = body;

  if (!action || !orderId) {
    return NextResponse.json(
      { success: false, error: "缺少 action 或 orderId 参数" },
      { status: 400 }
    );
  }

  switch (action) {
    case "close":
      return handleCloseOrder(orderId as string, admin, request);
    case "refund":
      return handleRefundOrder(body, admin, request);
    default:
      return NextResponse.json(
        { success: false, error: "无效的 action 参数" },
        { status: 400 }
      );
  }
}

async function handleCloseOrder(
  orderId: string,
  admin: Awaited<ReturnType<typeof getCurrentAdmin>>,
  request: Request
) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const result = await updateOrderStatus(orderId, ORDER_STATUS.CLOSED);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "操作失败" },
        { status: 400 }
      );
    }

    await writeAdminAuditLog(
      {
        actorUserId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
        targetType: "order",
        targetId: orderId,
        metadata: {
          action: "close",
          orderNo: order.orderNo,
          userId: order.userId,
        },
        request,
      },
      db
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/orders] 关闭订单失败:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}

async function handleRefundOrder(
  body: Record<string, unknown>,
  admin: Awaited<ReturnType<typeof getCurrentAdmin>>,
  request: Request
) {
  const { orderId, amount, reason, adminNote } = body;

  if (!orderId) {
    return NextResponse.json(
      { success: false, error: "缺少 orderId 参数" },
      { status: 400 }
    );
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId as string },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      );
    }

    const refundAmount = amount ? Number(amount) : order.payableAmount;

    const result = await processRefund({
      orderId: orderId as string,
      amount: refundAmount,
      reason: reason as string ?? "管理员退款",
      refundedBy: admin?.id ?? "system",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "操作失败" },
        { status: 400 }
      );
    }

    await writeAdminAuditLog(
      {
        actorUserId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role ?? undefined,
        action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
        targetType: "order",
        targetId: orderId as string,
        metadata: {
          action: "refund",
          orderNo: order.orderNo,
          userId: order.userId,
          amount: refundAmount,
          reason: reason ?? "管理员退款",
          adminNote: adminNote ?? "",
        },
        request,
      },
      db
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/orders] 退款失败:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
