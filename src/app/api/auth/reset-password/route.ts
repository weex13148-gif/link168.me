import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import {
  validatePasswordResetToken,
  consumePasswordResetToken,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  token?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  const rl = rateLimit(request, "reset-password:ip", 5, 10 * 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  let body: ResetPasswordRequest;
  try {
    body = (await request.json()) as ResetPasswordRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!token) {
    return NextResponse.json({ success: false, error: "重置链接无效或已过期。" }, { status: 400 });
  }

  if (!password || password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ success: false, error: "密码需为 6-72 字节。" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的密码不一致。" }, { status: 400 });
  }

  const user = await validatePasswordResetToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "重置链接无效或已过期，请重新发起忘记密码请求。" }, { status: 400 });
  }

  const consumed = await consumePasswordResetToken(token);
  if (!consumed) {
    return NextResponse.json({ success: false, error: "重置链接已被使用或已过期。" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);

  const { token: sessionToken, expiresAt } = await createSession(user.id, request);
  const response = NextResponse.json({
    success: true,
    message: "密码已重置成功，其他设备已退出登录。",
    redirectTo: "/dashboard",
  });
  setSessionCookie(response, sessionToken, expiresAt);
  return response;
}
