import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { evaluateAccountCapabilities, type AccountCapabilities } from "@/domains/identity/account-capabilities";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "link168_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_COOKIE_SECURE = process.env.NODE_ENV === "production" ? true : process.env.COOKIE_SECURE === "true";

export const ROLE_SUPER_ADMIN = "super_admin";
export const ROLE_ADMIN = "admin";
export const ROLE_USER = "user";

export type CurrentUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  accountStatus: string;
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
          accountStatus: true,
        },
      },
    },
  });

  if (!session?.user) return null;
  if (session.user.accountStatus !== "active") return null;

  return {
    id: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    role: session.user.role || ROLE_USER,
    accountStatus: session.user.accountStatus,
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

type AccountContextUser = Pick<
  CurrentUser,
  "id" | "emailVerified" | "role" | "accountStatus"
>;

export async function getAccountAccessContextForUser(user: AccountContextUser): Promise<{
  restrictions: ActiveRestriction[];
  capabilities: AccountCapabilities;
}> {
  const restrictions = await getActiveRestrictions(user.id);
  const capabilities = evaluateAccountCapabilities({
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    role: user.role,
    restrictionTypes: restrictions.map((restriction) => restriction.type),
  });
  return { restrictions, capabilities };
}

export async function getAccountCapabilitiesForUser(
  user: AccountContextUser,
): Promise<AccountCapabilities> {
  return (await getAccountAccessContextForUser(user)).capabilities;
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

// 仅验证 session + 用户存在，不检查限制
// 用于：登出、邮箱验证、查看限制状态、账号申诉
export async function requireAuthenticatedUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return {
      user: null,
      restrictions: null,
      response: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { user, restrictions: null, response: null };
}

// 验证 session + 限制查询成功 + 无 ADMIN_FREEZE/SECURITY_RISK/BANNED
// 允许 EMAIL_UNVERIFIED 进入受限后台
export async function requireDashboardUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return {
      user: null,
      restrictions: null,
      capabilities: null,
      response: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    };
  }

  try {
    const { restrictions, capabilities } = await getAccountAccessContextForUser(user);
    if (!capabilities.canEnterDashboard) {
      return {
        user,
        restrictions,
        capabilities,
        response: NextResponse.json(
          { success: false, error: "账号受限，无法进入后台", blockedType: capabilities.blockedBy },
          { status: 403 },
        ),
      };
    }
    return { user, restrictions, capabilities, response: null };
  } catch {
    return {
      user,
      restrictions: null,
      capabilities: null,
      response: NextResponse.json(
        { success: false, error: "限制服务暂时不可用，请稍后重试" },
        { status: 503 },
      ),
    };
  }
}

// 最严格：用于发布公开主页、修改 username、其他敏感写入
// 必须无任何限制（含 EMAIL_UNVERIFIED）
export async function requireActiveUser(request: Request) {
  const dashboard = await requireDashboardUser(request);
  if (dashboard.response) return dashboard;
  if (!dashboard.capabilities?.canModifySensitiveData) {
    return {
      user: dashboard.user,
      restrictions: dashboard.restrictions,
      capabilities: dashboard.capabilities,
      response: NextResponse.json(
        {
          success: false,
          error: dashboard.capabilities?.blockedBy === "EMAIL_UNVERIFIED"
            ? "请先验证邮箱后再执行此操作"
            : "账号当前无法执行此操作",
          blockedType: dashboard.capabilities?.blockedBy,
        },
        { status: 403 },
      ),
    };
  }
  return dashboard;
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

// ======== V2-002: 统一冻结/限制服务（FreezeRecord + 兼容 frozenReason） ========
// 安全原则：
//   1. 数据库操作失败时，必须明确抛出 RestrictionQueryError，禁止静默返回空数组
//   2. 任何冻结/限制判断不得掩盖查询异常
//   3. 邮件限制与登录限制只做最佳努力，失败时仍抛出可观察异常

export const RESTRICTION_TYPE_EMAIL_UNVERIFIED = "EMAIL_UNVERIFIED";
export const RESTRICTION_TYPE_ADMIN_FREEZE = "ADMIN_FREEZE";
export const RESTRICTION_TYPE_SECURITY_RISK = "SECURITY_RISK";
export const RESTRICTION_TYPE_BANNED = "BANNED";

export type ActiveRestriction = {
  type: string;
  source: string;
  reason: string | null;
  startsAt: Date;
  expiresAt: Date | null;
};

export class RestrictionQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestrictionQueryError";
  }
}

