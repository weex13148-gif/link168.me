import { NextResponse } from "next/server";
import { requireUser, sendVerificationEmailWithPolicy, RestrictionQueryError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: "邮箱已验证，无需重复发送。" });
  }

  const ipRaw =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  try {
    const result = await sendVerificationEmailWithPolicy(user.email, user.id, ipRaw, "verify");
    if (result.ok) {
      return NextResponse.json({ success: true, message: "验证邮件已发送，请查收。" });
    }
    if (result.reason === "rate-limit") {
      return NextResponse.json(
        { success: false, error: "发送过于频繁，请稍后再试。", detail: "rate-limit" },
        { status: 429 },
      );
    }
    if (result.reason === "send-error") {
      return NextResponse.json(
        { success: false, error: "邮件发送失败，请稍后重试。", detail: "send-error" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { success: false, error: "服务暂时不可用，请稍后重试。", detail: result.detail || "unknown" },
      { status: 503 },
    );
  } catch (err) {
    if (err instanceof RestrictionQueryError) {
      return NextResponse.json(
        { success: false, error: "服务暂时不可用，请稍后重试。", detail: "policy-query-failed" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "服务暂时不可用，请稍后重试。", detail: "unexpected" },
      { status: 500 },
    );
  }
}
