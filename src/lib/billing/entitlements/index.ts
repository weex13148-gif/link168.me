import { db } from "@/lib/db";
import { getPlanDefinition, type PlanCode, type PlanDefinition, normalizePlanCode } from "../plans";

export type EntitlementCheck = {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
  remaining?: number;
};

export type UserEntitlements = {
  hasActiveMembership: boolean;
  isLegacyActive: boolean;
  planCode: PlanCode;
  plan: PlanDefinition;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  daysRemaining: number;
  isGracePeriod: boolean;
  gracePeriodDays: number;
  features: {
    aiEnabled: boolean;
    advancedModels: boolean;
    fileUpload: boolean;
    enterpriseMemory: boolean;
    removeBranding: boolean;
    advancedStats: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
  };
  limits: {
    products: { max: number; remaining: number };
    knowledgeDocs: { max: number; remaining: number };
    aiChatsPerMonth: { max: number; used: number; remaining: number };
    teamSeats: { max: number };
  };
};

const GRACE_PERIOD_DAYS = 3;
const PLAN_RANK: PlanCode[] = [
  "free",
  "plus",
  "pro",
  "enterprise",
  "enterprise_pro",
  "internal_test",
];

function remaining(max: number, used: number) {
  return max === -1 ? -1 : Math.max(0, max - used);
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const subscription = await db.membershipSubscription.findUnique({ where: { userId } });
  const now = new Date();

  let effectivePlanCode: PlanCode = "free";
  const currentPeriodStart: Date | null = subscription?.currentPeriodStart ?? null;
  const currentPeriodEnd: Date | null = subscription?.currentPeriodEnd ?? null;
  let hasActiveMembership = false;
  let isLegacyActive = false;
  let isGracePeriod = false;
  let gracePeriodDays = 0;

  if (subscription?.status === "active") {
    const normalized = normalizePlanCode(subscription.planCode);
    if (normalized !== "free") {
      if (!currentPeriodEnd) {
        // 兼容早期已经开通但尚未补齐周期字段的会员数据。
        effectivePlanCode = normalized;
        hasActiveMembership = true;
        isLegacyActive = true;
      } else if (currentPeriodEnd > now) {
        effectivePlanCode = normalized;
        hasActiveMembership = true;
      } else {
        const daysSinceExpired = Math.floor((now.getTime() - currentPeriodEnd.getTime()) / 86_400_000);
        if (daysSinceExpired <= GRACE_PERIOD_DAYS) {
          effectivePlanCode = normalized;
          isGracePeriod = true;
          gracePeriodDays = Math.max(0, GRACE_PERIOD_DAYS - daysSinceExpired);
        }
      }
    }
  }

  const plan = getPlanDefinition(effectivePlanCode);
  const [productsUsed, knowledgeDocsUsed, creditAccount] = await Promise.all([
    db.product.count({ where: { userId, isActive: true } }),
    db.knowledgeDoc.count({ where: { userId, isActive: true } }),
    db.aiCreditAccount.findUnique({ where: { userId } }),
  ]);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEntries = creditAccount
    ? await db.aiCreditLedger.findMany({
        where: {
          accountId: creditAccount.id,
          createdAt: { gte: monthStart },
          entryType: { in: ["consume", "refund"] },
        },
        select: { amount: true, metadata: true },
      })
    : [];

  const netPlanAmount = monthEntries.reduce((sum, entry) => {
    const metadata = entry.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return sum;
    }
    return (metadata as Record<string, unknown>).creditSource === "plan"
      ? sum + entry.amount
      : sum;
  }, 0);
  const aiUsed = Math.max(0, -netPlanAmount);
  const aiLimit = plan.limits.aiChatsPerMonth;
  const paid = effectivePlanCode !== "free" && (hasActiveMembership || isGracePeriod);
  const proOrAbove = ["pro", "enterprise", "enterprise_pro", "internal_test"].includes(effectivePlanCode);
  const enterprise = ["enterprise", "enterprise_pro", "internal_test"].includes(effectivePlanCode);

  return {
    hasActiveMembership,
    isLegacyActive,
    planCode: effectivePlanCode,
    plan,
    currentPeriodStart,
    currentPeriodEnd,
    daysRemaining: currentPeriodEnd && currentPeriodEnd > now
      ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / 86_400_000))
      : 0,
    isGracePeriod,
    gracePeriodDays,
    features: {
      aiEnabled: paid && aiLimit !== 0,
      advancedModels: paid,
      fileUpload: paid,
      enterpriseMemory: paid && enterprise,
      removeBranding: paid && plan.limits.removeBranding,
      advancedStats: paid && proOrAbove,
      customDomain: paid && plan.limits.customDomain,
      prioritySupport: paid && plan.limits.prioritySupport,
    },
    limits: {
      products: { max: plan.limits.products, remaining: remaining(plan.limits.products, productsUsed) },
      knowledgeDocs: { max: plan.limits.knowledgeDocs, remaining: remaining(plan.limits.knowledgeDocs, knowledgeDocsUsed) },
      aiChatsPerMonth: { max: aiLimit, used: aiUsed, remaining: remaining(aiLimit, aiUsed) },
      teamSeats: { max: plan.limits.teamSeats },
    },
  };
}

