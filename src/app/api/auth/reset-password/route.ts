import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { consumePasswordResetToken, validatePasswordResetToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  token?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

export async function POST(request: Request) {
  const limited = await rateLimit(request, "auth:reset-password", 10, 30 * 60 * 1000);
  if (!limited.passed) {
    return NextResponse.json({ success: false, error: "操作过于频繁，请稍后再试。" }, { status: 429 });
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
    return NextResponse.json({ success: false, error: "重置链接无效或已过期，请重新申请。" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, error: "新密码至少需要 8 位。" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的新密码不一致。" }, { status: 400 });
  }

  const user = await validatePasswordResetToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "重置链接无效、已使用或已过期，请重新申请。" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await consumePasswordResetToken(token);

  const redirectTo = user.role === "super_admin"
    ? "/jeepwork/login?passwordReset=success"
    : "/login?passwordReset=success";

  return NextResponse.json({
    success: true,
    message: "密码修改成功，请使用新密码重新登录。",
    redirectTo,
  });
}
