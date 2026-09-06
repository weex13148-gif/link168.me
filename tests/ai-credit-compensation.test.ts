const account = {
  id: "account-user-1",
  userId: "user-1",
  balance: 10,
  version: 3,
};

const mockTx = {
  aiCreditAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aiCreditLedger: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  aiCreditBucket: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockDb = {
  membershipSubscription: { findUnique: jest.fn() },
  product: { count: jest.fn() },
  knowledgeDoc: { count: jest.fn() },
  aiCreditAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  aiCreditLedger: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock("@/lib/db", () => ({ db: mockDb }));

import {
  consumeCredit,
  refundConsumedCredit,
} from "@/lib/ai/permissions";
import { getUserEntitlements } from "@/lib/billing/entitlements";

function originalConsume(
  source: "plan" | "credit",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `consume-${source}`,
    accountId: account.id,
    entryType: "consume",
    amount: -1,
    metadata: {
      creditSource: source,
      operationKey: `operation-${source}`,
    },
    ...overrides,
  };
}

function arrangeRefundLookup(
  consume: ReturnType<typeof originalConsume> | null,
  existingRefund: Record<string, unknown> | null = null,
) {
  mockTx.aiCreditLedger.findUnique.mockImplementation(
    ({ where }: { where: { idempotencyKey: string } }) => {
      if (where.idempotencyKey.startsWith("refund:")) {
        return Promise.resolve(existingRefund);
      }
      return Promise.resolve(consume);
    },
  );
}

describe("AI source-aware compensation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      planCode: "plus",
      status: "active",
      currentPeriodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    mockDb.product.count.mockResolvedValue(0);
    mockDb.knowledgeDoc.count.mockResolvedValue(0);
    mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
    mockDb.aiCreditAccount.create.mockResolvedValue(account);
    mockDb.aiCreditLedger.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockDb.aiCreditLedger.findMany.mockResolvedValue([]);
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx),
    );

    mockTx.aiCreditAccount.findUnique.mockResolvedValue(account);
    mockTx.aiCreditAccount.update.mockResolvedValue({
      ...account,
      balance: 10,
      version: 4,
    });
    mockTx.aiCreditLedger.findUnique.mockResolvedValue(null);
    mockTx.aiCreditLedger.create.mockResolvedValue({ id: "ledger-created" });
    mockTx.aiCreditBucket.findMany.mockResolvedValue([]);
    mockTx.aiCreditBucket.updateMany.mockResolvedValue({ count: 1 });
    mockTx.aiCreditBucket.create.mockResolvedValue({ id: "bucket-created" });
  });

  test("consumeCredit returns a bound operation key and records the plan source", async () => {
    const result = await consumeCredit(
      "user-1",
      1,
      "ai_message",
      "conversation-1",
      { profileId: "profile-1", conversationId: "conversation-1" },
      "request-1",
    );

    expect(result).toMatchObject({
      success: true,
      source: "plan",
      balanceAfter: 10,
      operationKey: "user-1:profile-1:conversation-1:request-1",
    });
    expect(mockTx.aiCreditAccount.update).not.toHaveBeenCalled();
    expect(mockTx.aiCreditLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "consume",
          idempotencyKey: "user-1:profile-1:conversation-1:request-1",
          metadata: expect.objectContaining({
            creditSource: "plan",
            operationKey: "user-1:profile-1:conversation-1:request-1",
          }),
        }),
      }),
    );
  });

  test("an idempotent retry returns the original consume after quota is exhausted", async () => {
    const operationKey = "user-1:profile-1:conversation-1:request-1";
    mockDb.aiCreditAccount.findUnique.mockResolvedValue({ ...account, balance: 0 });
    mockDb.aiCreditLedger.findMany.mockResolvedValue([
      { amount: -300, metadata: { creditSource: "plan" } },
    ]);
    mockDb.aiCreditLedger.findUnique.mockResolvedValue({
      id: "consume-plan",
      accountId: account.id,
      balanceAfter: 0,
      entryType: "consume",
      idempotencyKey: operationKey,
      metadata: { creditSource: "plan", operationKey },
    });

    const result = await consumeCredit(
      "user-1",
      1,
      "ai_message",
      "conversation-1",
      { profileId: "profile-1", conversationId: "conversation-1" },
      "request-1",
    );

    expect(result).toEqual({
      success: true,
      source: "plan",
      balanceAfter: 0,
      operationKey,
    });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  test("plan consumption compensation offsets usage without increasing Credit", async () => {
    arrangeRefundLookup(originalConsume("plan"));

    const result = await refundConsumedCredit({
      userId: "user-1",
      operationKey: "operation-plan",
      reason: "provider failed",
      metadata: { traceId: "trace-plan" },
    });

    expect(result).toMatchObject({
      success: true,
      source: "plan",
      balanceAfter: 10,
      alreadyApplied: false,
    });
    expect(mockTx.aiCreditAccount.update).not.toHaveBeenCalled();
    expect(mockTx.aiCreditLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "refund",
          amount: 1,
          balanceAfter: 10,
          idempotencyKey: "refund:operation-plan",
          metadata: expect.objectContaining({
            creditSource: "plan",
            reversesOperationKey: "operation-plan",
            reversesLedgerId: "consume-plan",
          }),
        }),
      }),
    );
  });

  test("credit consumption compensation restores exactly the deducted Credit", async () => {
    mockDb.aiCreditAccount.findUnique.mockResolvedValue({ ...account, balance: 9 });
    mockTx.aiCreditAccount.findUnique.mockResolvedValue({ ...account, balance: 9 });
    arrangeRefundLookup(originalConsume("credit"));

    const result = await refundConsumedCredit({
      userId: "user-1",
      operationKey: "operation-credit",
      reason: "provider failed",
    });

    expect(result).toMatchObject({
      success: true,
      source: "credit",
      balanceAfter: 10,
      alreadyApplied: false,
    });
    expect(mockTx.aiCreditAccount.update).toHaveBeenCalledTimes(1);
    expect(mockTx.aiCreditAccount.update).toHaveBeenCalledWith({
      where: { id: account.id, version: account.version },
      data: { balance: 10, version: { increment: 1 } },
    });
  });

  test("repeated compensation is idempotent", async () => {
    arrangeRefundLookup(null, {
      id: "refund-ledger",
      accountId: account.id,
      balanceAfter: 10,
      entryType: "refund",
      metadata: { creditSource: "plan" },
    });

    const result = await refundConsumedCredit({
      userId: "user-1",
      operationKey: "operation-plan",
      reason: "retry",
    });

    expect(result).toMatchObject({
      success: true,
      source: "plan",
      balanceAfter: 10,
      alreadyApplied: true,
    });
    expect(mockTx.aiCreditAccount.findUnique).not.toHaveBeenCalled();
    expect(mockTx.aiCreditAccount.update).not.toHaveBeenCalled();
    expect(mockTx.aiCreditLedger.create).not.toHaveBeenCalled();
  });

  test("a malformed existing refund is not reported as successful", async () => {
    arrangeRefundLookup(null, {
      id: "refund-ledger",
      accountId: account.id,
      balanceAfter: 10,
      entryType: "refund",
      metadata: {},
    });

    const result = await refundConsumedCredit({
      userId: "user-1",
      operationKey: "operation-plan",
      reason: "retry",
    });

    expect(result).toEqual({
      success: false,
      reason: "退款流水缺少额度来源",
    });
    expect(mockTx.aiCreditAccount.update).not.toHaveBeenCalled();
    expect(mockTx.aiCreditLedger.create).not.toHaveBeenCalled();
  });

  test.each([
    ["missing", null],
    ["foreign", originalConsume("credit", { accountId: "account-user-2" })],
  ])("%s original consumption is rejected", async (_label, consume) => {
    arrangeRefundLookup(consume);

    const result = await refundConsumedCredit({
      userId: "user-1",
      operationKey: "operation-credit",
      reason: "invalid refund",
    });

    expect(result).toEqual({
      success: false,
      reason: "未找到可退款的原始消费",
    });
    expect(mockTx.aiCreditAccount.update).not.toHaveBeenCalled();
    expect(mockTx.aiCreditLedger.create).not.toHaveBeenCalled();
  });

  test("monthly plan usage includes only net plan-source ledger entries", async () => {
    mockDb.aiCreditLedger.findMany.mockResolvedValue([
      { amount: -3, metadata: { creditSource: "plan" } },
      { amount: 1, metadata: { creditSource: "plan" } },
      { amount: -4, metadata: { creditSource: "credit" } },
      { amount: 1, metadata: { creditSource: "credit" } },
      { amount: -9, metadata: null },
    ]);

    const entitlements = await getUserEntitlements("user-1");

    expect(entitlements.limits.aiChatsPerMonth.used).toBe(2);
    expect(mockDb.aiCreditLedger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: account.id,
          entryType: { in: ["consume", "refund"] },
        }),
      }),
    );
  });

  test("an optimistic-lock conflict is not reported as a successful refund", async () => {
    const conflict = Object.assign(new Error("stale account version"), {
      code: "P2025",
    });
    arrangeRefundLookup(originalConsume("credit"));
    mockTx.aiCreditAccount.update.mockRejectedValue(conflict);

    await expect(
      refundConsumedCredit({
        userId: "user-1",
        operationKey: "operation-credit",
        reason: "provider failed",
      }),
    ).rejects.toBe(conflict);
    expect(mockTx.aiCreditLedger.create).not.toHaveBeenCalled();
  });
});
