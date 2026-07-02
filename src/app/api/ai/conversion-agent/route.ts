import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { runCommercialAgent } from "@/lib/ai/commercial-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "ai:conversion-agent", 10, 60_000);
  if (!limited.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(limited.resetMs / 1000)} 秒后重试。`, code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { success: false, error: "请求格式不正确。", code: "INVALID_BODY" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await runCommercialAgent("conversion", body);
  return NextResponse.json(
    result.success ? { success: true, data: result.data } : { success: false, error: result.error, code: result.code },
    { status: result.status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
