import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie, sendVerificationEmailWithPolicy, RestrictionQueryError, EmailSendError } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// 注册频率限制：同一 IP 每小时最多 10 次注册请求（防止批量注册滥用）
const REGISTER_RATE_LIMIT_MAX = 10;
const REGISTER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  agreeTerms?: unknown;
  // 安全：禁止前端传入以下字段，服务端固定值
  role?: unknown; // 忽略，服务端固定为 "user"
  plan?: unknown; // 忽略，服务端固定为 "free"
  isAdmin?: unknown; // 忽略
  isSuperAdmin?: unknown; // 忽略
  enterprise?: unknown; // 忽略
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  // ===== P0: 注册频率限制（防止批量注册滥用）=====
  const rl = await rateLimit(request, "auth:register", REGISTER_RATE_LIMIT_MAX, REGISTER_RATE_LIMIT_WINDOW_MS);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `注册请求过于频繁，请 ${Math.ceil(rl.resetMs / 60000)} 分钟后重试。` },
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
  const agreeTerms = body.agreeTerms === true;

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "请输入有效的邮箱地址" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少需要 6 位" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的密码不一致" }, { status: 400 });
  }

  if (!agreeTerms) {
    return NextResponse.json({ success: false, error: "请先阅读并同意用户协议和隐私政策" }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (existingUser) {
    return NextResponse.json({ success: false, error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const ipRaw =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  const userId = randomUUID();
  const profileId = randomUUID();
  const initialUsername = `user-${userId.slice(0, 8)}`;

  try {
    await db.$transaction([
      db.user.create({
        data: {
          id: userId,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          emailVerified: false,
        },
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

  let emailSentSuccessfully = false;
  let emailSentDetail: string | null = null;

  try {
    const sendResult = await sendVerificationEmailWithPolicy(email, userId, ipRaw, "verify");
    if (sendResult.ok) {
      emailSentSuccessfully = true;
    } else {
      emailSentDetail = sendResult.detail || sendResult.reason;
    }
  } catch {
    emailSentDetail = "send-throw";
  }

  const { token, expiresAt } = await createSession(userId, request);
  const response = NextResponse.json({
    success: true,
    redirectTo: "/dashboard",
    user: { id: userId, email, emailVerified: false },
    emailVerificationSent: emailSentSuccessfully,
    emailVerificationDetail: emailSentDetail,
    profile: { username: initialUsername },
    meta: {
      needVerifyEmail: true,
      message: emailSentSuccessfully
        ? "注册成功！验证邮件已发送，请查收。"
        : "注册成功！但验证邮件暂时无法发送，你可稍后在后台重新发送。",
    },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
