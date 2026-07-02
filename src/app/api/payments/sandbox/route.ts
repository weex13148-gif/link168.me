import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { SandboxPaymentProvider } from "@/lib/billing/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sandboxProvider = new SandboxPaymentProvider();

function isSandboxEnvironmentAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYMENT_MODE === "sandbox" && process.env.ENABLE_SANDBOX_PAYMENT === "true";
}

function sandboxGuard(role?: string) {
  if (role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: "仅超级管理员可以使用支付沙箱。" },
      { status: 403 },
    );
  }
  if (!isSandboxEnvironmentAllowed()) {
    return NextResponse.json(
      { success: false, error: "支付沙箱在生产环境已禁用。" },
      { status: 403 },
    );
  }
  return null;
}

function noStoreJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const guardError = sandboxGuard(user.role);
  if (guardError) return guardError;

  const url = new URL(request.url);
  const tradeNo = url.searchParams.get("tradeNo")?.trim();
  if (!tradeNo) return noStoreJson({ success: false, error: "缺少 tradeNo 参数" }, { status: 400 });

  const transaction = sandboxProvider.getTransaction(tradeNo);
  if (!transaction) return noStoreJson({ success: false, error: "交易不存在" }, { status: 404 });

  return noStoreJson({
    success: true,
    transaction: {
      providerTradeNo: transaction.providerTradeNo,
      orderNo: transaction.orderNo,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      createdAt: transaction.createdAt.toISOString(),
      metadata: transaction.metadata,
    },
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const guardError = sandboxGuard(user.role);
  if (guardError) return guardError;

  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim();
  if (!action) return noStoreJson({ success: false, error: "缺少 action 参数" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ success: false, error: "请求参数无效" }, { status: 400 });
  }

  const tradeNo = typeof body.tradeNo === "string" ? body.tradeNo.trim() : "";
  if (!tradeNo) return noStoreJson({ success: false, error: "缺少 tradeNo 参数" }, { status: 400 });

  switch (action) {
    case "pay": {
      const payAction = body.payAction as "success" | "fail" | "cancel";
      if (!payAction || !["success", "fail", "cancel"].includes(payAction)) {
        return noStoreJson({ success: false, error: "无效的 payAction 参数" }, { status: 400 });
      }

      const delayMs = Math.min(Math.max(Number(body.delayMs) || 0, 0), 10_000);
      const repeatCount = Math.min(Math.max(Number(body.repeatCount) || 1, 1), 5);
      const repeatIntervalMs = Math.min(Math.max(Number(body.repeatIntervalMs) || 1000, 250), 5_000);

      const simulated = await sandboxProvider.simulatePayment({
        providerTradeNo: tradeNo,
        action: payAction,
        delayMs,
      });
      if (!simulated.success) {
        return noStoreJson({ success: false, error: simulated.errorMessage || "沙箱支付状态更新失败" }, { status: 409 });
      }

      if (payAction === "success") {
        await sandboxProvider.triggerNotify({
          providerTradeNo: tradeNo,
          status: "success",
          delayMs: 300,
          repeatCount,
          repeatIntervalMs,
        });
      }

      return noStoreJson({ success: true, action: payAction });
    }

    case "pay-with-error": {
      const errorType = body.errorType as "amount" | "orderNo" | "signature" | "none";
      const delayMs = Math.min(Math.max(Number(body.delayMs) || 0, 0), 10_000);
      if (!errorType || !["amount", "orderNo", "signature", "none"].includes(errorType)) {
        return noStoreJson({ success: false, error: "无效的 errorType 参数" }, { status: 400 });
      }

      const simulated = await sandboxProvider.simulatePayment({
        providerTradeNo: tradeNo,
        action: "success",
        delayMs,
      });
      if (!simulated.success) {
        return noStoreJson({ success: false, error: simulated.errorMessage || "沙箱支付状态更新失败" }, { status: 409 });
      }

      const notifyParams: Parameters<typeof sandboxProvider.triggerNotify>[0] = {
        providerTradeNo: tradeNo,
        status: "success",
        delayMs: 300,
      };
      if (errorType === "amount") notifyParams.overrideAmount = 1;
      else if (errorType === "orderNo") notifyParams.overrideOrderNo = `INVALID_${Date.now()}`;
      else if (errorType === "signature") notifyParams.useInvalidSignature = true;

      await sandboxProvider.triggerNotify(notifyParams);
      return noStoreJson({
        success: true,
        action: "pay-with-error",
        errorType,
        message: errorType === "none" ? "正常支付成功" : `已触发错误场景：${errorType}`,
      });
    }

    case "refund": {
      const refundId = typeof body.refundId === "string" ? body.refundId.trim() : "";
      const refundAction = body.refundAction as "success" | "fail";
      if (!refundId) return noStoreJson({ success: false, error: "缺少 refundId 参数" }, { status: 400 });
      if (!refundAction || !["success", "fail"].includes(refundAction)) {
        return noStoreJson({ success: false, error: "无效的 refundAction 参数" }, { status: 400 });
      }

      const result = await sandboxProvider.simulateRefund({ refundId, action: refundAction });
      if (!result.success) return noStoreJson({ success: false, error: result.errorMessage }, { status: 409 });
      if (refundAction === "success") {
        await sandboxProvider.triggerNotify({ providerTradeNo: tradeNo, status: "refund", delayMs: 300 });
      }
      return noStoreJson({ success: true, action: refundAction });
    }

    case "create-mock": {
      const amount = Number(body.amount);
      const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim() : "CNY";
      const orderNo = typeof body.orderNo === "string" ? body.orderNo.trim() : "";
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        return noStoreJson({ success: false, error: "无效的金额" }, { status: 400 });
      }
      if (!orderNo) return noStoreJson({ success: false, error: "缺少 orderNo 参数" }, { status: 400 });

      const mockTradeNo = sandboxProvider.createMockTransaction({ amount, currency, orderNo });
      return noStoreJson({ success: true, mockTradeNo, message: "模拟交易已创建，可用于测试错误场景" });
    }

    case "query":
      return noStoreJson(await sandboxProvider.queryPayment(tradeNo));

    case "close":
      return noStoreJson(await sandboxProvider.closePayment(tradeNo));

    default:
      return noStoreJson({ success: false, error: "无效的 action 参数" }, { status: 400 });
  }
}
