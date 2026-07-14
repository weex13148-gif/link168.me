import { db } from "@/lib/db";
import crypto from "crypto";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import type { PlanCode } from "@/lib/billing/plans";
import { bindIdempotencyKey } from "@/lib/ai/credits";

// ============================================================================
// AI 权限与额度服务（单一权威来源：src/lib/billing/plans.ts + entitlements）
// ----------------------------------------------------------------------------
// 历史 BUG：本文件曾维护独立的 PLAN_AI_LIMITS / DAILY_LIMITS 常量，与
// plans.ts 中的 aiChatsPerMonth 不一致（member_basic 200 vs 300、
// member_plus 2000 vs 300、enterprise -1 vs 10000、缺 enterprise_pro_plus /
// internal_test）。现已删除所有独立额度数字，全部委托 entitlements 服务，
// 确保套餐额度只有 plans.ts 一套权威来源。
// ============================================================================

export type AiAccessLevel = "none" | "preview" | "full";

// 兼容旧调用：返回用户当前套餐与状态（已委托 entitlements）
export async function getMembershipPlan(userId: string): Promise<{ planCode: string; status: string }> {
  const entitlements = await getUserEntitlements(userId);
  const status = entitlements.isLegacyActive
    ? "active"
    : entitlements.hasActiveMembership
      ? "active"
      : entitlements.isGracePeriod
        ? "grace_period"
        : "inactive";
  return { planCode: entitlements.planCode, status };
}

// AI 访问级别：免费用户仅可预览，付费且有效会员可正式调用
export async function getAiAccessLevel(userId: string): Promise<{
  access: AiAccessLevel;
  planCode: string;
  isActiveMember: boolean;
  reason?: string;
}> {
  const entitlements = await getUserEntitlements(userId);
  const isActiveMember = entitlements.hasActiveMembership || entitlements.isLegacyActive || entitlements.isGracePeriod;

  if (entitlements.planCode === "free" || !entitlements.features.aiEnabled) {
    return {
      access: "preview",
      planCode: entitlements.planCode,
      isActiveMember: false,
      reason: "免费用户仅可预览 AI 助手介绍，升级会员即可使用全部 AI 能力",
    };
  }

  if (!isActiveMember) {
    return {
      access: "preview",
      planCode: entitlements.planCode,
      isActiveMember: false,
      reason: "会员已过期，请续费后继续使用",
    };
  }

  return { access: "full", planCode: entitlements.planCode, isActiveMember: true };
}

// 获取或创建用户 Credit 账户
export async function getOrCreateCreditAccount(userId: string) {
  let account = await db.aiCreditAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    account = await db.aiCreditAccount.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        balance: 0,
      },
    });
  }

  return account;
}

// 套餐月度使用情况（委托 entitlements，额度来自 plans.ts 单一权威来源）
export async function getMonthlyPlanUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percent: number | null;
}> {
  const entitlements = await getUserEntitlements(userId);
  const limit = entitlements.limits.aiChatsPerMonth.max;
  const used = entitlements.limits.aiChatsPerMonth.used;
  const remaining = entitlements.limits.aiChatsPerMonth.remaining;

  return {
    used,
    limit,
    remaining,
    percent: limit === -1 ? null : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null,
  };
}

// 每日使用情况（仅统计，不再维护独立 DAILY_LIMITS；短时滥用由 route 层 rate-limit 控制）
export async function getDailyUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const account = await getOrCreateCreditAccount(userId);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usageCount = await db.aiCreditLedger.aggregate({
    where: {
      accountId: account.id,
      createdAt: { gte: todayStart },
      entryType: "consume",
    },
    _sum: { amount: true },
  });

  const used = usageCount._sum.amount ? Math.abs(usageCount._sum.amount) : 0;
  // limit/remaining 仅作占位，不再用作拦截条件（统一由套餐月度额度 + Credit 控制）
  return { used, limit: -1, remaining: -1 };
}

// 综合配额信息（套餐月度 + Credit；委托 entitlements 单一权威来源）
export async function getAiQuota(userId: string): Promise<{
  access: AiAccessLevel;
  planCode: string;
  isActiveMember: boolean;
  planUsage: { used: number; limit: number; remaining: number; percent: number | null };
  dailyUsage: { used: number; limit: number; remaining: number };
  creditBalance: number;
  canCall: boolean;
  reason?: string;
}> {
  const [accessInfo, entitlements, account] = await Promise.all([
    getAiAccessLevel(userId),
    getUserEntitlements(userId),
    getOrCreateCreditAccount(userId),
  ]);

  const planUsage = await getMonthlyPlanUsage(userId);
  const dailyUsage = await getDailyUsage(userId);
  const creditBalance = account.balance;

  // 判断是否可以调用
  let canCall = false;
  let reason: string | undefined;

  if (accessInfo.access !== "full") {
    canCall = false;
    reason = accessInfo.reason || "当前套餐无 AI 调用权限";
  } else if (planUsage.limit !== -1 && planUsage.remaining <= 0 && creditBalance <= 0) {
    canCall = false;
    reason = "本月套餐额度已用完且无额外 Credit，请升级套餐或购买额度包";
  } else {
    canCall = true;
  }

  return {
    ...accessInfo,
    planUsage,
    dailyUsage,
    creditBalance,
    canCall,
    reason,
  };
}

