import { db } from "@/lib/db";
import { getUserEntitlements } from "@/lib/billing/entitlements";

const ENTERPRISE_PLAN_CODES = new Set(["enterprise", "enterprise_pro_plus"]);

const MAX_AMOUNT_PER_CALL = 100;

export type EnterpriseQuotaConsumptionResult =
  | {
      success: true;
      consumptionId: string;
      remainingQuota: number;
      totalQuota: number;
    }
  | {
      success: false;
      code:
        | "INVALID_AMOUNT"
        | "QUOTA_POOL_NOT_FOUND"
        | "MEMBER_NOT_FOUND"
        | "MEMBER_NOT_ACTIVE"
        | "INSUFFICIENT_QUOTA"
        | "OPERATION_ID_EXISTS"
        | "IDEMPOTENCY_CONFLICT"
        | "WORKSPACE_INACTIVE"
        | "PLAN_NOT_ALLOWED"
        | "PLAN_EXPIRED"
        | "PLAN_QUOTA_NOT_CONFIGURED"
        | "CONCURRENT_UPDATE"
        | "INTERNAL_ERROR"
        | "AI_PROVIDER_NOT_CONFIGURED";
      message: string;
    };

export type EnterpriseQuotaPoolInfo = {
  id: string;
  workspaceId: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  periodStart: Date;
  periodEnd: Date;
};

export type MemberUsageDetail = {
  userId: string;
  email: string;
  displayName: string;
  totalAmount: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
  lastSucceededAt: Date | null;
};

function validateAmount(amount: number): { valid: boolean; code?: "INVALID_AMOUNT"; message?: string } {
  if (!Number.isInteger(amount)) {
    return { valid: false, code: "INVALID_AMOUNT", message: "额度必须为整数" };
  }
  if (amount <= 0) {
    return { valid: false, code: "INVALID_AMOUNT", message: "额度必须大于 0" };
  }
  if (amount > MAX_AMOUNT_PER_CALL) {
    return { valid: false, code: "INVALID_AMOUNT", message: `单次额度不能超过 ${MAX_AMOUNT_PER_CALL}` };
  }
  return { valid: true };
}

export async function getOrCreateEnterpriseQuotaPool(workspaceId: string): Promise<EnterpriseQuotaPoolInfo | null> {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return null;
  }

  const ownerEntitlements = await getUserEntitlements(workspace.ownerId);
  if (!ENTERPRISE_PLAN_CODES.has(ownerEntitlements.planCode)) {
    return null;
  }

  const isActive = ownerEntitlements.hasActiveMembership || ownerEntitlements.isLegacyActive || ownerEntitlements.isGracePeriod;
  if (!isActive) {
    return null;
  }

  const totalQuota = ownerEntitlements.limits.aiChatsPerMonth.max;
  if (totalQuota <= 0) {
    return null;
  }

  let pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });

  if (!pool) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    pool = await db.enterpriseQuotaPool.create({
      data: {
        workspaceId,
        totalQuota,
        usedQuota: 0,
        periodStart,
        periodEnd,
      },
    });
  }

  return {
    id: pool.id,
    workspaceId: pool.workspaceId,
    totalQuota: pool.totalQuota,
    usedQuota: pool.usedQuota,
    remainingQuota: pool.totalQuota - pool.usedQuota,
    periodStart: pool.periodStart,
    periodEnd: pool.periodEnd,
  };
}

