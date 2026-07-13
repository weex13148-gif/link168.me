import { db } from "@/lib/db";
import { getUserEntitlements } from "@/lib/billing/entitlements";

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
        | "QUOTA_POOL_NOT_FOUND"
        | "MEMBER_NOT_FOUND"
        | "MEMBER_NOT_ACTIVE"
        | "INSUFFICIENT_QUOTA"
        | "OPERATION_ID_EXISTS"
        | "DUPLICATE_CONSUMPTION"
        | "WORKSPACE_INACTIVE"
        | "PLAN_NOT_ALLOWED"
        | "PLAN_EXPIRED";
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
  callCount: number;
  lastUsageAt: Date | null;
};

export async function getOrCreateEnterpriseQuotaPool(workspaceId: string): Promise<EnterpriseQuotaPoolInfo> {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  let pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });

  if (!pool) {
    const plan = await getUserEntitlements(workspace.ownerId);
    const totalQuota = plan.limits.aiChatsPerMonth.max;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    pool = await db.enterpriseQuotaPool.create({
      data: {
        workspaceId,
        totalQuota: totalQuota > 0 ? totalQuota : 10000,
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

  try {
    const existingConsumption = await db.enterpriseQuotaConsumption.findUnique({
      where: { operationId },
    });

    if (existingConsumption) {
      if (existingConsumption.status === "succeeded") {
        const pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
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
          code: "DUPLICATE_CONSUMPTION",
          message: "该操作已失败，请使用新的 operationId",
        };
      }
    }

    const member = await db.workspaceMember.findUnique({
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

    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || !workspace.isActive) {
      return {
        success: false,
        code: "WORKSPACE_INACTIVE",
        message: "企业工作空间已停用",
      };
    }

    const ownerEntitlements = await getUserEntitlements(workspace.ownerId);
    if (ownerEntitlements.planCode === "free") {
      return {
        success: false,
        code: "PLAN_NOT_ALLOWED",
        message: "免费套餐不支持企业 AI 额度",
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

    const pool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });
    if (!pool) {
      return {
        success: false,
        code: "QUOTA_POOL_NOT_FOUND",
        message: "企业额度池不存在",
      };
    }

    const now = new Date();
    if (now > pool.periodEnd) {
      const newPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      await db.enterpriseQuotaPool.update({
        where: { id: pool.id },
        data: {
          usedQuota: 0,
          periodStart: newPeriodStart,
          periodEnd: newPeriodEnd,
          version: { increment: 1 },
        },
      });

      return consumeEnterpriseQuota({
        workspaceId,
        userId,
        amount,
        operationId,
        reason,
        metadata,
      });
    }

    const remaining = pool.totalQuota - pool.usedQuota;
    if (remaining < amount) {
      return {
        success: false,
        code: "INSUFFICIENT_QUOTA",
        message: "企业额度不足",
      };
    }

    const consumption = await db.enterpriseQuotaConsumption.create({
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

    const updateResult = await db.enterpriseQuotaPool.updateMany({
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
      await db.enterpriseQuotaConsumption.update({
        where: { id: consumption.id },
        data: { status: "failed", failureReason: "并发扣减失败" },
      });
      return {
        success: false,
        code: "INSUFFICIENT_QUOTA",
        message: "并发扣减失败，请重试",
      };
    }

    await db.enterpriseQuotaConsumption.update({
      where: { id: consumption.id },
      data: { status: "succeeded" },
    });

    const updatedPool = await db.enterpriseQuotaPool.findUnique({ where: { workspaceId } });

    return {
      success: true,
      consumptionId: consumption.id,
      remainingQuota: updatedPool ? updatedPool.totalQuota - updatedPool.usedQuota : 0,
      totalQuota: updatedPool?.totalQuota ?? 0,
    };
  } catch (error) {
    console.error("[enterprise-quota] consumeEnterpriseQuota error:", error);
    return {
      success: false,
      code: "INSUFFICIENT_QUOTA",
      message: "额度扣减失败",
    };
  }
}

export async function getEnterpriseQuotaPool(workspaceId: string): Promise<EnterpriseQuotaPoolInfo | null> {
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
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: true, members: { include: { user: true } } },
  });

  if (!workspace) {
    return null;
  }

  const isOwner = workspace.ownerId === viewerUserId;
  const isAdmin = workspace.members.some((m) => m.userId === viewerUserId && m.role === "admin");

  if (!isOwner && !isAdmin) {
    return null;
  }

  const consumptions = await db.enterpriseQuotaConsumption.findMany({
    where: { workspaceId, status: "succeeded" },
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
        callCount: 0,
        lastUsageAt: null,
      });
    }
    const detail = usageMap.get(userId)!;
    detail.totalAmount += consumption.amount;
    detail.callCount += 1;
    if (!detail.lastUsageAt || consumption.createdAt > detail.lastUsageAt) {
      detail.lastUsageAt = consumption.createdAt;
    }
  }

  return Array.from(usageMap.values());
}

export async function getUserEnterpriseUsage(workspaceId: string, userId: string): Promise<{ totalAmount: number; callCount: number }> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member) {
    return { totalAmount: 0, callCount: 0 };
  }

  const result = await db.enterpriseQuotaConsumption.aggregate({
    where: { workspaceId, userId, status: "succeeded" },
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    totalAmount: result._sum.amount || 0,
    callCount: result._count.id || 0,
  };
}