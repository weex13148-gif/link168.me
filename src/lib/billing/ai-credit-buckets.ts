import crypto from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getAiCreditAddon } from "./plans";

export const AI_CREDIT_ADDON_PRODUCT_TYPE = "ai_credit_addon";

type OrderLike = {
  id: string;
  userId: string;
  planCode: string;
  productType: string;
  payableAmount: number;
};

export type CreditBucketAllocation = { bucketId: string; amount: number };

export function isAiCreditAddonOrder(order: Pick<OrderLike, "planCode" | "productType">): boolean {
  return order.productType === AI_CREDIT_ADDON_PRODUCT_TYPE && Boolean(getAiCreditAddon(order.planCode));
}

export async function grantAddonCredits(
  tx: Prisma.TransactionClient,
  order: OrderLike,
  grantedAt = new Date(),
): Promise<void> {
  const addon = getAiCreditAddon(order.planCode);
  if (!addon || !isAiCreditAddonOrder(order)) {
    throw new Error("订单不是有效的 AI 点数包");
  }

  const existing = await tx.aiCreditBucket.findUnique({ where: { sourceOrderId: order.id } });
  if (existing) return;

  const expiresAt = new Date(grantedAt);
  expiresAt.setDate(expiresAt.getDate() + addon.validityDays);

  const account = await tx.aiCreditAccount.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, balance: 0, version: 0 },
    update: {},
    select: { id: true },
  });

  await tx.aiCreditBucket.create({
    data: {
      accountId: account.id,
      sourceOrderId: order.id,
      sourceType: "addon",
      grantedAmount: addon.points,
      remainingAmount: addon.points,
      status: "active",
      expiresAt,
    },
  });

  const updated = await tx.aiCreditAccount.update({
    where: { id: account.id },
    data: { balance: { increment: addon.points }, version: { increment: 1 } },
    select: { balance: true },
  });

  await tx.aiCreditLedger.create({
    data: {
      id: crypto.randomUUID(),
      accountId: account.id,
      entryType: "grant",
      amount: addon.points,
      balanceAfter: updated.balance,
      idempotencyKey: `grant:addon-order:${order.id}`,
      referenceType: "addon_order",
      referenceId: order.id,
      reason: `购买 ${addon.name}`,
      metadata: {
        addonCode: addon.code,
        expiresAt: expiresAt.toISOString(),
        productType: AI_CREDIT_ADDON_PRODUCT_TYPE,
      },
    },
  });
}

export async function expireCreditBuckets(userId: string, now = new Date()): Promise<number> {
  const account = await db.aiCreditAccount.findUnique({ where: { userId }, select: { id: true } });
  if (!account) return 0;

  return db.$transaction(async (tx) => {
    const expired = await tx.aiCreditBucket.findMany({
      where: {
        accountId: account.id,
        status: "active",
        remainingAmount: { gt: 0 },
        expiresAt: { lte: now },
      },
      orderBy: { expiresAt: "asc" },
    });

    let expiredPoints = 0;
    for (const bucket of expired) {
      const claimed = await tx.aiCreditBucket.updateMany({
        where: {
          id: bucket.id,
          status: "active",
          remainingAmount: bucket.remainingAmount,
          expiresAt: { lte: now },
        },
        data: { status: "expired", remainingAmount: 0 },
      });
      if (claimed.count !== 1) continue;

      const current = await tx.aiCreditAccount.findUnique({ where: { id: account.id } });
      if (!current) throw new Error("AI 点数账户不存在");
      const deduction = Math.min(current.balance, bucket.remainingAmount);
      const updated = await tx.aiCreditAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: deduction }, version: { increment: 1 } },
        select: { balance: true },
      });

      await tx.aiCreditLedger.create({
        data: {
          id: crypto.randomUUID(),
          accountId: account.id,
          entryType: "expire",
          amount: -deduction,
          balanceAfter: updated.balance,
          idempotencyKey: `expire:addon-bucket:${bucket.id}`,
          referenceType: "credit_bucket",
          referenceId: bucket.id,
          reason: "AI 点数包到期",
          metadata: { sourceOrderId: bucket.sourceOrderId, scheduledExpiry: bucket.expiresAt.toISOString() },
        },
      });
      expiredPoints += deduction;
    }
    return expiredPoints;
  });
}

export async function allocateCreditBuckets(
  tx: Prisma.TransactionClient,
  accountId: string,
  amount: number,
  now = new Date(),
): Promise<CreditBucketAllocation[]> {
  const buckets = await tx.aiCreditBucket.findMany({
    where: {
      accountId,
      status: "active",
      remainingAmount: { gt: 0 },
      expiresAt: { gt: now },
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
  });

  let remaining = amount;
  const allocations: CreditBucketAllocation[] = [];
  for (const bucket of buckets) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, bucket.remainingAmount);
    const updated = await tx.aiCreditBucket.updateMany({
      where: {
        id: bucket.id,
        status: "active",
        expiresAt: { gt: now },
        remainingAmount: { gte: take },
      },
      data: { remainingAmount: { decrement: take } },
    });
    if (updated.count !== 1) throw new Error("AI 点数包并发扣减冲突，请重试");
    allocations.push({ bucketId: bucket.id, amount: take });
    remaining -= take;
  }

  // remaining 部分来自迁移前的永久 Credit 或管理员赠送额度，仍由账户汇总余额扣减。
  return allocations;
}

