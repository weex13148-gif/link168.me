import { NextResponse } from "next/server";
import { SandboxPaymentProvider } from "@/lib/billing/providers";
import { processPaymentSuccess, processRefund, ORDER_STATUS } from "@/lib/billing/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sandboxProvider = new SandboxPaymentProvider();

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = await sandboxProvider.parseNotify(body);

    const validation = await sandboxProvider.verifyNotify(params);
    if (!validation.valid) {
      console.error("[sandbox/notify] 验证失败:", validation.error);
      return new NextResponse(
        sandboxProvider.getNotifyResponse(false, validation.error),
        { status: 200 }
      );
    }

    if (!validation.orderNo || !validation.providerTradeNo) {
      return new NextResponse(
        sandboxProvider.getNotifyResponse(false, "缺少必要参数"),
        { status: 200 }
      );
    }

    switch (validation.status) {
      case "success": {
        const result = await processPaymentSuccess({
          orderNo: validation.orderNo,
          providerTradeNo: validation.providerTradeNo,
          paymentChannel: "sandbox",
          paidAmount: validation.amount,
        });

        if (!result.success) {
          console.error("[sandbox/notify] 处理支付成功失败:", result.error);
          return new NextResponse(
            sandboxProvider.getNotifyResponse(false, result.error),
            { status: 200 }
          );
        }

        console.log("[sandbox/notify] 支付成功处理完成:", validation.orderNo);
        return new NextResponse(
          sandboxProvider.getNotifyResponse(true),
          { status: 200 }
        );
      }

      case "failed": {
        console.log("[sandbox/notify] 支付失败:", validation.orderNo);
        return new NextResponse(
          sandboxProvider.getNotifyResponse(true),
          { status: 200 }
        );
      }

      case "refund": {
        const result = await processRefund({
          orderId: validation.orderNo,
          reason: "沙箱模拟退款",
          refundedBy: "system",
        });

        if (!result.success) {
          console.error("[sandbox/notify] 处理退款失败:", result.error);
          return new NextResponse(
            sandboxProvider.getNotifyResponse(false, result.error),
            { status: 200 }
          );
        }

        console.log("[sandbox/notify] 退款处理完成:", validation.orderNo);
        return new NextResponse(
          sandboxProvider.getNotifyResponse(true),
          { status: 200 }
        );
      }

      default:
        return new NextResponse(
          sandboxProvider.getNotifyResponse(false, "无效的状态"),
          { status: 200 }
        );
    }
  } catch (error) {
    console.error("[sandbox/notify] 异常:", error);
    return new NextResponse(
      sandboxProvider.getNotifyResponse(false, "系统错误"),
      { status: 200 }
    );
  }
}
