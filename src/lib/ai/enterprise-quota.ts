import crypto from "crypto";
import { db } from "@/lib/db";

export type EnterpriseQuotaStatus =
  | "pending"
  | "reserved"
  | "succeeded"
  | "refund_pending"
  | "refunded"
  | "failed";

export type EnterpriseQuotaResult<T = unknown> = {
  success: boolean;
  status: EnterpriseQuotaStatus;
  error?: string;
  data?: T;
};

const VALID_TRANSITIONS: Record<EnterpriseQuotaStatus, EnterpriseQuotaStatus[]> = {
  pending: ["reserved", "failed"],
  reserved: ["succeeded", "refund_pending", "failed"],
  succeeded: ["refund_pending"],
  refund_pending: ["refunded", "failed"],
  refunded: [],
  failed: [],
};

function isValidTransition(from: EnterpriseQuotaStatus, to: EnterpriseQuotaStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function createEnterpriseQuotaIdempotencyKey(): string {
  return `eq:${crypto.randomUUID()}`;
}

export async function reserveEnterpriseQuota(params: {
  workspaceId: string;
  userId: string;
  amount: number;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<EnterpriseQuotaResult<{ quotaId: string; balance: number }>> {
  if (!params.workspaceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.workspaceId)) {
    return { success: false, status: "failed", error: "无效的 workspaceId" };
  }

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.enterpriseQuota.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        select: { id: true, status: true, balanceAfter: true },
      });

      if (existing) {
        const existingStatus = existing.status as EnterpriseQuotaStatus;
        if (existingStatus === "reserved") {
          return { success: true, status: "reserved", data: { quotaId: existing.id, balance: existing.balanceAfter } };
        }
        if (existingStatus === "succeeded") {
          return { success: true, status: "succeeded", data: { quotaId: existing.id, balance: existing.balanceAfter } };
        }
        return { success: false, status: existingStatus, error: `幂等键已存在，当前状态: ${existingStatus}` };
      }

      const workspace = await tx.workspace.findUnique({
        where: { id: params.workspaceId, isActive: true },
        select: { id: true, planCode: true },
      });

      if (!workspace) {
        return { success: false, status: "failed", error: "工作空间不存在或已停用" };
      }

      const member = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: params.workspaceId, userId: params.userId } },
        select: { status: true },
      });

      if (!member || member.status !== "active") {
        return { success: false, status: "failed", error: "您不是该工作空间的有效成员" };
      }

      const account = await tx.enterpriseCreditAccount.upsert({
        where: { workspaceId: params.workspaceId },
        create: { workspaceId: params.workspaceId, balance: 0 },
        update: {},
        select: { id: true, balance: true },
      });

      if (account.balance < params.amount) {
        return { success: false, status: "failed", error: `企业额度不足，当前余额 ${account.balance}` };
      }

      const updated = await tx.enterpriseCreditAccount.updateMany({
        where: { id: account.id, balance: { gte: params.amount } },
        data: { balance: { decrement: params.amount }, version: { increment: 1 } },
      });

      if (updated.count !== 1) {
        return { success: false, status: "failed", error: "额度竞争失败，请重试" };
      }

      const finalAccount = await tx.enterpriseCreditAccount.findUniqueOrThrow({
        where: { id: account.id },
        select: { balance: true },
      });

      const quota = await tx.enterpriseQuota.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          amount: params.amount,
          status: "reserved",
          balanceAfter: finalAccount.balance,
          idempotencyKey: params.idempotencyKey,
          referenceType: params.referenceType ?? "ai_chat",
          referenceId: params.referenceId,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        },
        select: { id: true },
      });

      return { success: true, status: "reserved", data: { quotaId: quota.id, balance: finalAccount.balance } };
    });
  } catch (error) {
    console.error("[enterprise-quota] reserve failed:", error);
    return { success: false, status: "failed", error: "额度预留失败，请稍后重试" };
  }
}

export async function confirmEnterpriseQuota(params: {
  idempotencyKey: string;
  referenceId?: string;
}): Promise<EnterpriseQuotaResult<{ quotaId: string; balance: number }>> {
  try {
    return await db.$transaction(async (tx) => {
      const quota = await tx.enterpriseQuota.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        select: { id: true, status: true, balanceAfter: true },
      });

      if (!quota) {
        return { success: false, status: "failed", error: "额度记录不存在" };
      }

      const quotaStatus = quota.status as EnterpriseQuotaStatus;

      if (quotaStatus === "succeeded") {
        return { success: true, status: "succeeded", data: { quotaId: quota.id, balance: quota.balanceAfter } };
      }

      if (quotaStatus === "refunded" || quotaStatus === "refund_pending") {
        return { success: false, status: quotaStatus, error: `${quotaStatus === "refunded" ? "已退款" : "退款处理中"}，无法重新确认` };
      }

      if (!isValidTransition(quotaStatus, "succeeded")) {
        return { success: false, status: quotaStatus, error: `无法从 ${quotaStatus} 状态确认` };
      }

      const updated = await tx.enterpriseQuota.updateMany({
        where: { id: quota.id, status: quotaStatus },
        data: { status: "succeeded", confirmedAt: new Date() },
      });

      if (updated.count !== 1) {
        const current = await tx.enterpriseQuota.findUnique({
          where: { id: quota.id },
          select: { status: true },
        });
        return { success: false, status: (current?.status as EnterpriseQuotaStatus) ?? "failed", error: "状态已变更，确认失败" };
      }

      return { success: true, status: "succeeded", data: { quotaId: quota.id, balance: quota.balanceAfter } };
    });
  } catch (error) {
    console.error("[enterprise-quota] confirm failed:", error);
    return { success: false, status: "failed", error: "确认失败，请稍后重试" };
  }
}