function readAllocation(value: unknown): CreditBucketAllocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const bucketId = (item as Record<string, unknown>).bucketId;
    const amount = Number((item as Record<string, unknown>).amount);
    return typeof bucketId === "string" && Number.isInteger(amount) && amount > 0
      ? [{ bucketId, amount }]
      : [];
  });
}

export function readCreditBucketAllocations(metadata: unknown): CreditBucketAllocation[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  return readAllocation((metadata as Record<string, unknown>).creditBucketAllocations);
}

export async function restoreCreditBucketAllocations(
  tx: Prisma.TransactionClient,
  accountId: string,
  allocations: CreditBucketAllocation[],
  now = new Date(),
): Promise<void> {
  for (const allocation of allocations) {
    const restored = await tx.aiCreditBucket.updateMany({
      where: {
        id: allocation.bucketId,
        accountId,
        status: "active",
        expiresAt: { gt: now },
      },
      data: { remainingAmount: { increment: allocation.amount } },
    });
    if (restored.count === 1) continue;

    const compensationExpiry = new Date(now);
    compensationExpiry.setDate(compensationExpiry.getDate() + 7);
    await tx.aiCreditBucket.create({
      data: {
        accountId,
        sourceType: "compensation",
        grantedAmount: allocation.amount,
        remainingAmount: allocation.amount,
        status: "active",
        expiresAt: compensationExpiry,
      },
    });
  }
}

export async function assertAddonRefundable(order: OrderLike, refundAmount: number): Promise<string | null> {
  if (!isAiCreditAddonOrder(order)) return null;
  if (refundAmount !== order.payableAmount) return "AI 点数包仅支持整单退款";

  const bucket = await db.aiCreditBucket.findUnique({ where: { sourceOrderId: order.id } });
  if (!bucket) return "未找到该点数包的发放记录";
  if (bucket.status !== "active" || bucket.expiresAt <= new Date()) return "该点数包已到期或不可退款";
  if (bucket.remainingAmount !== bucket.grantedAmount) return "AI 点数包已使用，不能退款";
  return null;
}

export async function reserveAddonCreditsForRefund(order: OrderLike): Promise<string | null> {
  if (!isAiCreditAddonOrder(order)) return null;
  const bucket = await db.aiCreditBucket.findUnique({ where: { sourceOrderId: order.id } });
  if (!bucket) return "未找到该点数包的发放记录";
  const reserved = await db.aiCreditBucket.updateMany({
    where: {
      id: bucket.id,
      status: "active",
      remainingAmount: bucket.grantedAmount,
      expiresAt: { gt: new Date() },
    },
    data: { status: "refund_pending" },
  });
  return reserved.count === 1 ? null : "AI 点数包已使用、已到期或正在处理退款";
}

export async function releaseAddonRefundReservation(order: OrderLike): Promise<void> {
  if (!isAiCreditAddonOrder(order)) return;
  await db.aiCreditBucket.updateMany({
    where: { sourceOrderId: order.id, status: "refund_pending" },
    data: { status: "active" },
  });
}

export async function revokeAddonCredits(
  tx: Prisma.TransactionClient,
  order: OrderLike,
): Promise<void> {
  if (!isAiCreditAddonOrder(order)) return;

  const bucket = await tx.aiCreditBucket.findUnique({ where: { sourceOrderId: order.id } });
  if (!bucket || bucket.status !== "refund_pending" || bucket.remainingAmount !== bucket.grantedAmount) {
    throw new Error("AI 点数包已使用、已到期或无法撤销");
  }

  const claimed = await tx.aiCreditBucket.updateMany({
    where: {
      id: bucket.id,
      status: "refund_pending",
      remainingAmount: bucket.grantedAmount,
    },
    data: { status: "refunded", remainingAmount: 0 },
  });
  if (claimed.count !== 1) throw new Error("AI 点数包退款并发冲突");

  const account = await tx.aiCreditAccount.update({
    where: { id: bucket.accountId },
    data: { balance: { decrement: bucket.grantedAmount }, version: { increment: 1 } },
    select: { balance: true },
  });
  await tx.aiCreditLedger.create({
    data: {
      id: crypto.randomUUID(),
      accountId: bucket.accountId,
      entryType: "adjustment",
      amount: -bucket.grantedAmount,
      balanceAfter: account.balance,
      idempotencyKey: `revoke:addon-order:${order.id}`,
      referenceType: "addon_refund",
      referenceId: order.id,
      reason: "AI 点数包整单退款撤销",
      metadata: { bucketId: bucket.id, productType: AI_CREDIT_ADDON_PRODUCT_TYPE },
    },
  });
}