// 同步邮箱限制：超过 30 天未验证则创建 EMAIL_UNVERIFIED 限制
// 查询失败时抛出 RestrictionQueryError，调用方决定如何暴露
export async function syncEmailVerificationRestriction(userId: string): Promise<{ created: boolean }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, emailVerified: true },
    });
    if (!user || user.emailVerified) return { created: false };

    const daysSinceCreated = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 30) return { created: false };

    const created = await ensureEmailUnverifiedRestriction(userId, `注册 ${daysSinceCreated} 天未验证邮箱`);
    return { created };
  } catch {
    throw new RestrictionQueryError("同步邮箱限制失败");
  }
}

// 获取用户所有有效限制：数据库查询失败时抛出 RestrictionQueryError
export async function getActiveRestrictions(userId: string): Promise<ActiveRestriction[]> {
  try {
    const [records, user] = await Promise.all([
      db.freezeRecord.findMany({
        where: {
          userId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findUnique({ where: { id: userId }, select: { frozenReason: true, createdAt: true, emailVerified: true } }),
    ]);

    const restrictions: ActiveRestriction[] = records.map((r) => ({
      type: r.type,
      source: r.source,
      reason: r.reason || null,
      startsAt: r.startsAt,
      expiresAt: r.expiresAt,
    }));

    // 兼容旧 frozenReason
    if (user?.frozenReason?.startsWith("FROZEN_EMAIL_UNVERIFIED") && !user.emailVerified) {
      const hasEmailRestriction = restrictions.some((r) => r.type === RESTRICTION_TYPE_EMAIL_UNVERIFIED);
      if (!hasEmailRestriction) {
        restrictions.push({
          type: RESTRICTION_TYPE_EMAIL_UNVERIFIED,
          source: "legacy",
          reason: "注册超过30天未验证邮箱",
          startsAt: user.createdAt,
          expiresAt: null,
        });
      }
    }

    return restrictions;
  } catch {
    throw new RestrictionQueryError("查询用户限制失败");
  }
}

export function canUserLogin(restrictions: ActiveRestriction[]): { ok: boolean; reason: string | null; blockedType?: string } {
  const banned = restrictions.find((r) => r.type === RESTRICTION_TYPE_BANNED);
  if (banned) return { ok: false, reason: "账号已封禁", blockedType: RESTRICTION_TYPE_BANNED };
  // ADMIN_FREEZE 不阻止登录，只阻止公开主页展示；冻结用户仍可登录后台
  const securityRisk = restrictions.find((r) => r.type === RESTRICTION_TYPE_SECURITY_RISK);
  if (securityRisk) return { ok: false, reason: "账号处于安全限制状态", blockedType: RESTRICTION_TYPE_SECURITY_RISK };
  return { ok: true, reason: null };
}

export function canShowPublicProfile(restrictions: ActiveRestriction[]): { ok: boolean; reason: string | null; blockedType?: string } {
  const hardBlock = restrictions.find((r) =>
    [RESTRICTION_TYPE_ADMIN_FREEZE, RESTRICTION_TYPE_BANNED, RESTRICTION_TYPE_SECURITY_RISK].includes(r.type),
  );
  if (hardBlock) return { ok: false, reason: hardBlock.type, blockedType: hardBlock.type };
  const emailFrozen = restrictions.find((r) => r.type === RESTRICTION_TYPE_EMAIL_UNVERIFIED);
  if (emailFrozen) return { ok: false, reason: "EMAIL_UNVERIFIED", blockedType: RESTRICTION_TYPE_EMAIL_UNVERIFIED };
  return { ok: true, reason: null };
}

export async function clearEmailVerificationRestriction(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const updated = await db.freezeRecord.updateMany({
      where: { userId, type: RESTRICTION_TYPE_EMAIL_UNVERIFIED, isActive: true },
      data: { isActive: false, clearedAt: now, clearedByUserId: null, clearedBySource: "EMAIL_VERIFICATION" },
    });
    await db.user.updateMany({
      where: { id: userId, frozenReason: { startsWith: "FROZEN_EMAIL_UNVERIFIED" } },
      data: { frozenReason: null },
    });
    return updated.count > 0;
  } catch {
    throw new RestrictionQueryError("清除邮箱限制失败");
  }
}

export async function ensureEmailUnverifiedRestriction(userId: string, reason = "注册超过30天未验证邮箱"): Promise<boolean> {
  try {
    const existing = await db.freezeRecord.findFirst({
      where: { userId, type: RESTRICTION_TYPE_EMAIL_UNVERIFIED, isActive: true },
    });
    if (existing) return false;
    await db.freezeRecord.create({
      data: { id: crypto.randomUUID(), userId, type: RESTRICTION_TYPE_EMAIL_UNVERIFIED, reason, source: "system", isActive: true },
    });
    await db.user.updateMany({ where: { id: userId, frozenReason: null }, data: { frozenReason: "FROZEN_EMAIL_UNVERIFIED_30D" } });
    return true;
  } catch {
    throw new RestrictionQueryError("创建邮箱限制失败");
  }
}

// 批量检查超过 30 天未验证的账号，创建 EMAIL_UNVERIFIED 限制
// 幂等：已有限制的不会重复创建；已验证的不会创建
// 可由定时任务调用，每次处理 BATCH_SIZE 条
export async function batchSyncEmailVerificationRestrictions(batchSize = 100): Promise<{
  checked: number;
  created: number;
  errors: number;
}> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usersToCheck = await db.user.findMany({
    where: {
      emailVerified: false,
      createdAt: { lt: cutoff },
    },
    select: { id: true, createdAt: true },
    take: batchSize,
  });

  let created = 0;
  let errors = 0;

  for (const user of usersToCheck) {
    try {
      const result = await ensureEmailUnverifiedRestriction(user.id);
      if (result) created++;
    } catch {
      errors++;
    }
  }

  return { checked: usersToCheck.length, created, errors };
}

// 邮箱验证成功后：解除邮箱未验证冻结（保留其他冻结/封禁）
export async function consumeEmailVerificationToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.used || record.expiresAt < new Date()) return null;

  await db.$transaction([
    db.emailVerificationToken.update({ where: { tokenHash }, data: { used: true, usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
  ]);
  await clearEmailVerificationRestriction(record.userId);
  return record.userId;
}

// ======== V2-002: 邮箱发送统一服务（节流 + 日志 + Token） ========
// 统一入口：注册首次发送 / 未登录重发 / 登录态重发 全部调用此函数
// 查询失败时抛出 RestrictionQueryError，邮件服务失败时抛出 EmailSendError，不吞异常

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

const EMAIL_60S_WINDOW_MS = 60 * 1000;
const EMAIL_24H_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_PER_EMAIL_24H_MAX = 10;
const EMAIL_PER_IP_24H_MAX = 50;

export type EmailSendPolicyResult =
  | { ok: true; token: string; sent: boolean; canResend: boolean }
  | { ok: false; reason: "rate-limit" | "query-error" | "send-error"; waitSec: number; sent: boolean; canResend: boolean; detail?: string };

function hashIp(ip: string | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

// 动态 import mail 函数，避免循环依赖问题
async function dynamicSendEmailVerification(email: string, token: string): Promise<{ success: boolean; provider: string; errorCode?: string }> {
  try {
    const mod = await import("@/lib/mail");
    if (typeof mod.sendEmailVerification === "function") {
      const result = await mod.sendEmailVerification(email, token);
      return { success: Boolean(result?.success), provider: "smtp", errorCode: result?.success ? undefined : "PROVIDER_REJECTED" };
    }
    return { success: false, provider: "none", errorCode: "SMTP_NOT_CONFIGURED" };
  } catch {
    return { success: false, provider: "smtp", errorCode: "SMTP_UNAVAILABLE" };
  }
}

async function dynamicSendPasswordReset(email: string, token: string): Promise<{ success: boolean; provider: string; errorCode?: string }> {
  try {
    const mod = await import("@/lib/mail");
    if (typeof mod.sendPasswordReset === "function") {
      const result = await mod.sendPasswordReset(email, token);
      return { success: Boolean(result?.success), provider: "smtp", errorCode: result?.success ? undefined : "PROVIDER_REJECTED" };
    }
    return { success: false, provider: "none", errorCode: "SMTP_NOT_CONFIGURED" };
  } catch {
    return { success: false, provider: "smtp", errorCode: "SMTP_UNAVAILABLE" };
  }
}

// 统一邮箱验证发送服务：检查节流 → 生成 token → 发送 → 写日志
// 禁止在任何阶段静默返回成功；失败时返回带 detail 的明确错误
export async function sendVerificationEmailWithPolicy(
  email: string,
  userIdIfKnown: string | null,
  ipRaw: string | undefined,
  purpose: "verify" = "verify",
): Promise<EmailSendPolicyResult> {
  const ipHash = hashIp(ipRaw);

  // 1. 节流检查（失败时抛出查询异常）
  try {
    const [recent, count24h, ipCount] = await Promise.all([
      db.emailSendLog.findFirst({
        where: { email, purpose, createdAt: { gte: new Date(Date.now() - EMAIL_60S_WINDOW_MS) } },
        orderBy: { createdAt: "desc" },
      }),
      db.emailSendLog.count({ where: { email, purpose, createdAt: { gte: new Date(Date.now() - EMAIL_24H_WINDOW_MS) } } }),
      ipHash ? db.emailSendLog.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - EMAIL_24H_WINDOW_MS) } } }) : Promise.resolve(0),
    ]);

    if (recent) {
      const waitSec = Math.max(1, Math.ceil((EMAIL_60S_WINDOW_MS - (Date.now() - recent.createdAt.getTime())) / 1000));
      return { ok: false, reason: "rate-limit", waitSec, sent: false, canResend: true };
    }
    if (count24h >= EMAIL_PER_EMAIL_24H_MAX) return { ok: false, reason: "rate-limit", waitSec: 60 * 60, sent: false, canResend: true };
    if (ipCount >= EMAIL_PER_IP_24H_MAX) return { ok: false, reason: "rate-limit", waitSec: 60 * 60, sent: false, canResend: true };
  } catch {
    throw new RestrictionQueryError("检查邮件发送节流失败");
  }

  // 2. 创建 token（已知 userId 时绑定到用户）
  let token: string;
  try {
    if (userIdIfKnown) {
      token = await createEmailVerificationToken(userIdIfKnown);
    } else {
      // 未登录态也创建 token，但绑定到已注册用户
      const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
      if (!user) return { ok: false, reason: "query-error", waitSec: 0, sent: false, canResend: true, detail: "该邮箱未注册" };
      if (user.emailVerified) return { ok: false, reason: "query-error", waitSec: 0, sent: false, canResend: true, detail: "该邮箱已验证" };
      token = await createEmailVerificationToken(user.id);
    }
  } catch {
    throw new RestrictionQueryError("创建邮箱验证 token 失败");
  }

  // 3. 发送邮件（SMTP 未配置时安全降级，不伪造成功）
  let sendResult: { success: boolean; provider: string; errorCode?: string };
  try {
    sendResult = await dynamicSendEmailVerification(email, token);
  } catch {
    sendResult = { success: false, provider: "smtp", errorCode: "UNKNOWN_SEND_FAILURE" };
  }

  // 4. 写日志 + 真实结果（禁止记录原始异常堆栈）
  try {
    await db.emailSendLog.create({
      data: {
        id: crypto.randomUUID(),
        email,
        purpose,
        success: sendResult.success,
        provider: sendResult.provider,
        errorCode: sendResult.success ? null : sendResult.errorCode || "UNKNOWN_SEND_FAILURE",
        ipHash,
      },
    });
  } catch {
    // 日志失败不掩盖发送本身结果
  }

  if (!sendResult.success) {
    // SMTP 未配置或不可用时：保留账号，返回可重试状态，不销毁 token
    if (sendResult.errorCode === "SMTP_NOT_CONFIGURED" || sendResult.errorCode === "SMTP_UNAVAILABLE") {
      return { ok: false, reason: "send-error", waitSec: 30, sent: false, canResend: true, detail: "邮件服务暂未配置，账号已保留，请稍后重新发送验证邮件" };
    }
    return { ok: false, reason: "send-error", waitSec: 30, sent: false, canResend: true };
  }
  return { ok: true, token, sent: true, canResend: false };
}