export async function consumeEnterpriseQuota(params: {
  workspaceId: string;
  userId: string;
  amount: number;
  operationId: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<EnterpriseQuotaConsumptionResult> {
  const { workspaceId, userId, amount, operationId, reason, metadata } = params;

  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return { success: false, code: amountValidation.code!, message: amountValidation.message! };
  }

  try {
    return await db.$transaction(async (tx) => {
      const existingConsumption = await tx.enterpriseQuotaConsumption.findUnique({
        where: { operationId },
      });

      if (existingConsumption) {
        if (existingConsumption.status === "succeeded") {
          if (
            existingConsumption.workspaceId !== workspaceId ||
            existingConsumption.userId !== userId ||
            existingConsumption.amount !== amount ||
            existingConsumption.source !== reason
          ) {
            return {
              success: false,
              code: "IDEMPOTENCY_CONFLICT",
              message: "操作 ID 已被其他请求使用",
            };
          }
          const pool = await tx.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
          return {
            success: true,
            consumptionId: existingConsumption.id,
            remainingQuota: pool ? pool.totalQuota - pool.usedQuota : 0,
            totalQuota: pool?.totalQuota ?? 0,
          };
        }
        if (existingConsumption.status === "pending") {
          return {
            success: false,
            code: "OPERATION_ID_EXISTS",
            message: "操作正在处理中，请稍后重试",
          };
        }
        if (existingConsumption.status === "failed") {
          return {
            success: false,
            code: "IDEMPOTENCY_CONFLICT",
            message: "该操作已失败，请使用新的 operationId",
          };
        }
      }

      const member = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      if (!member) {
        return {
          success: false,
          code: "MEMBER_NOT_FOUND",
          message: "您不是该企业的成员",
        };
      }

      if (member.status !== "active") {
        return {
          success: false,
          code: "MEMBER_NOT_ACTIVE",
          message: "您的企业成员状态无效",
        };
      }

      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace || !workspace.isActive) {
        return {
          success: false,
          code: "WORKSPACE_INACTIVE",
          message: "企业工作空间已停用",
        };
      }

      const ownerEntitlements = await getUserEntitlements(workspace.ownerId);
      if (!ENTERPRISE_PLAN_CODES.has(ownerEntitlements.planCode)) {
        return {
          success: false,
          code: "PLAN_NOT_ALLOWED",
          message: "当前套餐不支持企业 AI 额度",
        };
      }

      const isActive = ownerEntitlements.hasActiveMembership || ownerEntitlements.isLegacyActive || ownerEntitlements.isGracePeriod;
      if (!isActive) {
        return {
          success: false,
          code: "PLAN_EXPIRED",
          message: "企业套餐已过期",
        };
      }

      const currentTotalQuota = ownerEntitlements.limits.aiChatsPerMonth.max;
      if (currentTotalQuota <= 0) {
        return {
          success: false,
          code: "PLAN_QUOTA_NOT_CONFIGURED",
          message: "套餐额度未配置",
        };
      }

      let pool = await tx.enterpriseQuotaPool.findUnique({ where: { workspaceId } });

      const now = new Date();
      if (!pool) {
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        pool = await tx.enterpriseQuotaPool.create({
          data: {
            workspaceId,
            totalQuota: currentTotalQuota,
            usedQuota: 0,
            periodStart,
            periodEnd,
          },
        });
      } else if (now > pool.periodEnd) {
        const updateResult = await tx.enterpriseQuotaPool.updateMany({
          where: {
            id: pool.id,
            version: pool.version,
            periodEnd: { lte: now },
          },
          data: {
            usedQuota: 0,
            totalQuota: currentTotalQuota,
            periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
            periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          return {
            success: false,
            code: "CONCURRENT_UPDATE",
            message: "并发更新失败，请重试",
          };
        }

        pool = await tx.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
        if (!pool) {
          return {
            success: false,
            code: "QUOTA_POOL_NOT_FOUND",
            message: "企业额度池不存在",
          };
        }
      } else if (pool.totalQuota !== currentTotalQuota) {
        await tx.enterpriseQuotaPool.updateMany({
          where: { id: pool.id, version: pool.version },
          data: { totalQuota: currentTotalQuota, version: { increment: 1 } },
        });
        pool = await tx.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
        if (!pool) {
          return {
            success: false,
            code: "QUOTA_POOL_NOT_FOUND",
            message: "企业额度池不存在",
          };
        }
      }

      const remaining = pool.totalQuota - pool.usedQuota;
      if (remaining < amount) {
        return {
          success: false,
          code: "INSUFFICIENT_QUOTA",
          message: "企业额度不足",
        };
      }

      const consumption = await tx.enterpriseQuotaConsumption.create({
        data: {
          workspaceId,
          userId,
          operationId,
          amount,
          source: reason,
          status: "pending",
          metadata: metadata ? { ...metadata } as unknown as never : undefined,
        },
      });

      const updateResult = await tx.enterpriseQuotaPool.updateMany({
        where: {
          id: pool.id,
          version: pool.version,
          usedQuota: { lte: pool.totalQuota - amount },
        },
        data: {
          usedQuota: { increment: amount },
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        await tx.enterpriseQuotaConsumption.update({
          where: { id: consumption.id },
          data: { status: "failed", failureReason: "并发扣减失败" },
        });
        return {
          success: false,
          code: "CONCURRENT_UPDATE",
          message: "并发扣减失败，请重试",
        };
      }

      await tx.enterpriseQuotaConsumption.update({
        where: { id: consumption.id },
        data: { status: "succeeded" },
      });

      const updatedPool = await tx.enterpriseQuotaPool.findUnique({ where: { workspaceId } });

      return {
        success: true,
        consumptionId: consumption.id,
        remainingQuota: updatedPool ? updatedPool.totalQuota - updatedPool.usedQuota : 0,
        totalQuota: updatedPool?.totalQuota ?? 0,
      };
    });
  } catch (error) {
    console.error("[enterprise-quota] consumeEnterpriseQuota error:", error);
    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: "额度扣减失败",
    };
  }
}

export async function refundEnterpriseQuota(operationId: string): Promise<boolean> {
  try {
    return await db.$transaction(async (tx) => {
      const consumption = await tx.enterpriseQuotaConsumption.findUnique({
        where: { operationId },
      });

      if (!consumption || consumption.status !== "succeeded") {
        return false;
      }

      const pool = await tx.enterpriseQuotaPool.findUnique({ where: { id: consumption.workspaceId } });
      if (!pool) {
        return false;
      }

      await tx.enterpriseQuotaPool.updateMany({
        where: {
          id: pool.id,
          version: pool.version,
          usedQuota: { gte: consumption.amount },
        },
        data: {
          usedQuota: { decrement: consumption.amount },
          version: { increment: 1 },
        },
      });

      await tx.enterpriseQuotaConsumption.update({
        where: { id: consumption.id },
        data: { status: "failed", failureReason: "已退款" },
      });

      return true;
    });
  } catch (error) {
    console.error("[enterprise-quota] refundEnterpriseQuota error:", error);
    return false;
  }
}

export async function getEnterpriseQuotaOverview(workspaceId: string, viewerUserId: string): Promise<EnterpriseQuotaPoolInfo | null> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: viewerUserId } },
  });

  if (!member || member.status !== "active") {
    return null;
  }

  const pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
  if (!pool) return null;

  return {
    id: pool.id,
    workspaceId: pool.workspaceId,
    totalQuota: pool.totalQuota,
    usedQuota: pool.usedQuota,
    remainingQuota: pool.totalQuota - pool.usedQuota,
    periodStart: pool.periodStart,
    periodEnd: pool.periodEnd,
  };
}

