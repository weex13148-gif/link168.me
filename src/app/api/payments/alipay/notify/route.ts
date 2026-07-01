import { NextResponse } from "next/server";
import { handleAlipayNotify } from "@/lib/billing/webhooks";
import { parseAlipayNotify } from "@/lib/billing/payments";
import { recordAlipayDiagnostic } from "@/lib/billing/payment-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = await parseAlipayNotify(formData);
    const result = await handleAlipayNotify(params);

    if (result.success) {
      return new NextResponse("success", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new NextResponse("fail", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    await recordAlipayDiagnostic({
      type: "CALLBACK_PARSE_EXCEPTION",
      success: false,
      error: error instanceof Error ? error.message : "支付宝回调解析异常",
    });
    return new NextResponse("fail", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