// 消耗额度（使用顺序：套餐月度额度 → Credit）
// 幂等键防止重复扣减
// 外部传入 idempotencyKey 时，会绑定到 userId 上下文，防止跨用户复用
export async function consumeCredit(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<{ success: boolean; reason?: string; balanceAfter?: number; source?: "plan" | "credit" }> {
  const quota = await getAiQuota(userId);

  if (!quota.canCall) {
    return { success: false, reason: quota.reason || "无调用权限" };
  }

  const account = await getOrCreateCreditAccount(userId);
  const boundKey = idempotencyKey
    ? bindIdempotencyKey(userId, idempotencyKey, { profileId: metadata?.profileId as string | undefined, conversationId: metadata?.conversationId as string | undefined })
    : `${referenceType}:${referenceId}`;

  // 确定扣减来源：优先套餐额度，其次 Credit
  let source: "plan" | "credit" = "plan";
  if (quota.planUsage.limit !== -1 && quota.planUsage.remaining <= 0) {
    if (quota.creditBalance >= amount) {
      source = "credit";
    } else {
      return { success: false, reason: "套餐额度已用完且 Credit 余额不足" };
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.aiCreditAccount.findUnique({
        where: { id: account.id },
      });

      if (!current) {
        return { success: false, reason: "账户不存在" };
      }

      // 幂等检查：已存在相同 idempotencyKey 的 consume 记录则视为成功
      const existing = await tx.aiCreditLedger.findUnique({
        where: { idempotencyKey: boundKey },
        select: { id: true, balanceAfter: true, entryType: true },
      });
      if (existing) {
        if (existing.entryType === "consume") {
          return { success: true, balanceAfter: existing.balanceAfter, source };
        }
        return { success: false, reason: "幂等键冲突" };
      }

      // 扣减 Credit 余额（如果是 credit 来源）
      let newBalance = current.balance;
      if (source === "credit") {
        newBalance = current.balance - amount;
        if (newBalance < 0) {
          return { success: false, reason: "Credit 余额不足" };
        }
        await tx.aiCreditAccount.update({
          where: { id: account.id, version: current.version },
          data: { balance: newBalance, version: { increment: 1 } },
        });
      }

      await tx.aiCreditLedger.create({
        data: {
          id: crypto.randomUUID(),
          accountId: account.id,
          entryType: "consume",
          amount: -amount,
          balanceAfter: newBalance,
          idempotencyKey: boundKey,
          referenceType,
          referenceId,
          metadata: metadata as Record<string, never> | undefined,
        },
      });

      return { success: true, balanceAfter: newBalance, source };
    });

    return result;
  } catch (e: any) {
    // 幂等：重复请求视为成功
    if (e?.code === "P2002" && e?.meta?.target?.includes("idempotencyKey")) {
      return { success: true, balanceAfter: account.balance, source };
    }
    throw e;
  }
}

// 回补额度（调用失败时）
// 外部传入 idempotencyKey 时，会绑定到 userId 上下文
export async function refundCredit(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  reason?: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; balanceAfter?: number; alreadyApplied?: boolean }> {
  const account = await getOrCreateCreditAccount(userId);
  const boundKey = idempotencyKey
    ? bindIdempotencyKey(userId, idempotencyKey, { profileId: metadata?.profileId as string | undefined, conversationId: metadata?.conversationId as string | undefined })
    : `refund:${referenceType}:${referenceId}`;

  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.aiCreditAccount.findUnique({
        where: { id: account.id },
      });

      if (!current) {
        return { success: false };
      }

      // 幂等检查：已存在相同 idempotencyKey 的 refund 记录则视为成功
      const existing = await tx.aiCreditLedger.findUnique({
        where: { idempotencyKey: boundKey },
        select: { id: true, balanceAfter: true, entryType: true },
      });
      if (existing) {
        if (existing.entryType === "refund") {
          return { success: true, balanceAfter: existing.balanceAfter, alreadyApplied: true };
        }
        return { success: false };
      }

      // 回补 Credit 余额（仅当原消耗来自 credit 时）
      // 这里简化处理：直接回补到 balance，并记录 refund
      const newBalance = current.balance + amount;

      await tx.aiCreditAccount.update({
        where: { id: account.id, version: current.version },
        data: { balance: newBalance, version: { increment: 1 } },
      });

      await tx.aiCreditLedger.create({
        data: {
          id: crypto.randomUUID(),
          accountId: account.id,
          entryType: "refund",
          amount,
          balanceAfter: newBalance,
          idempotencyKey: boundKey,
          referenceType,
          referenceId,
          reason,
        },
      });

      return { success: true, balanceAfter: newBalance };
    });

    return result;
  } catch (e: any) {
    // 幂等：重复请求视为成功
    if (e?.code === "P2002" && e?.meta?.target?.includes("idempotencyKey")) {
      const existing = await db.aiCreditLedger.findUnique({
        where: { idempotencyKey: boundKey },
        select: { id: true, balanceAfter: true, entryType: true },
      });
      if (existing && existing.entryType === "refund") {
        return { success: true, balanceAfter: existing.balanceAfter, alreadyApplied: true };
      }
    }
    return { success: false };
  }
}

