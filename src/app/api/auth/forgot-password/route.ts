import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordReset, getAppUrl } from "@/lib/mail";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ForgotPasswordRequest = {
  email?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  const ipRl = rateLimit(request, "forgot-password:ip", 2, 60 * 1000);
  if (!ipRl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(ipRl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  let body: ForgotPasswordRequest;
  try {
    body = (await request.json()) as ForgotPasswordRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ success: false, error: "请输入邮箱地址。" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });

  if (!user) {
    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，我们已向其发送重置密码链接。",
    });
  }

  const resetToken = await createPasswordResetToken(user.id);
  const mailResult = await sendPasswordReset(user.email, resetToken);

  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  return NextResponse.json({
    success: true,
    message: "如果该邮箱已注册，我们已向其发送重置密码链接。",
    sentMode: mailResult.mode,
    devToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    devResetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  });
}
