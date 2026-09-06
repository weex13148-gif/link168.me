import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import type { CurrentResult } from "@/lib/current/contracts";
import { currentErrorHttpStatus } from "@/lib/current/bootstrap/http";

export function respond<T>(result: CurrentResult<T>, key: string) {
  if (!result.ok) return NextResponse.json({ success: false, code: result.error.code, error: result.error.message }, { status: currentErrorHttpStatus(result.error.code), headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ success: true, [key]: result.value }, { headers: { "Cache-Control": "no-store" } });
}
export function invalid() { return NextResponse.json({ success: false, code: "VALIDATION_ERROR", error: "请求参数无效。" }, { status: 400 }); }
export async function authenticate(request: Request, mutation = false) {
  if (mutation) {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) return { response: NextResponse.json({ success: false, code: "FORBIDDEN", error: "不允许跨站操作。" }, { status: 403 }) };
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return { response: invalid() };
  }
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { response: NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 }) };
  return { user };
}
export type TeamRouteContext = { params: Promise<{ workspaceId: string }> };
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
export async function readBody(request: Request, allowed: string[]): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowed.includes(key))) return null;
  return body as Record<string, unknown>;
}
