import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shouldBypassRateLimit } from "@/lib/rate-limit";

export const JEEPWORK_COOKIE_NAME = "link168_admin_session";
const JEEPWORK_MAX_AGE_SECONDS = 8 * 60 * 60;
const JEEPWORK_COOKIE_SECURE = process.env.NODE_ENV === "production" ? true : process.env.COOKIE_SECURE === "true";

const IP_RATE_LIMIT_MAX = 5;
const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_RATE_LIMIT_MAX = 5;
const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// P0: 使用统一的 shouldBypassRateLimit()，不再独立判断 NODE_ENV。

// 统一错误响应：{ success: false, data: null, error: { code, message } }
function adminError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status },
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function setJeepworkCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: JEEPWORK_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: JEEPWORK_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: JEEPWORK_MAX_AGE_SECONDS,
  });
}

export function clearJeepworkCookie(response: NextResponse) {
  response.cookies.set({
    name: JEEPWORK_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: JEEPWORK_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

async function getJeepworkUserByToken(token: string | undefined): Promise<{ id: string; email: string; role: string } | null> {
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!session?.user) return null;
  if (session.user.role !== "super_admin") return null;
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

async function getUserFromRequest(request: NextRequest | Request): Promise<{ id: string; email: string; role: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${JEEPWORK_COOKIE_NAME}=`));
  const token = tokenMatch ? tokenMatch.slice(JEEPWORK_COOKIE_NAME.length + 1) : undefined;
  return getJeepworkUserByToken(token);
}

async function getUserFromCookiesDirect() {
  const cookieStore = await cookies();
  return getJeepworkUserByToken(cookieStore.get(JEEPWORK_COOKIE_NAME)?.value);
}

// 兼容别名：行为与 requireJeepworkSuperAdmin 完全一致
export async function requireJeepworkAdmin(request: Request): Promise<NextResponse | null> {
  return requireJeepworkSuperAdmin(request);
}

export async function requireJeepworkSuperAdmin(request: Request): Promise<NextResponse | null> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return adminError("UNAUTHORIZED", "未授权", 401);
  }
  if (user.role !== "super_admin") {
    return adminError("FORBIDDEN", "权限不足", 403);
  }
  return null;
}

// 暴露给调用方（与旧 API 兼容），只返回必要信息
export async function getJeepworkSessionUser(request: Request): Promise<{ id: string; email: string; role: string } | null> {
  return getUserFromRequest(request);
}

// ====== 页面 server-side 鉴权 ======
export async function getJeepworkPageUser() {
  return getUserFromCookiesDirect();
}

export async function jeepworkPageAdminOnly() {
  const user = await getUserFromCookiesDirect();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

export async function jeepworkPageSuperAdminOnly() {
  const user = await getUserFromCookiesDirect();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

// ====== 登录 / 登出处理 ======

async function rateLimitCheck(request: Request, keyPrefix: string, max: number, windowMs: number) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  // 简单内存计数（单机即可）。避免依赖外部缓存库；不精确但足够。
  const bucketKey = `${keyPrefix}:${ip}`;
  const now = Date.now();
  // 挂到 globalThis 上避免模块加载顺序问题
  const g = globalThis as unknown as { __jeepworkRateLimit?: Record<string, { count: number; resetAt: number }> };
  if (!g.__jeepworkRateLimit) g.__jeepworkRateLimit = {};
  const bucket = g.__jeepworkRateLimit[bucketKey];
  if (!bucket || bucket.resetAt < now) {
    g.__jeepworkRateLimit[bucketKey] = { count: 1, resetAt: now + windowMs };
    return { passed: true };
  }
  if (bucket.count >= max) return { passed: false };
  bucket.count += 1;
  return { passed: true };
}

export async function createJeepworkSession(userId: string, request: Request) {
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + JEEPWORK_MAX_AGE_SECONDS * 1000);
  const userAgent = request.headers.get("user-agent") || undefined;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined;

  await db.session.create({
    data: { id: crypto.randomUUID(), userId, tokenHash, expiresAt, userAgent, ipAddress: ip },
  });
  return { token, expiresAt };
}

export async function jeepworkLoginHandler(request: Request, emailRaw: string, passwordRaw: string): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return adminError("SERVICE_UNAVAILABLE", "服务暂不可用", 503);
  }

  if (!shouldBypassRateLimit()) {
    const ipHit = await rateLimitCheck(request, "jeepwork:ip", IP_RATE_LIMIT_MAX, IP_RATE_LIMIT_WINDOW_MS);
    if (!ipHit.passed) return adminError("RATE_LIMIT", "请求过于频繁，请稍后再试", 429);
  }

  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  if (!email || !password) return adminError("BAD_CREDENTIALS", "账号或密码错误", 401);

  if (!shouldBypassRateLimit()) {
    const emailHit = await rateLimitCheck(request, `jeepwork:email:${email}`, EMAIL_RATE_LIMIT_MAX, EMAIL_RATE_LIMIT_WINDOW_MS);
    if (!emailHit.passed) return adminError("RATE_LIMIT", "请求过于频繁，请稍后再试", 429);
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, role: true },
  });

  if (!user) return adminError("BAD_CREDENTIALS", "账号或密码错误", 401);

  const isAdmin = user.role === "super_admin";
  const passwordOk = Boolean(user.passwordHash) && (await bcrypt.compare(password, user.passwordHash));
  if (!isAdmin || !passwordOk) return adminError("BAD_CREDENTIALS", "账号或密码错误", 401);

  const { token } = await createJeepworkSession(user.id, request);
  const response = NextResponse.json({ success: true, data: { id: user.id, email: user.email, role: user.role }, error: null });
  setJeepworkCookie(response, token);
  return response;
}

export async function jeepworkLogoutHandler(request: Request): Promise<NextResponse> {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${JEEPWORK_COOKIE_NAME}=`));
  const token = tokenMatch ? tokenMatch.slice(JEEPWORK_COOKIE_NAME.length + 1) : undefined;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  }
  const response = NextResponse.json({ success: true, data: null, error: null });
  clearJeepworkCookie(response);
  return response;
}

// ====== 角色 / 权限帮助函数 ======

// 检查是否至少存在一名其他超级管理员（用于防止删除最后一名 super_admin）
export async function hasOtherSuperAdmin(excludeUserId: string): Promise<boolean> {
  const count = await db.user.count({ where: { role: "super_admin", id: { not: excludeUserId } } });
  return count > 0;
}
