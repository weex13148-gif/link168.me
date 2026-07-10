import crypto from "crypto";
import { db } from "@/lib/db";

export const AI_CHAT_CREDIT_COST = 1;

export type AiCreditBalance = {
  accountId: string;
  balance: number;
  version: number;
};

export type AiCreditMutationResult = {
  success: boolean;
  balance: number;
  ledgerId?: string;
  alreadyApplied?: boolean;
  error?: string;
};

type CreditMetadata = Record<string, string | number | boolean | null>;

function safeMetadata(metadata?: CreditMetadata) {
  return metadata ? JSON.parse(JSON.stringify(metadata)) as Record<string, string | number | boolean | null> : undefined;
}

export function createAiCreditOperationId() {
  return crypto.randomUUID();
}

export async function getAiCreditBalance(userId: string): Promise<AiCreditBalance> {
  const account = await db.aiCreditAccount.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
    select: { id: true, balance: true, version: true },
  });

  return { accountId: account.id, balance: account.balance, version: account.version };
}

/**
 * @deprecated 请使用 permissions.ts 中的 consumeCredit。此函数保留用于向后兼容。
 */
export async function consumeAiCredits(params: {
  userId: string;
  amount?: number;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  metadata?: CreditMetadata;
}): Promise<AiCreditMutationResult> {
  const amount = params.amount ?? AI_CHAT_CREDIT_COST;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { success: false, balance: 0, error: "AI Credits 扣减数量不正确。" };
  }

  const MAX_RETRIES = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.aiCreditLedger.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
          select: { id: true, balanceAfter: true, entryType: true },
        });
        if (existing) {
          if (existing.entryType !== "consume") {
            return { success: false, balance: existing.balanceAfter, error: "AI Credits 幂等键冲突。" };
          }
          return {
            success: true,
            balance: existing.balanceAfter,
            ledgerId: existing.id,
            alreadyApplied: true,
          };
        }

        const account = await tx.aiCreditAccount.upsert({
          where: { userId: params.userId },
          create: { userId: params.userId, balance: 0 },
          update: {},
          select: { id: true, balance: true, version: true },
        });

        const claimed = await tx.aiCreditAccount.updateMany({
          where: { id: account.id, balance: { gte: amount }, version: account.version },
          data: { balance: { decrement: amount }, version: { increment: 1 } },
        });

        if (claimed.count !== 1) {
          return {
            success: false,
            balance: account.balance,
            error: `AI Credits 不足，当前余额 ${account.balance}。`,
          };
        }

        const updated = await tx.aiCreditAccount.findUniqueOrThrow({
          where: { id: account.id },
          select: { balance: true },
        });

        const ledger = await tx.aiCreditLedger.create({
          data: {
            accountId: account.id,
            entryType: "consume",
            amount: -amount,
            balanceAfter: updated.balance,
            idempotencyKey: params.idempotencyKey,
            referenceType: params.referenceType ?? "ai_chat",
            referenceId: params.referenceId,
            reason: params.reason ?? "AI 对话消费",
            metadata: safeMetadata(params.metadata),
          },
          select: { id: true },
        });

        return { success: true, balance: updated.balance, ledgerId: ledger.id };
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  console.error("[ai-credits] 扣减失败 (已重试):", lastError);
  return { success: false, balance: 0, error: "AI Credits 扣减失败，请稍后重试。" };
}

export async function refundAiCredits(params: {
  userId: string;
  amount?: number;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  reason: string;
  metadata?: CreditMetadata;
}): Promise<AiCreditMutationResult> {
  const amount = params.amount ?? AI_CHAT_CREDIT_COST;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { success: false, balance: 0, error: "AI Credits 退回数量不正确。" };
  }

  const MAX_RETRIES = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.aiCreditLedger.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
          select: { id: true, balanceAfter: true, entryType: true },
        });
        if (existing) {
          if (existing.entryType !== "refund") {
            return { success: false, balance: existing.balanceAfter, error: "AI Credits 幂等键冲突。" };
          }
          return {
            success: true,
            balance: existing.balanceAfter,
            ledgerId: existing.id,
            alreadyApplied: true,
          };
        }

        const account = await tx.aiCreditAccount.upsert({
          where: { userId: params.userId },
          create: { userId: params.userId, balance: 0 },
          update: {},
          select: { id: true, version: true },
        });

        const updated = await tx.aiCreditAccount.update({
          where: { id: account.id, version: account.version },
          data: { balance: { increment: amount }, version: { increment: 1 } },
          select: { balance: true },
        });

        const ledger = await tx.aiCreditLedger.create({
          data: {
            accountId: account.id,
            entryType: "refund",
            amount,
            balanceAfter: updated.balance,
            idempotencyKey: params.idempotencyKey,
            referenceType: params.referenceType ?? "ai_chat",
            referenceId: params.referenceId,
            reason: params.reason,
            metadata: safeMetadata(params.metadata),
          },
          select: { id: true },
        });

        return { success: true, balance: updated.balance, ledgerId: ledger.id };
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  console.error("[ai-credits] 退回失败 (已重试):", lastError);
  return { success: false, balance: 0, error: "AI Credits 退回失败，请联系管理员。" };
}

export async function listAiCreditLedger(userId: string, limit = 50) {
  const account = await db.aiCreditAccount.findUnique({
    where: { userId },
    select: {
      id: true,
      balance: true,
      ledger: {
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 100),
        select: {
          id: true,
          entryType: true,
          amount: true,
          balanceAfter: true,
          referenceType: true,
          referenceId: true,
          reason: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    balance: account?.balance ?? 0,
    entries: account?.ledger ?? [],
  };
}
