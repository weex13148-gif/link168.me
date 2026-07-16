import crypto from "crypto";
import { db } from "@/lib/db";
import { getPlanDefinition, type PlanCode, normalizePlanCode, isUniqueConstraintError } from "./plans";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";

export const GRACE_PERIOD_DAYS = 3;

export const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  PAST_DUE: "past_due",
  PAUSED: "paused",
} as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export type LifecycleEvent = {
  type:
    | "first_purchase"
    | "renewal"
    | "upgrade"
    | "downgrade"
    | "expire"
    | "grace_period_start"
    | "grace_period_end"
    | "cancel"
    | "refund_revoke";
  userId: string;
  fromPlan: string;
  toPlan: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export type MembershipExpiryResult = {
  userId: string;
  action: "expired" | "grace_period" | "already_downgraded" | "skipped";
  previousPlan: string;
  newPlan: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
};

function getDaysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / msPerDay);
}

export function getMembershipStatusInfo(subscription: {
  status: string;
  planCode: string;
  currentPeriodEnd: Date | null;
}): {
  effectivePlanCode: PlanCode;
  effectiveStatus: string;
  isActive: boolean;
  isGracePeriod: boolean;
  graceDaysRemaining: number;
  daysRemaining: number;
} {
  const now = new Date();
  const planCode = normalizePlanCode(subscription.planCode);
  const periodEnd = subscription.currentPeriodEnd;

  if (subscription.status === "cancelled") {
    return {
      effectivePlanCode: "free",
      effectiveStatus: "cancelled",
      isActive: false,
      isGracePeriod: false,
      graceDaysRemaining: 0,
      daysRemaining: 0,
    };
  }

  if (!periodEnd) {
    if (subscription.status === "active" && planCode !== "free") {
      return {
        effectivePlanCode: planCode,
        effectiveStatus: "active_legacy",
        isActive: true,
        isGracePeriod: false,
        graceDaysRemaining: 0,
        daysRemaining: -1,
      };
    }
    return {
      effectivePlanCode: "free",
      effectiveStatus: "inactive",
      isActive: false,
      isGracePeriod: false,
      graceDaysRemaining: 0,
      daysRemaining: 0,
    };
  }

  if (periodEnd > now) {
    const daysRemaining = getDaysBetween(periodEnd, now);
    return {
      effectivePlanCode: planCode,
      effectiveStatus: "active",
      isActive: true,
      isGracePeriod: false,
      graceDaysRemaining: 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  const daysSinceExpired = getDaysBetween(now, periodEnd);
  if (daysSinceExpired <= GRACE_PERIOD_DAYS) {
    const graceDaysRemaining = GRACE_PERIOD_DAYS - daysSinceExpired;
    return {
      effectivePlanCode: planCode,
      effectiveStatus: "grace_period",
      isActive: true,
      isGracePeriod: true,
      graceDaysRemaining: Math.max(0, graceDaysRemaining),
      daysRemaining: 0,
    };
  }

  return {
    effectivePlanCode: "free",
    effectiveStatus: "expired",
    isActive: false,
    isGracePeriod: false,
    graceDaysRemaining: 0,
    daysRemaining: 0,
  };
}

export async function processMembershipExpiry(
  batchSize = 50,
  cursor?: string,
): Promise<{
  processed: number;
  expired: number;
  gracePeriod: number;
  skipped: number;
  failed: number;
  results: MembershipExpiryResult[];
  nextCursor?: string;
  hasMore: boolean;
}> {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    status: { in: ["active", "past_due"] },
    planCode: { not: "free" },
    currentPeriodEnd: { not: null, lt: now },
  };

  if (cursor) {
    where.id = { gt: cursor };
  }

  const subscriptions = await db.membershipSubscription.findMany({
    where,
    orderBy: { id: "asc" },
    take: batchSize + 1,
    select: {
      id: true,
      userId: true,
      planCode: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  const hasMore = subscriptions.length > batchSize;
  const items = hasMore ? subscriptions.slice(0, batchSize) : subscriptions;

  const results: MembershipExpiryResult[] = [];
  let expiredCount = 0;
  let gracePeriodCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const sub of items) {
    try {
      const result = await processSingleExpiry(sub);
      results.push(result);

      if (result.action === "expired") expiredCount++;
      else if (result.action === "grace_period") gracePeriodCount++;
      else if (result.action === "skipped" || result.action === "already_downgraded") skippedCount++;
    } catch (err) {
      failedCount++;
      results.push({
        userId: sub.userId,
        action: "skipped",
        previousPlan: sub.planCode,
        newPlan: sub.planCode,
        previousStatus: sub.status,
        newStatus: sub.status,
        reason: err instanceof Error ? err.message : "处理失败",
      });
    }
  }

  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return {
    processed: items.length,
    expired: expiredCount,
    gracePeriod: gracePeriodCount,
    skipped: skippedCount,
    failed: failedCount,
    results,
    nextCursor,
    hasMore,
  };
}

async function processSingleExpiry(sub: {
  id: string;
  userId: string;
  planCode: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): Promise<MembershipExpiryResult> {
  const now = new Date();

  if (!sub.currentPeriodEnd) {
    return {
      userId: sub.userId,
      action: "skipped",
      previousPlan: sub.planCode,
      newPlan: sub.planCode,
      previousStatus: sub.status,
      newStatus: sub.status,
      reason: "无到期时间，视为 legacy 终身会员",
    };
  }

  if (sub.planCode === "free" || !["active", "past_due"].includes(sub.status)) {
    return {
      userId: sub.userId,
      action: "already_downgraded",
      previousPlan: sub.planCode,
      newPlan: sub.planCode,
      previousStatus: sub.status,
      newStatus: sub.status,
      reason: "非活跃付费会员",
    };
  }

  const daysSinceExpired = getDaysBetween(now, sub.currentPeriodEnd);

  const existingMeta: Record<string, unknown> = {};

  if (daysSinceExpired > GRACE_PERIOD_DAYS) {
    return await downgradeToFree(sub, "grace_period_expired");
  }

  if (daysSinceExpired >= 0) {
    return await enterGracePeriod(sub, daysSinceExpired);
  }

  return {
    userId: sub.userId,
    action: "skipped",
    previousPlan: sub.planCode,
    newPlan: sub.planCode,
    previousStatus: sub.status,
    newStatus: sub.status,
    reason: "尚未到期",
  };
}

async function enterGracePeriod(
  sub: {
    id: string;
    userId: string;
    planCode: string;
    status: string;
    currentPeriodEnd: Date | null;
  },
  daysSinceExpired: number,
): Promise<MembershipExpiryResult> {
  const graceDaysRemaining = GRACE_PERIOD_DAYS - daysSinceExpired;

  if (sub.status === "past_due") {
    return {
      userId: sub.userId,
      action: "grace_period",
      previousPlan: sub.planCode,
      newPlan: sub.planCode,
      previousStatus: sub.status,
      newStatus: sub.status,
      reason: `宽限期第 ${daysSinceExpired + 1} 天，剩余 ${graceDaysRemaining} 天`,
    };
  }

  const updated = await db.membershipSubscription.update({
    where: { id: sub.id },
    data: {
      status: "past_due",
    },
  });

  await writeAdminAuditLog({
    action: "billing.membership_grace_period",
    targetType: "membership",
    targetId: sub.id,
    success: true,
    metadata: {
      userId: sub.userId,
      previousPlan: sub.planCode,
      previousStatus: sub.status,
      graceDaysRemaining,
      expiredAt: sub.currentPeriodEnd?.toISOString() || null,
    },
  });

  return {
    userId: sub.userId,
    action: "grace_period",
    previousPlan: sub.planCode,
    newPlan: sub.planCode,
    previousStatus: sub.status,
    newStatus: updated.status,
    reason: `宽限期第 ${daysSinceExpired + 1} 天，剩余 ${graceDaysRemaining} 天`,
  };
}

async function downgradeToFree(
  sub: {
    id: string;
    userId: string;
    planCode: string;
    status: string;
    currentPeriodEnd: Date | null;
  },
  reason: string,
): Promise<MembershipExpiryResult> {
  const previousPlan = sub.planCode;
  const previousStatus = sub.status;

  const updated = await db.membershipSubscription.update({
    where: { id: sub.id },
    data: {
      planCode: "free",
      status: "expired",
    },
  });

  await writeAdminAuditLog({
    action: "billing.membership_expired",
    targetType: "membership",
    targetId: sub.id,
    success: true,
    metadata: {
      userId: sub.userId,
      previousPlan,
      previousStatus,
      newPlan: "free",
      newStatus: updated.status,
      reason,
      expiredAt: sub.currentPeriodEnd?.toISOString() || null,
    },
  });

  return {
    userId: sub.userId,
    action: "expired",
    previousPlan,
    newPlan: "free",
    previousStatus,
    newStatus: updated.status,
    reason,
  };
}

export async function calculateRenewalExtension(
  userId: string,
  billingCycle: "monthly" | "yearly",
  newPlanCode: PlanCode,
): Promise<{
  periodStart: Date;
  periodEnd: Date;
  isRenewal: boolean;
  isUpgrade: boolean;
  previousPlan: PlanCode;
}> {
  const now = new Date();
  const subscription = await db.membershipSubscription.findUnique({
    where: { userId },
  });

  const newPlan = getPlanDefinition(newPlanCode);

  if (!subscription || subscription.status !== "active" || !subscription.currentPeriodEnd) {
    const periodEnd = new Date(now);
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    return {
      periodStart: now,
      periodEnd,
      isRenewal: false,
      isUpgrade: false,
      previousPlan: "free",
    };
  }

  const previousPlan = normalizePlanCode(subscription.planCode);
  const currentEnd = subscription.currentPeriodEnd;
  const isRenewal = previousPlan === newPlanCode && currentEnd > now;

  const planRank: PlanCode[] = [
    "free",
    "plus",
    "pro",
    "enterprise",
    "enterprise_pro",
    "internal_test",
  ];
  const currentRank = planRank.indexOf(previousPlan);
  const newRank = planRank.indexOf(newPlanCode);
  const isUpgrade = newRank > currentRank;

  let periodStart: Date;
  let periodEnd: Date;

  if (currentEnd > now) {
    periodStart = currentEnd;
    periodEnd = new Date(currentEnd);
  } else {
    periodStart = now;
    periodEnd = new Date(now);
  }

  if (billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return {
    periodStart,
    periodEnd,
    isRenewal,
    isUpgrade,
    previousPlan,
  };
}

export async function activateOrRenewMembership(params: {
  userId: string;
  planCode: PlanCode;
  billingCycle: "monthly" | "yearly";
  orderId?: string;
  orderNo?: string;
}): Promise<{
  success: boolean;
  subscriptionId?: string;
  previousPlan?: string;
  newPlan: string;
  previousStatus?: string;
  newStatus: string;
  periodStart: Date;
  periodEnd: Date;
  isRenewal: boolean;
  isUpgrade: boolean;
  error?: string;
}> {
  const { userId, planCode, billingCycle, orderId, orderNo } = params;

  try {
    const extension = await calculateRenewalExtension(userId, billingCycle, planCode);

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.membershipSubscription.findUnique({
        where: { userId },
      });

      const previousPlan = existing?.planCode || "free";
      const previousStatus = existing?.status || "inactive";

      const subscription = await tx.membershipSubscription.upsert({
        where: { userId },
        create: {
          userId,
          planCode,
          status: "active",
          currentPeriodStart: extension.periodStart,
          currentPeriodEnd: extension.periodEnd,
        },
        update: {
          planCode,
          status: "active",
          currentPeriodStart: extension.periodStart,
          currentPeriodEnd: extension.periodEnd,
        },
      });

      const plan = getPlanDefinition(planCode);
      const grantAmount = plan.limits.aiCreditsGrant;

      if (grantAmount > 0) {
        const creditAccount = await tx.aiCreditAccount.upsert({
          where: { userId },
          create: { userId, balance: grantAmount, version: 1 },
          update: { balance: { increment: grantAmount }, version: { increment: 1 } },
          select: { id: true, balance: true },
        });

        const idempotencyKey = orderId
          ? `grant:order:${orderId}`
          : `grant:manual:${userId}:${planCode}:${billingCycle}`;

        try {
          await tx.aiCreditLedger.create({
            data: {
              id: crypto.randomUUID(),
              accountId: creditAccount.id,
              entryType: "grant",
              amount: grantAmount,
              balanceAfter: creditAccount.balance,
              idempotencyKey,
              referenceType: "order",
              referenceId: orderId || null,
              metadata: {
                planCode,
                billingCycle,
                orderNo: orderNo || null,
                previousPlan,
                isUpgrade: extension.isUpgrade,
                isRenewal: extension.isRenewal,
              },
            },
          });
        } catch (e) {
          if (isUniqueConstraintError(e, "idempotency_key")) {
            // 幂等：已存在则跳过
          } else {
            throw e;
          }
        }
      }

      return {
        subscription,
        previousPlan,
        previousStatus,
      };
    });

    const eventType = extension.isUpgrade
      ? "upgrade"
      : extension.isRenewal
      ? "renewal"
      : "first_purchase";

    await writeAdminAuditLog({
      action: `billing.membership_${eventType}`,
      targetType: "membership",
      targetId: result.subscription.id,
      success: true,
      metadata: {
        userId,
        previousPlan: result.previousPlan,
        newPlan: planCode,
        previousStatus: result.previousStatus,
        newStatus: result.subscription.status,
        periodStart: extension.periodStart.toISOString(),
        periodEnd: extension.periodEnd.toISOString(),
        billingCycle,
        orderId: orderId || null,
        orderNo: orderNo || null,
        isUpgrade: extension.isUpgrade,
        isRenewal: extension.isRenewal,
      },
    });

    return {
      success: true,
      subscriptionId: result.subscription.id,
      previousPlan: result.previousPlan,
      newPlan: planCode,
      previousStatus: result.previousStatus,
      newStatus: result.subscription.status,
      periodStart: extension.periodStart,
      periodEnd: extension.periodEnd,
      isRenewal: extension.isRenewal,
      isUpgrade: extension.isUpgrade,
    };
  } catch (err) {
    return {
      success: false,
      newPlan: planCode,
      newStatus: "unknown",
      periodStart: new Date(),
      periodEnd: new Date(),
      isRenewal: false,
      isUpgrade: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
