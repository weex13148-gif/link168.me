import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationCodeWithPolicy } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const REGISTER_RATE_LIMIT_MAX = 10;
const REGISTER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  agreeTerms?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || request.headers.get("cf-connecting-ip")
    || "";
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, "auth:register", REGISTER_RATE_LIMIT_MAX, REGISTER_RATE_LIMIT_WINDOW_MS);
  if (!limited.passed) {
    return NextResponse.json(
      { success: false, error: `注册请求过于频繁，请 ${Math.ceil(limited.resetMs / 60000)} 分钟后重试。` },
      { status: 429 },
    );
  }

  let body: RegisterRequest;
  try {
    body = (await request.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "请输入有效的邮箱地址。" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少需要 6 位。" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的密码不一致。" }, { status: 400 });
  }
  if (body.agreeTerms !== true) {
    return NextResponse.json({ success: false, error: "请先阅读并同意用户协议和隐私政策。" }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ success: false, error: "该邮箱已注册，请直接登录。" }, { status: 409 });
  }

  const userId = randomUUID();
  const profileId = randomUUID();
  const initialUsername = `user-${userId.slice(0, 8)}`;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.$transaction([
      db.user.create({
        data: { id: userId, email, passwordHash, emailVerified: false, role: "user" },
      }),
      db.profile.create({
        data: {
          id: profileId,
          userId,
          username: initialUsername,
          isPublic: true,
          theme: "Link168 草木默认",
          template: "business",
          language: "zh",
        },
      }),
    ]);
  } catch {
    return NextResponse.json({ success: false, error: "注册失败，请稍后重试。" }, { status: 500 });
  }

  const sendResult = await sendVerificationCodeWithPolicy(email, userId, requestIp(request)).catch(() => ({
    ok: false as const,
    reason: "send-error",
    message: "验证邮件暂时无法发送，请稍后在验证页面重新发送。",
  }));

  const { token, expiresAt } = await createSession(userId, request);
  const redirectTo = `/verify-email?email=${encodeURIComponent(email)}`;
  const response = NextResponse.json({
    success: true,
    redirectTo,
    user: { id: userId, email, emailVerified: false },
    profile: { username: initialUsername },
    emailVerificationSent: sendResult.ok,
    meta: {
      needVerifyEmail: true,
      message: sendResult.ok
        ? "注册成功！验证码已发送，请检查收件箱或垃圾箱。"
        : `注册成功！${sendResult.message}`,
    },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
