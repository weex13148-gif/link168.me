import crypto from "crypto";
import { db } from "@/lib/db";
import { getPlanDefinition, PlanCode, PLAN_DEFINITIONS, normalizePlanCode, isUniqueConstraintError } from "./plans";
import type { BillingOrder } from "./orders";
import { ORDER_STATUS } from "./orders";

export async function activateMembershipFromOrder(order: BillingOrder): Promise<{
  success: boolean;
  subscriptionId?: string;
  error?: string;
}> {
  if (order.status !== ORDER_STATUS.PAID) {
    return { success: false, error: "订单未支付" };
  }

  const plan = getPlanDefinition(order.planCode);
  if (plan.contactSales) {
    return { success: false, error: "企业版需人工开通" };
  }

  const now = new Date();
  const periodStart = now;
  let periodEnd: Date;

  if (order.billingCycle === "yearly") {
    periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.membershipSubscription.findUnique({
        where: { userId: order.userId },
      });

      let subscriptionId: string;
      let actualStart: Date;
      let actualEnd: Date;

      if (existing && existing.status === "active" && existing.currentPeriodEnd && existing.currentPeriodEnd > now) {
        actualStart = existing.currentPeriodEnd;
        actualEnd = new Date(existing.currentPeriodEnd);
        if (order.billingCycle === "yearly") {
          actualEnd.setFullYear(actualEnd.getFullYear() + 1);
        } else {
          actualEnd.setMonth(actualEnd.getMonth() + 1);
        }
      } else {
        actualStart = periodStart;
        actualEnd = periodEnd;
      }

      const subscription = await tx.membershipSubscription.upsert({
        where: { userId: order.userId },
        create: {
          id: crypto.randomUUID(),
          userId: order.userId,
          planCode: order.planCode,
          status: "active",
          currentPeriodStart: actualStart,
          currentPeriodEnd: actualEnd,
        },
        update: {
          planCode: order.planCode,
          status: "active",
          currentPeriodStart: actualStart,
          currentPeriodEnd: actualEnd,
        },
      });

      subscriptionId = subscription.id;

      const creditAccount = await tx.aiCreditAccount.findUnique({
        where: { userId: order.userId },
      });

      const grantAmount = plan.limits.aiCreditsGrant;
      const idempotencyKey = `grant:order:${order.id}`;

      if (grantAmount > 0) {
        let accountId: string;
        let newBalance: number;

        if (creditAccount) {
          accountId = creditAccount.id;
          newBalance = creditAccount.balance + grantAmount;
          await tx.aiCreditAccount.update({
            where: { id: accountId },
            data: {
              balance: { increment: grantAmount },
              version: { increment: 1 },
            },
          });
        } else {
          const newAccount = await tx.aiCreditAccount.create({
            data: {
              id: crypto.randomUUID(),
              userId: order.userId,
              balance: grantAmount,
              version: 1,
            },
          });
          accountId = newAccount.id;
          newBalance = grantAmount;
        }

        try {
          await tx.aiCreditLedger.create({
            data: {
              id: crypto.randomUUID(),
              accountId,
              entryType: "grant",
              amount: grantAmount,
              balanceAfter: newBalance,
              idempotencyKey,
              referenceType: "order",
              referenceId: order.id,
              metadata: {
                planCode: order.planCode,
                planName: order.planName,
                billingCycle: order.billingCycle,
                orderNo: order.orderNo,
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

      return { subscriptionId };
    });

    return { success: true, subscriptionId: result.subscriptionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "会员开通失败",
    };
  }
}

export async function getCurrentSubscription(userId: string) {
  const subscription = await db.membershipSubscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      planCode: "free" as PlanCode,
      plan: PLAN_DEFINITIONS.free,
      status: "inactive",
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  const now = new Date();
  const isExpired = subscription.currentPeriodEnd && subscription.currentPeriodEnd < now;
  const effectiveStatus = isExpired ? "expired" : subscription.status;
  const effectivePlanCode = isExpired ? "free" : normalizePlanCode(subscription.planCode);
  const plan = getPlanDefinition(effectivePlanCode);

  return {
    planCode: effectivePlanCode,
    plan,
    status: effectiveStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    subscriptionId: subscription.id,
  };
}

export async function getMembershipWithUsage(userId: string) {
  const subscription = await getCurrentSubscription(userId);
  const plan = subscription.plan;

  const creditAccount = await db.aiCreditAccount.findUnique({
    where: { userId },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usageCount = creditAccount
    ? await db.aiCreditLedger.aggregate({
        where: {
          accountId: creditAccount.id,
          createdAt: { gte: monthStart },
          entryType: "consume",
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: 0 } };

  const usedChats = usageCount._sum.amount ? Math.abs(usageCount._sum.amount) : 0;
  const planLimit = plan.limits.aiChatsPerMonth;
  const remainingChats = planLimit === -1 ? -1 : Math.max(0, planLimit - usedChats);

  return {
    subscription,
    plan,
    aiUsage: {
      used: usedChats,
      limit: planLimit,
      remaining: remainingChats,
      percent: planLimit === -1 ? null : Math.min(100, Math.round((usedChats / Math.max(1, planLimit)) * 100)),
    },
    creditBalance: creditAccount?.balance ?? 0,
  };
}