export async function refundEnterpriseQuota(params: {
  idempotencyKey: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<EnterpriseQuotaResult<{ quotaId: string; balance: number }>> {
  try {
    return await db.$transaction(async (tx) => {
      const quota = await tx.enterpriseQuota.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        select: { id: true, status: true, amount: true, balanceAfter: true, workspaceId: true },
      });

      if (!quota) {
        return { success: false, status: "failed", error: "额度记录不存在" };
      }

      const quotaStatus = quota.status as EnterpriseQuotaStatus;

      if (quotaStatus === "refunded") {
        return { success: true, status: "refunded", data: { quotaId: quota.id, balance: quota.balanceAfter + quota.amount } };
      }

      if (quotaStatus === "failed" || quotaStatus === "pending") {
        return { success: false, status: quotaStatus, error: `当前状态 ${quotaStatus}，无需退款` };
      }

      if (!isValidTransition(quotaStatus, "refund_pending")) {
        return { success: false, status: quotaStatus, error: `无法从 ${quotaStatus} 状态发起退款` };
      }

      const pendingUpdated = await tx.enterpriseQuota.updateMany({
        where: { id: quota.id, status: quotaStatus },
        data: { status: "refund_pending", refundReason: params.reason },
      });

      if (pendingUpdated.count !== 1) {
        const current = await tx.enterpriseQuota.findUnique({
          where: { id: quota.id },
          select: { status: true },
        });
        return { success: false, status: (current?.status as EnterpriseQuotaStatus) ?? "failed", error: "状态已变更，退款失败" };
      }

      const account = await tx.enterpriseCreditAccount.findUnique({
        where: { workspaceId: quota.workspaceId },
        select: { id: true },
      });

      if (!account) {
        return { success: false, status: "refund_pending", error: "企业账户不存在，退款暂挂" };
      }

      const updatedAccount = await tx.enterpriseCreditAccount.update({
        where: { id: account.id },
        data: { balance: { increment: quota.amount }, version: { increment: 1 } },
        select: { balance: true },
      });

      const finalUpdated = await tx.enterpriseQuota.updateMany({
        where: { id: quota.id, status: "refund_pending" },
        data: { status: "refunded", balanceAfter: updatedAccount.balance, refundedAt: new Date() },
      });

      if (finalUpdated.count !== 1) {
        return { success: false, status: "refund_pending", error: "退款状态更新失败，请联系管理员" };
      }

      return { success: true, status: "refunded", data: { quotaId: quota.id, balance: updatedAccount.balance } };
    });
  } catch (error) {
    console.error("[enterprise-quota] refund failed:", error);
    await db.enterpriseQuota.updateMany({
      where: { idempotencyKey: params.idempotencyKey, status: "reserved" },
      data: { status: "refund_pending", refundReason: params.reason },
    }).catch(() => {});

    return { success: false, status: "refund_pending", error: "退款处理中，请稍后查看" };
  }
}

export async function getEnterpriseQuotaByIdempotencyKey(idempotencyKey: string): Promise<EnterpriseQuotaResult<{
  quotaId: string;
  status: EnterpriseQuotaStatus;
  amount: number;
  balanceAfter: number;
}>> {
  try {
    const quota = await db.enterpriseQuota.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, amount: true, balanceAfter: true },
    });

    if (!quota) {
      return { success: false, status: "failed", error: "额度记录不存在" };
    }

    const quotaStatus = quota.status as EnterpriseQuotaStatus;

    return {
      success: true,
      status: quotaStatus,
      data: {
        quotaId: quota.id,
        status: quotaStatus,
        amount: quota.amount,
        balanceAfter: quota.balanceAfter,
      },
    };
  } catch (error) {
    console.error("[enterprise-quota] get by idempotency key failed:", error);
    return { success: false, status: "failed", error: "查询失败" };
  }
}

export async function getEnterpriseCreditBalance(workspaceId: string): Promise<{ balance: number; exists: boolean }> {
  try {
    const account = await db.enterpriseCreditAccount.findUnique({
      where: { workspaceId },
      select: { balance: true },
    });

    return { balance: account?.balance ?? 0, exists: !!account };
  } catch (error) {
    console.error("[enterprise-quota] get balance failed:", error);
    return { balance: 0, exists: false };
  }
}