export async function checkFeatureEntitlement(
  userId: string,
  feature: keyof UserEntitlements["features"],
): Promise<EntitlementCheck> {
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.features[feature]) {
    return { allowed: false, reason: `当前套餐 ${entitlements.plan.name} 不支持此功能` };
  }
  return { allowed: true };
}

export async function checkLimitEntitlement(
  userId: string,
  limitType: keyof UserEntitlements["limits"],
): Promise<EntitlementCheck> {
  const entitlements = await getUserEntitlements(userId);
  const limit = entitlements.limits[limitType];
  if (limit.max === -1) return { allowed: true, limit: -1, used: 0, remaining: -1 };
  if (!("remaining" in limit)) {
    return { allowed: limit.max > 0, limit: limit.max, reason: limit.max > 0 ? undefined : `当前套餐未开放 ${limitType}` };
  }
  const value = limit as { max: number; remaining: number; used?: number };
  return {
    allowed: value.remaining > 0,
    limit: value.max,
    used: value.used ?? 0,
    remaining: value.remaining,
    reason: value.remaining <= 0 ? `已达到 ${limitType} 上限` : undefined,
  };
}

export async function checkAiQuota(userId: string) {
  const entitlements = await getUserEntitlements(userId);
  return {
    allowed: entitlements.features.aiEnabled && entitlements.limits.aiChatsPerMonth.remaining !== 0,
    limit: entitlements.limits.aiChatsPerMonth.max,
    used: entitlements.limits.aiChatsPerMonth.used,
    remaining: entitlements.limits.aiChatsPerMonth.remaining,
    hasAdvancedModels: entitlements.features.advancedModels,
    hasFileUpload: entitlements.features.fileUpload,
    hasEnterpriseMemory: entitlements.features.enterpriseMemory,
  };
}

export async function isFeatureAllowed(
  userId: string,
  feature: keyof UserEntitlements["features"],
): Promise<boolean> {
  return (await getUserEntitlements(userId)).features[feature];
}

export async function canUpgradeFromCurrentPlan(userId: string, targetPlanCode: PlanCode) {
  const entitlements = await getUserEntitlements(userId);
  const current = normalizePlanCode(entitlements.planCode);
  const target = normalizePlanCode(targetPlanCode);
  if (current === target) return { canUpgrade: false, reason: "已是当前套餐", currentPlanCode: current };
  if (PLAN_RANK.indexOf(target) <= PLAN_RANK.indexOf(current)) {
    return { canUpgrade: false, reason: "目标套餐低于或等于当前套餐", currentPlanCode: current };
  }
  return { canUpgrade: true, currentPlanCode: current };
}
