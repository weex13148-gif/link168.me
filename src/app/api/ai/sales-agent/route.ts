import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { runCommercialAgent } from "@/lib/ai/commercial-agent";
import { resolvePublicAiRequestContext } from "@/lib/ai/public-request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "ai:sales-agent", 12, 60_000);
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

  const context = await resolvePublicAiRequestContext(request, body.username);
  if (!context.ok) {
    return NextResponse.json(
      { success: false, error: context.message, code: context.code },
      { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const result = await runCommercialAgent("sales", body, context);
  return NextResponse.json(
    result.success ? { success: true, data: result.data } : { success: false, error: result.error, code: result.code },
    { status: result.status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
