import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { SandboxPaymentProvider } from "@/lib/billing/providers";

export const runtime = "nodejs";

const sandboxProvider = new SandboxPaymentProvider();

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const url = new URL(request.url);
  const tradeNo = url.searchParams.get("tradeNo");

  if (!tradeNo) {
    return NextResponse.json(
      { success: false, error: "缺少 tradeNo 参数" },
      { status: 400 }
    );
  }

  const transaction = sandboxProvider.getTransaction(tradeNo);
  if (!transaction) {
    return NextResponse.json(
      { success: false, error: "交易不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({
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

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (!action) {
    return NextResponse.json(
      { success: false, error: "缺少 action 参数" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求参数无效" },
      { status: 400 }
    );
  }

  const tradeNo = body.tradeNo as string;
  if (!tradeNo) {
    return NextResponse.json(
      { success: false, error: "缺少 tradeNo 参数" },
      { status: 400 }
    );
  }

  switch (action) {
    case "pay": {
      const payAction = body.payAction as "success" | "fail" | "cancel";
      if (!payAction || !["success", "fail", "cancel"].includes(payAction)) {
        return NextResponse.json(
          { success: false, error: "无效的 payAction 参数" },
          { status: 400 }
        );
      }

      const delayMs = body.delayMs ? Number(body.delayMs) : 0;
      const repeatCount = body.repeatCount ? Number(body.repeatCount) : 1;
      const repeatIntervalMs = body.repeatIntervalMs ? Number(body.repeatIntervalMs) : 1000;

      await sandboxProvider.simulatePayment({
        providerTradeNo: tradeNo,
        action: payAction,
        delayMs,
      });

      if (payAction === "success") {
        await sandboxProvider.triggerNotify({
          providerTradeNo: tradeNo,
          status: "success",
          delayMs: 500,
          repeatCount,
          repeatIntervalMs,
        });
      }

      return NextResponse.json({ success: true, action: payAction });
    }

    case "pay-with-error": {
      // 错误金额、错误订单号、错误签名场景
      const errorType = body.errorType as "amount" | "orderNo" | "signature" | "none";
      const delayMs = body.delayMs ? Number(body.delayMs) : 0;

      if (!errorType || !["amount", "orderNo", "signature", "none"].includes(errorType)) {
        return NextResponse.json(
          { success: false, error: "无效的 errorType 参数" },
          { status: 400 }
        );
      }

      await sandboxProvider.simulatePayment({
        providerTradeNo: tradeNo,
        action: "success",
        delayMs,
      });

      // 触发错误场景的通知
      const notifyParams: Record<string, unknown> = {
        providerTradeNo: tradeNo,
        status: "success",
        delayMs: 500,
      };

      if (errorType === "amount") {
        // 错误金额：使用与订单不同的金额
        notifyParams.overrideAmount = 1; // 1分钱，明显错误
      } else if (errorType === "orderNo") {
        // 错误订单号：使用不存在的订单号
        notifyParams.overrideOrderNo = `INVALID_${Date.now()}`;
      } else if (errorType === "signature") {
        // 错误签名
        notifyParams.useInvalidSignature = true;
      }

      await sandboxProvider.triggerNotify(notifyParams as Parameters<typeof sandboxProvider.triggerNotify>[0]);

      return NextResponse.json({
        success: true,
        action: "pay-with-error",
        errorType,
        message: errorType === "none" ? "正常支付成功" : `已触发错误场景：${errorType}`,
      });
    }

    case "refund": {
      const refundId = body.refundId as string;
      const refundAction = body.refundAction as "success" | "fail";

      if (!refundId) {
        return NextResponse.json(
          { success: false, error: "缺少 refundId 参数" },
          { status: 400 }
        );
      }

      if (!refundAction || !["success", "fail"].includes(refundAction)) {
        return NextResponse.json(
          { success: false, error: "无效的 refundAction 参数" },
          { status: 400 }
        );
      }

      const result = await sandboxProvider.simulateRefund({
        refundId,
        action: refundAction,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.errorMessage });
      }

      if (refundAction === "success") {
        await sandboxProvider.triggerNotify({
          providerTradeNo: tradeNo,
          status: "refund",
          delayMs: 500,
        });
      }

      return NextResponse.json({ success: true, action: refundAction });
    }

    case "create-mock": {
      // 创建模拟交易用于测试错误场景（不关联真实订单）
      const amount = body.amount as number;
      const currency = body.currency as string || "CNY";
      const orderNo = body.orderNo as string;

      if (!amount || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "无效的金额" },
          { status: 400 }
        );
      }

      const mockTradeNo = sandboxProvider.createMockTransaction({
        amount,
        currency,
        orderNo,
      });

      return NextResponse.json({
        success: true,
        mockTradeNo,
        message: "模拟交易已创建，可用于测试错误场景",
      });
    }

    case "query": {
      const result = await sandboxProvider.queryPayment(tradeNo);
      return NextResponse.json(result);
    }

    case "close": {
      const result = await sandboxProvider.closePayment(tradeNo);
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json(
        { success: false, error: "无效的 action 参数" },
        { status: 400 }
      );
  }
}
