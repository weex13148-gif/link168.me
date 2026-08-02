const mockDb = {
  aiCreditAccount: { findUnique: jest.fn() },
  aiCreditBucket: { findUnique: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock("@/lib/db", () => ({ db: mockDb }));

import {
  AI_CREDIT_ADDON_PRODUCT_TYPE,
  assertAddonRefundable,
  expireCreditBuckets,
  grantAddonCredits,
  reserveAddonCreditsForRefund,
  revokeAddonCredits,
} from "@/lib/billing/ai-credit-buckets";

function addonOrder() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    planCode: "ai_points_1000",
    productType: AI_CREDIT_ADDON_PRODUCT_TYPE,
    payableAmount: 3900,
  };
}

function transactionMock() {
  return {
    aiCreditAccount: {
      upsert: jest.fn().mockResolvedValue({ id: "account-1" }),
      update: jest.fn().mockResolvedValue({ balance: 1000 }),
      findUnique: jest.fn().mockResolvedValue({ id: "account-1", balance: 1000, version: 0 }),
    },
    aiCreditBucket: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "bucket-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    aiCreditLedger: { create: jest.fn().mockResolvedValue({ id: "ledger-1" }) },
  };
}

describe("AI credit add-on lifecycle", () => {
  beforeEach(() => jest.clearAllMocks());

  test("paid add-on creates one expiring bucket and one grant ledger", async () => {
    const tx = transactionMock();
    const paidAt = new Date("2026-07-22T00:00:00.000Z");

    await grantAddonCredits(tx as never, addonOrder(), paidAt);

    expect(tx.aiCreditBucket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceOrderId: addonOrder().id,
        grantedAmount: 1000,
        remainingAmount: 1000,
        status: "active",
        expiresAt: new Date("2027-07-22T00:00:00.000Z"),
      }),
    });
    expect(tx.aiCreditAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { balance: { increment: 1000 }, version: { increment: 1 } },
    }));
    expect(tx.aiCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 1000, idempotencyKey: `grant:addon-order:${addonOrder().id}` }),
    });
  });

  test("expired bucket is removed from aggregate balance once", async () => {
    const tx = transactionMock();
    const expired = {
      id: "bucket-1",
      accountId: "account-1",
      sourceOrderId: addonOrder().id,
      remainingAmount: 400,
      expiresAt: new Date("2026-07-21T00:00:00.000Z"),
    };
    mockDb.aiCreditAccount.findUnique.mockResolvedValue({ id: "account-1" });
    tx.aiCreditBucket.findMany.mockResolvedValue([expired]);
    tx.aiCreditAccount.findUnique.mockResolvedValue({ id: "account-1", balance: 400, version: 2 });
    tx.aiCreditAccount.update.mockResolvedValue({ balance: 0 });
    mockDb.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(expireCreditBuckets(addonOrder().userId, new Date("2026-07-22T00:00:00.000Z"))).resolves.toBe(400);
    expect(tx.aiCreditBucket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "expired", remainingAmount: 0 },
    }));
    expect(tx.aiCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entryType: "expire", amount: -400, balanceAfter: 0 }),
    });
  });

  test("used add-on cannot be refunded", async () => {
    mockDb.aiCreditBucket.findUnique.mockResolvedValue({
      status: "active",
      grantedAmount: 1000,
      remainingAmount: 999,
      expiresAt: new Date("2027-07-22T00:00:00.000Z"),
    });
    await expect(assertAddonRefundable(addonOrder(), 3900)).resolves.toBe("AI 点数包已使用，不能退款");
  });

  test("unused add-on is reserved before provider refund and revoked after success", async () => {
    const bucket = {
      id: "bucket-1",
      accountId: "account-1",
      status: "active",
      grantedAmount: 1000,
      remainingAmount: 1000,
      expiresAt: new Date("2027-07-22T00:00:00.000Z"),
    };
    mockDb.aiCreditBucket.findUnique.mockResolvedValue(bucket);
    mockDb.aiCreditBucket.updateMany.mockResolvedValue({ count: 1 });
    await expect(reserveAddonCreditsForRefund(addonOrder())).resolves.toBeNull();
    expect(mockDb.aiCreditBucket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "refund_pending" },
    }));

    const tx = transactionMock();
    tx.aiCreditBucket.findUnique.mockResolvedValue({ ...bucket, status: "refund_pending" });
    tx.aiCreditAccount.update.mockResolvedValue({ balance: 0 });
    await revokeAddonCredits(tx as never, addonOrder());
    expect(tx.aiCreditBucket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "refunded", remainingAmount: 0 },
    }));
    expect(tx.aiCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entryType: "adjustment", amount: -1000 }),
    });
  });
});
