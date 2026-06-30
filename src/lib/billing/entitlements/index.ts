import { db } from "@/lib/db";
import { getPlanDefinition, PlanCode } from "../plans";
import type { PlanDefinition } from "../plans";

export type EntitlementCheck = {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
  remaining?: number;
};

export type UserEntitlements = {
  hasActiveMembership: boolean;
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

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const subscription = await db.membershipSubscription.findUnique({
    where: { userId },
  });

  const now = new Date();
  let effectivePlanCode: PlanCode = "free";
  let effectivePlan = getPlanDefinition("free");
  let currentPeriodStart: Date | null = null;
  let currentPeriodEnd: Date | null = null;
  let hasActiveMembership = false;
  let isGracePeriod = false;
  let gracePeriodDays = 0;

  if (subscription) {
    currentPeriodStart = subscription.currentPeriodStart;
    currentPeriodEnd = subscription.currentPeriodEnd;

    if (currentPeriodEnd && currentPeriodEnd > now) {
      hasActiveMembership = true;
      effectivePlanCode = subscription.planCode as PlanCode;
      effectivePlan = getPlanDefinition(effectivePlanCode);
    } else if (currentPeriodEnd) {
      const daysSinceExpired = Math.floor((now.getTime() - currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceExpired <= GRACE_PERIOD_DAYS) {
        isGracePeriod = true;
        gracePeriodDays = GRACE_PERIOD_DAYS - daysSinceExpired;
        effectivePlanCode = subscription.planCode as PlanCode;
        effectivePlan = getPlanDefinition(effectivePlanCode);
      }
    }
  }

  const daysRemaining = currentPeriodEnd
    ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const productsUsed = await db.product.count({
    where: { userId, isActive: true },
  });

  const knowledgeDocsUsed = await db.knowledgeDoc.count({
    where: { userId, isActive: true },
  });

  const creditAccount = await db.aiCreditAccount.findUnique({
    where: { userId },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const aiUsageCount = creditAccount
    ? await db.aiCreditLedger.aggregate({
        where: {
          accountId: creditAccount.id,
          createdAt: { gte: monthStart },
          entryType: "consume",
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: 0 } };

  const aiChatsUsed = aiUsageCount._sum.amount ? Math.abs(aiUsageCount._sum.amount) : 0;
  const aiChatsLimit = effectivePlan.limits.aiChatsPerMonth;
  const aiChatsRemaining = aiChatsLimit === -1 ? -1 : Math.max(0, aiChatsLimit - aiChatsUsed);

  return {
    hasActiveMembership,
    planCode: effectivePlanCode,
    plan: effectivePlan,
    currentPeriodStart,
    currentPeriodEnd,
    daysRemaining,
    isGracePeriod,
    gracePeriodDays,
    features: {
      aiEnabled: effectivePlan.limits.aiChatsPerMonth > 0,
      advancedModels: effectivePlanCode !== "free",
      fileUpload: effectivePlanCode !== "free",
      enterpriseMemory: effectivePlanCode === "enterprise",
      removeBranding: effectivePlan.limits.removeBranding,
      advancedStats: effectivePlanCode !== "free",
      customDomain: effectivePlan.limits.customDomain,
      prioritySupport: effectivePlan.limits.prioritySupport,
    },
    limits: {
      products: {
        max: effectivePlan.limits.products,
        remaining: effectivePlan.limits.products === -1 ? -1 : Math.max(0, effectivePlan.limits.products - productsUsed),
      },
      knowledgeDocs: {
        max: effectivePlan.limits.knowledgeDocs,
        remaining: effectivePlan.limits.knowledgeDocs === -1 ? -1 : Math.max(0, effectivePlan.limits.knowledgeDocs - knowledgeDocsUsed),
      },
      aiChatsPerMonth: {
        max: aiChatsLimit,
        used: aiChatsUsed,
        remaining: aiChatsRemaining,
      },
      teamSeats: {
        max: effectivePlan.limits.teamSeats,
      },
    },
  };
}

export async function checkFeatureEntitlement(
  userId: string,
  feature: keyof UserEntitlements["features"]
): Promise<EntitlementCheck> {
  const entitlements = await getUserEntitlements(userId);
  
  if (!entitlements.features[feature]) {
    return {
      allowed: false,
      reason: `当前套餐 ${entitlements.plan.name} 不支持此功能`,
    };
  }

  return { allowed: true };
}

export async function checkLimitEntitlement(
  userId: string,
  limitType: keyof UserEntitlements["limits"]
): Promise<EntitlementCheck> {
  const entitlements = await getUserEntitlements(userId);
  const limit = entitlements.limits[limitType];

  if (limit.max === -1) {
    return { allowed: true, limit: -1, used: 0, remaining: -1 };
  }

  const hasRemaining = "remaining" in limit && (limit as { remaining?: number }).remaining !== undefined;

  if (!hasRemaining) {
    return {
      allowed: limit.max > 0,
      reason: `当前套餐 ${entitlements.plan.name} 未配置此限额`,
    };
  }

  const remaining = ((limit as unknown) as { remaining?: number }).remaining ?? 0;

  return {
    allowed: remaining > 0,
    limit: limit.max,
    used: "used" in limit ? (limit as { used: number }).used : 0,
    remaining,
    reason: remaining <= 0 ? `已达到${limitType}上限` : undefined,
  };
}

export async function checkAiQuota(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  hasAdvancedModels: boolean;
  hasFileUpload: boolean;
  hasEnterpriseMemory: boolean;
}> {
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

export async function isFeatureAllowed(userId: string, feature: keyof UserEntitlements["features"]): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.features[feature];
}

export async function canUpgradeFromCurrentPlan(userId: string, targetPlanCode: PlanCode): Promise<{
  canUpgrade: boolean;
  reason?: string;
  currentPlanCode?: PlanCode;
}> {
  const entitlements = await getUserEntitlements(userId);
  const currentPlan = entitlements.plan;
  const targetPlan = getPlanDefinition(targetPlanCode);

  if (entitlements.planCode === targetPlanCode) {
    return { canUpgrade: false, reason: "已是当前套餐", currentPlanCode: entitlements.planCode };
  }

  const planOrder: PlanCode[] = ["free", "member_basic", "member_plus", "enterprise"];
  const currentIndex = planOrder.indexOf(entitlements.planCode);
  const targetIndex = planOrder.indexOf(targetPlanCode);

  if (targetIndex <= currentIndex) {
    return { canUpgrade: false, reason: "目标套餐低于或等于当前套餐", currentPlanCode: entitlements.planCode };
  }

  if (targetPlan.contactSales) {
    return { canUpgrade: false, reason: "企业版需联系销售", currentPlanCode: entitlements.planCode };
  }

  return { canUpgrade: true, currentPlanCode: entitlements.planCode };
}
