import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import {
  validatePasswordResetToken,
  consumePasswordResetToken,
  createSession,
  setSessionCookie,
  revokeAllOtherSessions,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  token?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  let body: ResetPasswordRequest;
  try {
    body = (await request.json()) as ResetPasswordRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!token) {
    return NextResponse.json({ success: false, error: "重置链接无效或已过期。" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少需要 6 位。" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的密码不一致。" }, { status: 400 });
  }

  const user = await validatePasswordResetToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "重置链接无效或已过期，请重新发起忘记密码请求。" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(password, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  await consumePasswordResetToken(token);

  const { token: sessionToken, expiresAt } = await createSession(user.id, request);

  await revokeAllOtherSessions(user.id, sessionToken);

  const response = NextResponse.json({
    success: true,
    message: "密码已重置成功。",
    redirectTo: "/dashboard",
  });
  setSessionCookie(response, sessionToken, expiresAt);
  return response;
}
