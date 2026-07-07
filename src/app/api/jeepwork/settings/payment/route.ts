import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getJeepworkSessionUser, requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { testAlipayConfiguration } from "@/lib/billing/alipay-query";
import {
  queryAndReconcileAlipayOrder,
  reconcilePendingAlipayOrders,
} from "@/lib/billing/alipay-reconciliation";
import { listAlipayDiagnostics, recordAlipayDiagnostic } from "@/lib/billing/payment-diagnostics";
import {
  BillingPermissionError,
  createOrder,
  updateOrderPaymentChannel,
} from "@/lib/billing/orders";
import { createPayment } from "@/lib/billing/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const [diagnostics, orders] = await Promise.all([
    listAlipayDiagnostics(30),
    db.order.findMany({
      where: { paymentChannel: "alipay" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNo: true,
        userId: true,
        planCode: true,
        planNameSnapshot: true,
        payableAmount: true,
        status: true,
        providerTradeNo: true,
        paidAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      diagnostics,
      orders: orders.map((order) => ({
        ...order,
        paidAt: order.paidAt?.toISOString() ?? null,
        expiresAt: order.expiresAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
    },
    error: null,
  });
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);
  if (!actor) return errorResponse("UNAUTHORIZED", "超级管理员登录已失效。", 401);

  let body: { action?: unknown; orderNo?: unknown; limit?: unknown };
  try {
    body = await request.json() as { action?: unknown; orderNo?: unknown; limit?: unknown };
  } catch {
    return errorResponse("BAD_BODY", "请求格式不正确。", 400);
  }

  const action = text(body.action);
  try {
    if (action === "test-keys") {
      const result = await testAlipayConfiguration();
      await recordAlipayDiagnostic({
        type: "KEY_TEST",
        success: result.success,
        error: result.success ? undefined : result.error,
        metadata: result.success ? {
          appId: result.appId,
          privateKeyFingerprint: result.privateKeyFingerprint,
          alipayPublicKeyFingerprint: result.alipayPublicKeyFingerprint,
          notifyUrl: result.notifyUrl,
          testMode: result.testMode,
        } : {},
      });
      return NextResponse.json({ success: result.success, data: result.success ? result : null, error: result.success ? null : { code: "KEY_TEST_FAILED", message: result.error } }, { status: result.success ? 200 : 400 });
    }

    if (action === "create-test-order") {
      const user = await db.user.findUnique({
        where: { id: actor.id },
        select: { id: true, role: true, emailVerified: true },
      });
      if (!user || user.role !== "super_admin") return errorResponse("FORBIDDEN", "仅超级管理员可以创建内部测试订单。", 403);
      if (!user.emailVerified) return errorResponse("EMAIL_UNVERIFIED", "请先验证超级管理员邮箱。", 403);

      await db.aiCreditAccount.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      const order = await createOrder({
        userId: user.id,
        planCode: "internal_test",
        billingCycle: "yearly",
        metadata: { source: "admin_payment_test", createdBy: actor.email },
      });
      const payment = await createPayment(order, "alipay");
      if (!payment.success) {
        await recordAlipayDiagnostic({ type: "TEST_ORDER_FAILED", success: false, orderNo: order.orderNo, error: payment.errorMessage });
        return errorResponse(payment.errorCode || "CREATE_PAYMENT_FAILED", payment.errorMessage || "测试订单创建失败。", 502);
      }

      const processing = await updateOrderPaymentChannel(order.id, user.id, "alipay");
      if (!processing) return errorResponse("ORDER_STATE_FAILED", "测试订单状态更新失败。", 409);

      await recordAlipayDiagnostic({
        type: "TEST_ORDER_CREATED",
        success: true,
        orderNo: order.orderNo,
        metadata: { testModeUrl: payment.payUrl?.includes("/api/payments/alipay/test") ?? false },
      });

      return NextResponse.json({
        success: true,
        data: {
          order: processing,
          payment: { payUrl: payment.payUrl, orderInfo: payment.orderInfo },
        },
        error: null,
      });
    }

    if (action === "query-order" || action === "reconcile-order") {
      const orderNo = text(body.orderNo);
      if (!orderNo) return errorResponse("BAD_ORDER_NO", "请输入订单号。", 400);
      const result = await queryAndReconcileAlipayOrder({
        orderNo,
        reconcile: action === "reconcile-order",
        source: "admin",
      });
      return NextResponse.json(
        { success: result.success, data: result, error: result.success ? null : { code: "ALIPAY_QUERY_FAILED", message: result.error } },
        { status: result.success ? 200 : 400 },
      );
    }

    if (action === "reconcile-pending") {
      const rawLimit = Number(body.limit ?? 30);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 30;
      const result = await reconcilePendingAlipayOrders(limit);
      return NextResponse.json({ success: true, data: result, error: null });
    }

    return errorResponse("BAD_ACTION", "不支持的支付操作。", 400);
  } catch (error) {
    if (error instanceof BillingPermissionError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    console.error("[admin-payment] 操作失败:", error);
    return errorResponse("PAYMENT_OPERATION_FAILED", error instanceof Error ? error.message : "支付操作失败。", 500);
  }
}
