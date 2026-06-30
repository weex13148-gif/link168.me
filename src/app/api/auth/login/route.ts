import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import {
  createSession,
  setSessionCookie,
  isLoginRateLimited,
  recordLoginAttempt,
  getActiveRestrictions,
  syncEmailVerificationRestriction,
  canUserLogin,
  ActiveRestriction,
  RESTRICTION_TYPE_BANNED,
  RESTRICTION_TYPE_SECURITY_RISK,
} from "@/lib/auth";
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
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
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

  if (user.role === "admin" || user.role === "super_admin") {
    await recordLoginAttempt(email, false, request);
    return NextResponse.json({ success: false, error: "邮箱或密码错误。" }, { status: 401 });
  }

  await recordLoginAttempt(email, true, request);

  let restrictions: ActiveRestriction[] = [];
  let restrictionQueryFailed = false;

  try {
    if (!user.emailVerified) {
      try {
        await syncEmailVerificationRestriction(user.id);
      } catch {
        // 同步失败不阻止继续查询限制
      }
    }
    restrictions = await getActiveRestrictions(user.id);
  } catch {
    restrictionQueryFailed = true;
  }

  if (restrictionQueryFailed) {
    return NextResponse.json(
      { success: false, error: "限制服务暂时不可用，请稍后重试", errorCode: "RESTRICTION_SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const loginCheck = canUserLogin(restrictions);

  if (!loginCheck.ok) {
    const blockedType = loginCheck.blockedType;
    if (blockedType === RESTRICTION_TYPE_BANNED) {
      return NextResponse.json(
        { success: false, error: "账号已封禁", errorCode: "ACCOUNT_BANNED" },
        { status: 403 },
      );
    }
    if (blockedType === RESTRICTION_TYPE_SECURITY_RISK) {
      return NextResponse.json(
        { success: false, error: "账号处于安全限制状态", errorCode: "SECURITY_RESTRICTED" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, error: "登录失败" },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await createSession(user.id, request);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
    restrictions: { items: restrictions, blockedType: null, loginBlocked: false, reason: null },
  });
  setSessionCookie(response, token, expiresAt);
  return response;
}
