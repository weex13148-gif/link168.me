import { db } from "@/lib/db";
import crypto from "crypto";

// 套餐月度额度（产品规则：免费用户可预览 AI 助手，正式调用需升级会员）
// 注意：此处的额度限制用于 AI 正式调用，预览模式不消耗额度
// 免费用户：50 次/月预览额度（不消耗正式额度），正式调用需升级
// starter/member_basic: 200 次/月
// pro/member_plus: 2000 次/月
// enterprise: -1 表示无限额度（仍受每日风控上限保护）
export const PLAN_AI_LIMITS: Record<string, number> = {
  free: 0, // 免费用户正式调用额度为 0，只能预览
  starter: 200, // 旧套餐名兼容
  member_basic: 200,
  pro: 2000, // 旧套餐名兼容
  member_plus: 2000,
  enterprise: -1,
};

// 每日风控上限（防止短时间滥用，独立于套餐额度）
export const DAILY_LIMITS: Record<string, number> = {
  free: 0, // 免费用户无正式调用权限
  starter: 50, // 旧套餐名兼容
  member_basic: 50,
  pro: 200, // 旧套餐名兼容
  member_plus: 200,
  enterprise: 500,
};

export type AiAccessLevel = "none" | "preview" | "full";

export async function getMembershipPlan(userId: string): Promise<{ planCode: string; status: string }> {
  const sub = await db.membershipSubscription.findUnique({
    where: { userId },
    select: { planCode: true, status: true },
  });
  return {
    planCode: sub?.planCode ?? "free", status: sub?.status ?? "inactive" };
}

export async function getAiAccessLevel(userId: string): Promise<{
  access: AiAccessLevel; planCode: string; isActiveMember: boolean; reason?: string }> {
  const { planCode, status } = await getMembershipPlan(userId);
  const isActive = status === "active";

  // 产品规则：免费用户不能正式使用五大 AI 助手
  if (planCode === "free") {
    return { access: "preview", planCode, isActiveMember: false, reason: "免费用户仅可预览AI助手介绍，升级会员即可使用全部AI能力" };
  }

  if (!isActive) {
    return { access: "preview", planCode, isActiveMember: false, reason: "会员已过期，请续费后继续使用" };
  }

  return { access: "full", planCode, isActiveMember: true };
}

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

// 获取套餐月度使用情况（不含 Credit）
export async function getMonthlyPlanUsage(userId: string): Promise<{
  used: number; limit: number; remaining: number; percent: number | null }> {
  const { planCode, status } = await getMembershipPlan(userId);
  const isActive = status === "active";
  const planLimit = isActive ? (PLAN_AI_LIMITS[planCode] ?? 0) : 0;

  const account = await getOrCreateCreditAccount(userId);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usageCount = await db.aiCreditLedger.aggregate({
    where: {
      accountId: account.id,
      createdAt: { gte: monthStart },
      entryType: "consume",
    },
    _sum: { amount: true },
  });

  const used = usageCount._sum.amount ? Math.abs(usageCount._sum.amount) : 0;
  const remaining = planLimit === -1 ? -1 : Math.max(0, planLimit - used);

  return {
    used,
    limit: planLimit,
    remaining,
    percent: planLimit === -1 ? null : (planLimit > 0 ? Math.min(100, Math.round((used / planLimit) * 100)) : null),
  };
}

// 获取每日风控使用情况
export async function getDailyUsage(userId: string): Promise<{
  used: number; limit: number; remaining: number }> {
  const { planCode, status } = await getMembershipPlan(userId);
  const isActive = status === "active";
  const dailyLimit = isActive ? (DAILY_LIMITS[planCode] ?? 0) : 0;

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
  const remaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - used);

  return { used, limit: dailyLimit, remaining };
}

// 获取综合配额信息（套餐月度 + 每日风控 + Credit）
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
  const accessInfo = await getAiAccessLevel(userId);
  const planUsage = await getMonthlyPlanUsage(userId);
  const dailyUsage = await getDailyUsage(userId);
  const account = await getOrCreateCreditAccount(userId);
  const creditBalance = account.balance;

  // 判断是否可以调用
  let canCall = false;
  let reason: string | undefined;

  if (accessInfo.access !== "full") {
    canCall = false;
    reason = accessInfo.reason || "当前套餐无 AI 调用权限";
  } else if (dailyUsage.remaining === 0 && dailyUsage.limit !== -1) {
    canCall = false;
    reason = `今日调用已达上限（${dailyUsage.used}/${dailyUsage.limit}），请明天再试`;
  } else if (planUsage.remaining === 0 && planUsage.limit !== -1 && creditBalance <= 0) {
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
export async function consumeCredit(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; reason?: string; balanceAfter?: number; source?: "plan" | "credit" }> {
  const quota = await getAiQuota(userId);

  if (!quota.canCall) {
    return { success: false, reason: quota.reason || "无调用权限" };
  }

  const account = await getOrCreateCreditAccount(userId);
  const idempotencyKey = `${referenceType}:${referenceId}`;

  // 确定扣减来源：优先套餐额度，其次 Credit
  let source: "plan" | "credit" = "plan";
  if (quota.planUsage.remaining === 0 && quota.planUsage.limit !== -1) {
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
          idempotencyKey,
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
export async function refundCredit(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  reason?: string,
): Promise<{ success: boolean; balanceAfter?: number }> {
  const account = await getOrCreateCreditAccount(userId);
  const idempotencyKey = `refund:${referenceType}:${referenceId}`;

  const result = await db.$transaction(async (tx) => {
    const current = await tx.aiCreditAccount.findUnique({
      where: { id: account.id },
    });

    if (!current) {
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