export async function getMemberUsageDetails(workspaceId: string, viewerUserId: string): Promise<MemberUsageDetail[] | null> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: viewerUserId } },
  });

  if (!member || member.status !== "active") {
    return null;
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return null;
  }

  const isOwner = workspace.ownerId === viewerUserId;
  const isAdmin = member.role === "admin";

  if (!isOwner && !isAdmin) {
    return null;
  }

  const pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
  if (!pool) {
    return [];
  }

  const consumptions = await db.enterpriseQuotaConsumption.findMany({
    where: {
      workspaceId,
      createdAt: { gte: pool.periodStart, lte: pool.periodEnd },
    },
    include: { user: { include: { profile: true } } },
  });

  const usageMap = new Map<string, MemberUsageDetail>();

  for (const consumption of consumptions) {
    const userId = consumption.userId;
    if (!usageMap.has(userId)) {
      usageMap.set(userId, {
        userId,
        email: consumption.user.email,
        displayName: consumption.user.profile?.displayName || consumption.user.email.split("@")[0],
        totalAmount: 0,
        succeededCount: 0,
        failedCount: 0,
        pendingCount: 0,
        lastSucceededAt: null,
      });
    }
    const detail = usageMap.get(userId)!;
    if (consumption.status === "succeeded") {
      detail.totalAmount += consumption.amount;
      detail.succeededCount += 1;
      if (!detail.lastSucceededAt || consumption.createdAt > detail.lastSucceededAt) {
        detail.lastSucceededAt = consumption.createdAt;
      }
    } else if (consumption.status === "failed") {
      detail.failedCount += 1;
    } else if (consumption.status === "pending") {
      detail.pendingCount += 1;
    }
  }

  return Array.from(usageMap.values());
}

export async function getUserEnterpriseUsage(workspaceId: string, userId: string): Promise<{ totalAmount: number; callCount: number }> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member || member.status !== "active") {
    return { totalAmount: 0, callCount: 0 };
  }

  const pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
  if (!pool) {
    return { totalAmount: 0, callCount: 0 };
  }

  const result = await db.enterpriseQuotaConsumption.aggregate({
    where: {
      workspaceId,
      userId,
      status: "succeeded",
      createdAt: { gte: pool.periodStart, lte: pool.periodEnd },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    totalAmount: result._sum.amount || 0,
    callCount: result._count.id || 0,
  };
}