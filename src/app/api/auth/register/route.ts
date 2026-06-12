import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateHandle } from "@/lib/handle";

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
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  let body: RegisterRequest;
  try {
    body = (await request.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const agreeTerms = body.agreeTerms === true;
  const handleResult = validateHandle(body.handle ?? body.username ?? body.slug);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "请输入有效邮箱" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ success: false, error: "请输入密码" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少需要 6 位" }, { status: 400 });
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

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      user: { id: user.id, email: user.email },
      profile: { username: handle },
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
