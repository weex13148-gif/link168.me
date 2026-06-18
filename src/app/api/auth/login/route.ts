import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie, isLoginRateLimited, recordLoginAttempt } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type LoginRequest = {
  email?: unknown;
  password?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "邮箱和密码不能为空。" }, { status: 400 });
  }

  const limited = await isLoginRateLimited(email, request);
  if (limited) {
    return NextResponse.json({
      success: false,
      error: "登录尝试过于频繁，请 15 分钟后重试，或使用忘记密码功能重置。",
    }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await recordLoginAttempt(email, false, request);
    return NextResponse.json({ success: false, error: "邮箱或密码错误。" }, { status: 401 });
  }

  await recordLoginAttempt(email, true, request);

  const { token, expiresAt } = await createSession(user.id, request);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
