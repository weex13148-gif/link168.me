import { NextResponse } from "next/server";
import { consumeEmailVerificationToken, validateEmailVerificationToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ConfirmEmailRequest = {
  code?: unknown;
  token?: unknown;
};

export async function POST(request: Request) {
  const limited = await rateLimit(request, "auth:verify-email", 12, 10 * 60 * 1000);
  if (!limited.passed) {
    return NextResponse.json({ success: false, error: "验证码尝试过于频繁，请稍后再试。" }, { status: 429 });
  }

  let body: ConfirmEmailRequest;
  try {
    body = (await request.json()) as ConfirmEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const credential = typeof body.code === "string"
    ? body.code.trim()
    : typeof body.token === "string"
      ? body.token.trim()
      : "";

  if (!credential) {
    return NextResponse.json({ success: false, error: "请输入邮件中的 6 位验证码。" }, { status: 400 });
  }
  if (/^\d+$/.test(credential) && !/^\d{6}$/.test(credential)) {
    return NextResponse.json({ success: false, error: "验证码应为 6 位数字。" }, { status: 400 });
  }

  const user = await validateEmailVerificationToken(credential);
  if (!user) {
    return NextResponse.json({ success: false, error: "验证码不正确或已过期，请重新获取。" }, { status: 400 });
  }

  const userId = await consumeEmailVerificationToken(credential);
  if (!userId) {
    return NextResponse.json({ success: false, error: "该验证码已使用或已过期，请重新获取。" }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "邮箱验证成功，欢迎使用 Link168。" });
}
