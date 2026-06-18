import { NextResponse } from "next/server";
import {
  validateEmailVerificationToken,
  consumeEmailVerificationToken,
  createEmailVerificationToken,
} from "@/lib/auth";
import { sendEmailVerification, getAppUrl } from "@/lib/mail";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type ConfirmEmailRequest = {
  token?: unknown;
  resendEmail?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  let body: ConfirmEmailRequest;
  try {
    body = (await request.json()) as ConfirmEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const resendEmail = typeof body.resendEmail === "string" ? body.resendEmail.trim().toLowerCase() : null;

  if (resendEmail) {
    const user = await db.user.findUnique({ where: { email: resendEmail } });
    if (!user) {
      return NextResponse.json({ success: true, message: "如果该邮箱已注册，我们已重新发送验证链接。" });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: "该邮箱已验证，请直接登录。" });
    }

    const verifyToken = await createEmailVerificationToken(user.id);
    const mailResult = await sendEmailVerification(user.email, verifyToken);

    const appUrl = getAppUrl();
    const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

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
    return NextResponse.json({ success: false, error: "验证链接无效或已过期，请重新注册或发起验证请求。" }, { status: 400 });
  }

  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    return NextResponse.json({ success: false, error: "验证失败，请稍后重试。" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "邮箱验证成功！",
  });
}
