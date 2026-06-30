import { NextResponse } from "next/server";
import { handleAlipayNotify } from "@/lib/billing/webhooks";
import { parseAlipayNotify } from "@/lib/billing/payments";

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
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new NextResponse("fail", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    return new NextResponse("fail", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
