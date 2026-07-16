const mockDb = {
  membershipSubscription: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  product: { count: jest.fn().mockResolvedValue(0) },
  knowledgeDoc: { count: jest.fn().mockResolvedValue(0) },
  aiCreditAccount: { findUnique: jest.fn().mockResolvedValue(null) },
  aiCreditLedger: { findMany: jest.fn().mockResolvedValue([]) },
};

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/admin-audit-log", () => ({ writeAdminAuditLog: jest.fn().mockResolvedValue(undefined) }));

import { processMembershipExpiry } from "@/lib/billing/membership-lifecycle";
import { getUserEntitlements } from "@/lib/billing/entitlements";

describe("P0 membership expiry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-07-16T00:00:00.000Z"));
    mockDb.product.count.mockResolvedValue(0);
    mockDb.knowledgeDoc.count.mockResolvedValue(0);
    mockDb.aiCreditAccount.findUnique.mockResolvedValue(null);
  });

  afterEach(() => jest.useRealTimers());

  test("expiry scan includes active and past_due paid subscriptions", async () => {
    mockDb.membershipSubscription.findMany.mockResolvedValue([]);
    await processMembershipExpiry();
    expect(mockDb.membershipSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["active", "past_due"] },
          planCode: { not: "free" },
        }),
      }),
    );
  });

  test("past_due membership is downgraded after grace instead of being skipped forever", async () => {
    mockDb.membershipSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        userId: "user-1",
        planCode: "plus",
        status: "past_due",
        currentPeriodStart: new Date("2025-07-12T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-07-12T00:00:00.000Z"),
      },
    ]);
    mockDb.membershipSubscription.update.mockResolvedValue({ status: "expired" });

    const result = await processMembershipExpiry();

    expect(result.expired).toBe(1);
    expect(mockDb.membershipSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { planCode: "free", status: "expired" },
    });
  });

  test("past_due membership keeps paid entitlements during the three-day grace period", async () => {
    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      id: "sub-2",
      userId: "user-2",
      planCode: "plus",
      status: "past_due",
      currentPeriodStart: new Date("2025-07-14T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-07-14T00:00:00.000Z"),
    });

    const result = await getUserEntitlements("user-2");

    expect(result.planCode).toBe("plus");
    expect(result.isGracePeriod).toBe(true);
    expect(result.features.aiEnabled).toBe(true);
  });

  test("past_due membership loses paid entitlements after grace even before cron persists downgrade", async () => {
    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      id: "sub-3",
      userId: "user-3",
      planCode: "plus",
      status: "past_due",
      currentPeriodStart: new Date("2025-07-10T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-07-10T00:00:00.000Z"),
    });

    const result = await getUserEntitlements("user-3");

    expect(result.planCode).toBe("free");
    expect(result.features.aiEnabled).toBe(false);
  });
});
