import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "link168_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export const ROLE_SUPER_ADMIN = "super_admin";
export const ROLE_ADMIN = "admin";
export const ROLE_USER = "user";

export type CurrentUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function getClientIpFromRequest(request?: Request) {
  if (!request) return undefined;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || undefined;
}

export async function createSession(userId: string, request?: Request) {
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const userAgent = request ? request.headers.get("user-agent") ?? undefined : undefined;
  const ipAddress = request ? getClientIpFromRequest(request) : undefined;

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function deleteSessionToken(token: string | undefined) {
  if (!token) return;

  await db.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function getCurrentUserByToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;

  const session = await db.session.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          role: true,
        },
      },
    },
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    role: session.user.role || ROLE_USER,
  };
}

export async function getCurrentUserFromRequest(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  return getCurrentUserByToken(token);
}

export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  return getCurrentUserByToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { user, response: null };
}

// ====== 密码重置相关 ======

const RESET_TOKEN_EXPIRES_HOURS = 2;

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createPasswordResetToken(userId: string) {
  const token = createResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  await db.passwordResetToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  await db.passwordResetToken.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }

  return record.user;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  await db.passwordResetToken.updateMany({
    where: { tokenHash },
    data: { used: true },
  });
}

// ====== 邮箱验证相关 ======

const EMAIL_VERIFY_TOKEN_EXPIRES_HOURS = 24;

export async function createEmailVerificationToken(userId: string) {
  const token = createResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  await db.emailVerificationToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  await db.emailVerificationToken.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function validateEmailVerificationToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, emailVerified: true } } },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }

  return record.user;
}

export async function consumeEmailVerificationToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return null;

  await db.$transaction([
    db.emailVerificationToken.update({
      where: { tokenHash },
      data: { used: true },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
  ]);

  return record.userId;
}

// ====== 登录失败限流 ======
// IP 策略：仅用于异常行为频率限制，不做永久 IP 封禁
// 1. 同一邮箱 15 分钟内失败 >= 5 次：锁定该邮箱 15 分钟（短期）
// 2. 同一 IP 15 分钟内失败 >= 5 次：拒绝该 IP 的登录尝试（短期，不等同于封禁）
// 3. 记录登录失败 IP，仅用于风控分析，不用于封禁访问者

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MINUTES = 15;
const LOCK_DURATION_MINUTES = 15;

function getClientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export async function isLoginRateLimited(email: string, request: Request) {
  const ipAddress = getClientIp(request);
  const since = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);

  const [emailAttempts, ipAttempts] = await Promise.all([
    db.loginAttempt.findMany({
      where: { email, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAILED_ATTEMPTS,
    }),
    db.loginAttempt.findMany({
      where: { ipAddress, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAILED_ATTEMPTS,
    }),
  ]);

  if (emailAttempts.length >= MAX_FAILED_ATTEMPTS) {
    const lastEmailLock = await db.loginAttempt.findFirst({
      where: { email, locked: true },
      orderBy: { createdAt: "desc" },
    });
    if (!lastEmailLock || (lastEmailLock.lockUntil && lastEmailLock.lockUntil > new Date())) {
      await db.loginAttempt.create({
        data: {
          id: crypto.randomUUID(),
          email,
          ipAddress,
          success: false,
          locked: true,
          lockUntil: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
        },
      });
    }
    return true;
  }

  if (ipAttempts.length >= MAX_FAILED_ATTEMPTS) {
    return true;
  }

  return false;
}

export async function recordLoginAttempt(email: string, success: boolean, request: Request) {
  const ipAddress = getClientIp(request);
  await db.loginAttempt.create({
    data: {
      id: crypto.randomUUID(),
      email,
      ipAddress,
      success,
    },
  });
}

// ====== Session 管理（多端登录） ======

export async function getUserSessions(userId: string) {
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastActive: "desc" },
  });

  return sessions;
}

export async function revokeSession(userId: string, sessionId: string) {
  const result = await db.session.deleteMany({
    where: { id: sessionId, userId },
  });
  return result.count > 0;
}

export async function revokeAllOtherSessions(userId: string, currentToken: string) {
  const currentHash = hashToken(currentToken);
  const result = await db.session.deleteMany({
    where: { userId, tokenHash: { not: currentHash } },
  });
  return result.count;
}

export async function updateSessionLastActive(token: string | undefined) {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db.session.updateMany({
    where: { tokenHash },
    data: { lastActive: new Date() },
  });
}

// ====== 修改密码 ======

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) return false;

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) return false;

  if (newPassword.length < 6) return false;

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return true;
}