// 统一密码重置邮件发送服务
export async function sendPasswordResetEmailWithPolicy(
  email: string,
  ipRaw: string | undefined,
): Promise<EmailSendPolicyResult> {
  const ipHash = hashIp(ipRaw);
  const purpose = "password-reset";

  try {
    const [recent, count24h, ipCount] = await Promise.all([
      db.emailSendLog.findFirst({
        where: { email, purpose, createdAt: { gte: new Date(Date.now() - EMAIL_60S_WINDOW_MS) } },
        orderBy: { createdAt: "desc" },
      }),
      db.emailSendLog.count({ where: { email, purpose, createdAt: { gte: new Date(Date.now() - EMAIL_24H_WINDOW_MS) } } }),
      ipHash ? db.emailSendLog.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - EMAIL_24H_WINDOW_MS) } } }) : Promise.resolve(0),
    ]);

    if (recent) {
      const waitSec = Math.max(1, Math.ceil((EMAIL_60S_WINDOW_MS - (Date.now() - recent.createdAt.getTime())) / 1000));
      return { ok: false, reason: "rate-limit", waitSec, sent: false, canResend: true };
    }
    if (count24h >= EMAIL_PER_EMAIL_24H_MAX) return { ok: false, reason: "rate-limit", waitSec: 60 * 60, sent: false, canResend: true };
    if (ipCount >= EMAIL_PER_IP_24H_MAX) return { ok: false, reason: "rate-limit", waitSec: 60 * 60, sent: false, canResend: true };
  } catch {
    throw new RestrictionQueryError("检查邮件发送节流失败");
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return { ok: false, reason: "query-error", waitSec: 0, sent: false, canResend: true, detail: "该邮箱未注册" };
  }

  let token: string;
  try {
    token = await createPasswordResetToken(user.id);
  } catch {
    throw new RestrictionQueryError("创建密码重置 token 失败");
  }

  let sendResult: { success: boolean; provider: string; errorCode?: string };
  try {
    sendResult = await dynamicSendPasswordReset(email, token);
  } catch {
    sendResult = { success: false, provider: "smtp", errorCode: "UNKNOWN_SEND_FAILURE" };
  }

  try {
    await db.emailSendLog.create({
      data: {
        id: crypto.randomUUID(),
        email,
        purpose,
        success: sendResult.success,
        errorCode: sendResult.success ? null : sendResult.errorCode || "UNKNOWN_SEND_FAILURE",
        provider: sendResult.provider,
        ipHash,
      },
    });
  } catch {
    // 日志失败不掩盖发送本身结果
  }

  if (!sendResult.success) {
    if (sendResult.errorCode === "SMTP_NOT_CONFIGURED" || sendResult.errorCode === "SMTP_UNAVAILABLE") {
      return { ok: false, reason: "send-error", waitSec: 30, sent: false, canResend: true, detail: "邮件服务暂未配置，请稍后重试" };
    }
    return { ok: false, reason: "send-error", waitSec: 30, sent: false, canResend: true };
  }
  return { ok: true, token, sent: true, canResend: false };
}

