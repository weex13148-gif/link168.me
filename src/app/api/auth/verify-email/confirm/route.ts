import { NextResponse } from "next/server";
import {
  validateEmailVerificationToken,
  consumeEmailVerificationToken,
  createEmailVerificationToken,
} from "@/lib/auth";
import { sendEmailVerification, getAppUrl } from "@/lib/mail";
import { db } from "@/lib/db";
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ConfirmEmailRequest = {
  token?: unknown;
  resendEmail?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  const ipRl = rateLimit(request, "verify-email:ip", 8, 10 * 60 * 1000);
  if (!ipRl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(ipRl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  let body: ConfirmEmailRequest;
  try {
    body = (await request.json()) as ConfirmEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const resendEmail = typeof body.resendEmail === "string" ? body.resendEmail.trim().toLowerCase() : "";

  if (resendEmail) {
    if (!EMAIL_PATTERN.test(resendEmail)) {
      return NextResponse.json({ success: false, error: "请输入有效邮箱。" }, { status: 400 });
    }

    const emailRl = rateLimitByKey(`verify-email:resend:${resendEmail}`, 3, 30 * 60 * 1000);
    if (!emailRl.passed) {
      return NextResponse.json(
        { success: false, error: `发送过于频繁，请 ${Math.ceil(emailRl.resetMs / 1000)} 秒后重试。` },
        { status: 429 },
      );
    }

    const user = await db.user.findUnique({ where: { email: resendEmail } });
    if (!user) {
      return NextResponse.json({ success: true, message: "如果该邮箱已注册，我们已重新发送验证链接。" });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "该邮箱已验证，请直接登录。" });
    }

    const verifyToken = await createEmailVerificationToken(user.id);
    const mailResult = await sendEmailVerification(user.email, verifyToken);
    const verifyUrl = `${getAppUrl()}/verify-email?token=${verifyToken}`;

    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，我们已重新发送验证链接。",
      sentMode: mailResult.mode,
      devToken: process.env.NODE_ENV === "development" ? verifyToken : undefined,
      devVerifyUrl: process.env.NODE_ENV === "development" ? verifyUrl : undefined,
    });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ success: false, error: "验证链接无效或已过期。" }, { status: 400 });
  }

  const user = await validateEmailVerificationToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "验证链接无效或已过期，请重新发起验证请求。" }, { status: 400 });
  }

  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    return NextResponse.json({ success: false, error: "验证链接已被使用或已过期。" }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "邮箱验证成功！" });
}