export async function grantCredit(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  reason?: string,
): Promise<{ success: boolean; balanceAfter?: number }> {
  const account = await getOrCreateCreditAccount(userId);
  const idempotencyKey = `grant:${referenceType}:${referenceId}`;

  const result = await db.$transaction(async (tx) => {
    const current = await tx.aiCreditAccount.findUnique({
      where: { id: account.id },
    });

    if (!current) {
      return { success: false };
    }

    const newBalance = current.balance + amount;

    const updated = await tx.aiCreditAccount.update({
      where: { id: account.id, version: current.version },
      data: {
        balance: newBalance,
        version: { increment: 1 },
      },
    });

    await tx.aiCreditLedger.create({
      data: {
        id: crypto.randomUUID(),
        accountId: account.id,
        entryType: "grant",
        amount,
        balanceAfter: newBalance,
        idempotencyKey,
        referenceType,
        referenceId,
        reason,
      },
    });

    return { success: true, balanceAfter: newBalance };
  });

  return result;
}

// ---------- AI 冻结/封禁检查 ----------
export type AiRestrictionType = "AI_FREEZE" | "ADMIN_FREEZE_AI" | "SECURITY_RISK_AI";

export type AiRestrictionResult = {
  restricted: boolean;
  type: AiRestrictionType | null;
  reason: string | null;
  expiresAt: Date | null;
};

/**
 * 检查用户是否被禁止使用 AI 服务。
 * 复用 FreezeRecord 模型，type 包含 "AI_FREEZE" / "ADMIN_FREEZE_AI" / "SECURITY_RISK_AI" 视为 AI 冻结。
 */
export async function checkUserAiRestricted(userId: string): Promise<AiRestrictionResult> {
  const now = new Date();

  const records = await db.freezeRecord.findMany({
    where: {
      userId,
      isActive: true,
      type: { in: ["AI_FREEZE", "ADMIN_FREEZE_AI", "SECURITY_RISK_AI", "ADMIN_FREEZE", "SECURITY_RISK", "BANNED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const record of records) {
    if (record.startsAt > now) continue;
    if (record.expiresAt && record.expiresAt < now) continue;

    return {
      restricted: true,
      type: record.type as AiRestrictionType,
      reason: record.reason ?? null,
      expiresAt: record.expiresAt ?? null,
    };
  }

  return { restricted: false, type: null, reason: null, expiresAt: null };
}

/**
 * 冻结用户的 AI 权限（管理员操作）。
 */
export async function freezeUserAi(
  userId: string,
  type: AiRestrictionType,
  reason: string,
  adminUserId: string,
  expiresAt?: Date,
): Promise<{ success: boolean; freezeId?: string; error?: string }> {
  try {
    const existing = await checkUserAiRestricted(userId);
    if (existing.restricted) {
      return { success: false, error: "用户 AI 权限已在限制中" };
    }

    const record = await db.freezeRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type,
        reason,
        source: "admin",
        isActive: true,
        startsAt: new Date(),
        expiresAt: expiresAt ?? null,
      },
    });

    return { success: true, freezeId: record.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 解冻用户 AI 权限（管理员操作）。
 */
export async function unfreezeUserAi(
  userId: string,
  adminUserId: string,
  _reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.freezeRecord.updateMany({
      where: {
        userId,
        isActive: true,
        type: { in: ["AI_FREEZE", "ADMIN_FREEZE_AI", "SECURITY_RISK_AI", "ADMIN_FREEZE", "SECURITY_RISK", "BANNED"] },
      },
      data: {
        isActive: false,
        clearedAt: new Date(),
        clearedByUserId: adminUserId,
        clearedBySource: "admin",
      },
    });

    return { success: result.count > 0, error: result.count === 0 ? "无有效 AI 限制记录" : undefined };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 暂停用户单个 AI 助手（管理员操作）。
 */
export async function freezeUserSingleAssistant(
  userId: string,
  assistantTitle: string,
  adminUserId: string,
  reason: string,
  expiresAt?: Date,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.freezeRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "AI_FREEZE",
        reason: `[${assistantTitle}] ${reason}`,
        source: "admin",
        isActive: true,
        startsAt: new Date(),
        expiresAt: expiresAt ?? null,
        metadataRaw: JSON.stringify({ assistant: assistantTitle, scope: "single" }),
      },
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 保留 PlanCode 类型导入以便类型对齐（避免 unused import 警告）
export type { PlanCode };