import { shouldBypassRateLimit } from "@/lib/rate-limit";

// ====== 登录失败节流 ======
// IP 策略：仅用于异常行为频率限制，不做永久 IP 封禁
// 1. 同一邮箱 15 分钟内失败 >= 5 次：锁定该邮箱 15 分钟（短期）
// 2. 同一 IP 15 分钟内失败 >= 5 次：拒绝该 IP 的登录尝试（短期，不等同于封禁）
// 3. 记录登录失败 IP，仅用于风控分析，不用于封禁访问者
//
// P0 修复：使用统一的 shouldBypassRateLimit()，不再仅凭 NODE_ENV 自动绕过。

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
  if (shouldBypassRateLimit()) {
    // eslint-disable-next-line no-console
    console.debug("[rate-limit] login rate limit bypassed (dev mode + AUTH_RATE_LIMIT_BYPASS=true)");
    return false;
  }
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

// ====== 账号注销（软删除） ======
// 注销流程：
// 1. 设置 user.accountStatus = "deactivated"
// 2. 记录 deactivatedAt 和 deactivationReason
// 3. 删除该用户所有 session
// 4. 设置 profile.isPublic = false
// 5. 匿名化公开昵称、头像、简介
// 6. 标记 displayNameAnonymized = true

export async function deactivateUserAccount(userId: string, reason?: string): Promise<boolean> {
  try {
    const now = new Date();

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: "deactivated",
          deactivatedAt: now,
          deactivationReason: reason || null,
        },
      });

      await tx.session.deleteMany({
        where: { userId },
      });

      await tx.profile.update({
        where: { userId },
        data: {
          isPublic: false,
          displayName: "已注销用户",
          avatarUrl: null,
          bio: null,
          displayNameAnonymized: true,
        },
      });
    });

    return true;
  } catch {
    return false;
  }
}
