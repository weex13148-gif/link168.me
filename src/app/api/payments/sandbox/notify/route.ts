import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SandboxPaymentProvider } from "@/lib/billing/providers";
import { processPaymentSuccess } from "@/lib/billing/orders";
import { requestRefund } from "@/lib/billing/refund-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sandboxProvider = new SandboxPaymentProvider();

function isSandboxEnvironmentAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYMENT_MODE === "sandbox" && process.env.ENABLE_SANDBOX_PAYMENT === "true";
}

export async function POST(request: Request) {
  if (!isSandboxEnvironmentAllowed()) {
    return new NextResponse(sandboxProvider.getNotifyResponse(false, "支付沙箱在生产环境已禁用"), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  try {
    const body = await request.text();
    const params = await sandboxProvider.parseNotify(body);
    const validation = await sandboxProvider.verifyNotify(params);
    if (!validation.valid) {
      console.error("[sandbox/notify] 验证失败:", validation.error);
      return new NextResponse(sandboxProvider.getNotifyResponse(false, validation.error), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    if (!validation.orderNo || !validation.providerTradeNo || validation.amount === undefined) {
      return new NextResponse(sandboxProvider.getNotifyResponse(false, "缺少必要参数"), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    switch (validation.status) {
      case "success": {
        const result = await processPaymentSuccess({
          orderNo: validation.orderNo,
          providerTradeNo: validation.providerTradeNo,
          paymentChannel: "sandbox",
          paidAmountCents: validation.amount,
        });

        if (!result.success) {
          console.error("[sandbox/notify] 处理支付成功失败:", result.error);
          return new NextResponse(sandboxProvider.getNotifyResponse(false, result.error), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
          });
        }

        console.log("[sandbox/notify] 支付成功处理完成:", validation.orderNo);
        return new NextResponse(sandboxProvider.getNotifyResponse(true), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      case "failed": {
        const order = await db.order.findUnique({ where: { orderNo: validation.orderNo } });
        if (order && order.status === "processing") {
          await db.order.update({ where: { id: order.id }, data: { status: "failed" } });
        }
        return new NextResponse(sandboxProvider.getNotifyResponse(true), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      case "refund": {
        const order = await db.order.findUnique({ where: { orderNo: validation.orderNo } });
        if (!order) {
          return new NextResponse(sandboxProvider.getNotifyResponse(false, "订单不存在"), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        const result = await requestRefund({
          orderId: order.id,
          actorUserId: "system",
          actorRole: "super_admin",
          reason: "沙箱模拟退款",
          operator: "sandbox",
        });

        if (!result.success) {
          console.error("[sandbox/notify] 处理退款失败:", result.error);
          return new NextResponse(sandboxProvider.getNotifyResponse(false, result.error), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
          });
        }

        return new NextResponse(sandboxProvider.getNotifyResponse(true), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      default:
        return new NextResponse(sandboxProvider.getNotifyResponse(false, "无效的状态"), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
    }
  } catch (error) {
    console.error("[sandbox/notify] 异常:", error);
    return new NextResponse(sandboxProvider.getNotifyResponse(false, "系统错误"), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
