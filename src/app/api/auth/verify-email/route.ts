import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { sendScopedVerificationCodeWithPolicy } from "@/lib/email-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response || !user) return response;
  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: "该邮箱已完成验证。" });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "";

  try {
    const result = await sendScopedVerificationCodeWithPolicy(user.email, user.id, ip);
    if (result.ok) {
      return NextResponse.json({ success: true, message: "验证码已发送，请检查收件箱或垃圾箱。", waitSec: 60 });
    }
    return NextResponse.json(
      { success: false, error: result.message, waitSec: result.waitSec || 0 },
      { status: result.reason === "rate-limit" ? 429 : 502 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "验证邮件暂时无法发送，请稍后重试。" }, { status: 500 });
  }
}
