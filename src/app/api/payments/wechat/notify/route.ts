import { NextResponse } from "next/server";
import { handleWechatPayNotify } from "@/lib/billing/webhooks";
import { parseWechatNotify } from "@/lib/billing/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = await parseWechatNotify(body);

    const result = await handleWechatPayNotify(params);

    if (result.success) {
      const xmlResponse = `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`;
      return new NextResponse(xmlResponse, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const xmlResponse = `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${result.error || "处理失败"}]]></return_msg></xml>`;
    return new NextResponse(xmlResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    const xmlResponse = `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>`;
    return new NextResponse(xmlResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
