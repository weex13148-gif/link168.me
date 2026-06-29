import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie, createEmailVerificationToken } from "@/lib/auth";
import { sendEmailVerification, getAppUrl } from "@/lib/mail";
import { db } from "@/lib/db";
import { validateHandle } from "@/lib/handle";
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  agreeTerms?: unknown;
  handle?: unknown;
  username?: unknown;
  slug?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getUniqueTarget(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return "";
  if ((error as { code?: string }).code !== "P2002") return "";

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return target.join(",");
  return typeof target === "string" ? target : "";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  const ipRl = rateLimit(request, "register:ip", 5, 10 * 60 * 1000);
  if (!ipRl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(ipRl.resetMs / 1000)} 秒后重试。` },
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
  const handleResult = validateHandle(body.handle ?? body.username ?? body.slug);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "请输入有效邮箱" }, { status: 400 });
  }

  const emailRl = rateLimitByKey(`register:email:${email}`, 3, 10 * 60 * 1000);
  if (!emailRl.passed) {
    return NextResponse.json(
      { success: false, error: `该邮箱近期注册请求过多，请 ${Math.ceil(emailRl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  if (!password || password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ success: false, error: "密码需为 6-72 字节" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的密码不一致" }, { status: 400 });
  }

  if (!agreeTerms) {
    return NextResponse.json({ success: false, error: "请先阅读并同意用户协议和隐私政策" }, { status: 400 });
  }

  if (!handleResult.success) {
    return NextResponse.json({ success: false, error: handleResult.error }, { status: 400 });
  }

  const handle = handleResult.handle;
  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ success: false, error: "邮箱已注册，请直接登录" }, { status: 409 });
  }

  const existingProfile = await db.profile.findUnique({ where: { username: handle }, select: { id: true } });
  if (existingProfile) {
    return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: uuidv4(),
          email,
          passwordHash,
        },
      });

      await tx.profile.create({
        data: {
          id: uuidv4(),
          userId: createdUser.id,
          username: handle,
          isPublic: true,
        },
      });

      return createdUser;
    });

    const verifyToken = await createEmailVerificationToken(user.id);
    const mailResult = await sendEmailVerification(user.email, verifyToken);
    const publicVerifyUrl = `${getAppUrl()}/verify-email?token=${verifyToken}`;

    const { token, expiresAt } = await createSession(user.id, request);
    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      user: { id: user.id, email: user.email, emailVerified: false },
      emailVerificationSent: mailResult.success,
      emailDeliveryMode: mailResult.mode,
      emailVerificationMessage: mailResult.success
        ? "验证邮件已发送，请检查收件箱和垃圾邮件。"
        : "账号已创建，但验证邮件暂时发送失败。请稍后在验证页面重新发送。",
      profile: { username: handle },
      devVerifyUrl: process.env.NODE_ENV === "development" ? publicVerifyUrl : undefined,
      devToken: process.env.NODE_ENV === "development" ? verifyToken : undefined,
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    const uniqueTarget = getUniqueTarget(error);
    if (uniqueTarget.includes("email")) {
      return NextResponse.json({ success: false, error: "邮箱已注册，请直接登录" }, { status: 409 });
    }

    if (uniqueTarget.includes("username")) {
      return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个" }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
