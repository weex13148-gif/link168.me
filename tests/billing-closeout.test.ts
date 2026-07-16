import { normalizePlanCode, isUniqueConstraintError, PLAN_ORDER, PUBLIC_PLAN_ORDER } from "@/lib/billing/plans";
import { processPaymentSuccess, processRefund, ORDER_STATUS } from "@/lib/billing/orders";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { Prisma } from "@/generated/prisma/client";

// ============================================
// Mock Prisma db
// ============================================

type MockTx = {
  order: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  membershipSubscription: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
  };
  aiCreditAccount: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  aiCreditLedger: {
    create: jest.Mock;
    aggregate: jest.Mock;
  };
  orderLog: {
    create: jest.Mock;
  };
  profile: {
      findUnique: jest.Mock;
    };
    link: {
      count: jest.Mock;
    };
    knowledgeDocument: {
      count: jest.Mock;
    };
    product: {
      count: jest.Mock;
    };
    knowledgeDoc: {
      count: jest.Mock;
    };
};

type MockDb = MockTx & {
  $transaction: jest.Mock;
};

jest.mock("@/lib/db", () => {
  const tx: MockTx = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    membershipSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    aiCreditAccount: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aiCreditLedger: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    orderLog: {
      create: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
    link: {
      count: jest.fn(),
    },
    knowledgeDocument: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    knowledgeDoc: {
      count: jest.fn(),
    },
  };
  const mock: MockDb = {
    ...tx,
    $transaction: jest.fn(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx)),
  };
  return { db: mock };
});

jest.mock("@/lib/billing/membership", () => ({
  activateMembershipFromOrder: jest.fn(async () => ({ success: true })),
}));

jest.mock("@/lib/billing/webhooks", () => ({
  sendOrderPaidWebhook: jest.fn(async () => {}),
}));

import { db } from "@/lib/db";

const mockDb = db as unknown as MockDb;

function makeMockTx(): MockTx {
  return {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    membershipSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    aiCreditAccount: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aiCreditLedger: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    orderLog: {
      create: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
    link: {
      count: jest.fn(),
    },
    knowledgeDocument: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    knowledgeDoc: {
      count: jest.fn(),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================
// 1. Plan code normalization
// ============================================

describe("normalizePlanCode", () => {
  test("canonical codes pass through", () => {
    expect(normalizePlanCode("free")).toBe("free");
    expect(normalizePlanCode("plus")).toBe("plus");
    expect(normalizePlanCode("pro")).toBe("pro");
    expect(normalizePlanCode("enterprise")).toBe("enterprise");
    expect(normalizePlanCode("enterprise_pro")).toBe("enterprise_pro");
    expect(normalizePlanCode("internal_test")).toBe("internal_test");
  });

  test("legacy aliases map to canonical codes", () => {
    expect(normalizePlanCode("member_basic")).toBe("plus");
    expect(normalizePlanCode("member_plus")).toBe("plus");
    expect(normalizePlanCode("enterprise_pro_plus")).toBe("enterprise_pro");
  });

  test("unknown codes fall back to free", () => {
    expect(normalizePlanCode("unknown")).toBe("free");
    expect(normalizePlanCode("")).toBe("free");
    expect(normalizePlanCode(null)).toBe("free");
    expect(normalizePlanCode(undefined)).toBe("free");
  });
});

describe("PLAN_ORDER uses canonical codes", () => {
  test("PLAN_ORDER contains plus and not legacy aliases", () => {
    expect(PLAN_ORDER).toContain("plus");
    expect(PLAN_ORDER).toContain("pro");
    expect(PLAN_ORDER).toContain("enterprise");
    expect(PLAN_ORDER).toContain("enterprise_pro");
    expect(PLAN_ORDER).not.toContain("member_basic");
    expect(PLAN_ORDER).not.toContain("member_plus");
    expect(PLAN_ORDER).not.toContain("enterprise_pro_plus");
  });

  test("PUBLIC_PLAN_ORDER contains plus and not legacy aliases", () => {
    expect(PUBLIC_PLAN_ORDER).toContain("plus");
    expect(PUBLIC_PLAN_ORDER).toContain("pro");
    expect(PUBLIC_PLAN_ORDER).toContain("enterprise");
    expect(PUBLIC_PLAN_ORDER).toContain("enterprise_pro");
    expect(PUBLIC_PLAN_ORDER).not.toContain("member_basic");
    expect(PUBLIC_PLAN_ORDER).not.toContain("member_plus");
    expect(PUBLIC_PLAN_ORDER).not.toContain("enterprise_pro_plus");
  });
});

// ============================================
// 2. Plus entitlements
// ============================================

describe("getUserEntitlements - plus plan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("subscription with plus returns plus entitlements", async () => {
    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      planCode: "plus",
      status: "active",
      currentPeriodStart: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2027-01-01"),
      updatedAt: new Date(),
    });

    mockDb.profile.findUnique.mockResolvedValue({ id: "prof-1", userId: "user-1" });
    mockDb.link.count.mockResolvedValue(5);
    mockDb.knowledgeDocument.count.mockResolvedValue(3);
    mockDb.aiCreditLedger.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    const entitlements = await getUserEntitlements("user-1");
    expect(entitlements.planCode).toBe("plus");
    expect(entitlements.plan.code).toBe("plus");
    expect(entitlements.hasActiveMembership).toBe(true);
    expect(entitlements.features.aiEnabled).toBe(true);
    expect(entitlements.limits.aiChatsPerMonth.max).toBe(300);
  });

  test("legacy member_basic subscription normalizes to plus", async () => {
    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      planCode: "member_basic",
      status: "active",
      currentPeriodStart: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2027-01-01"),
      updatedAt: new Date(),
    });

    mockDb.profile.findUnique.mockResolvedValue({ id: "prof-1", userId: "user-1" });
    mockDb.link.count.mockResolvedValue(5);
    mockDb.knowledgeDocument.count.mockResolvedValue(3);
    mockDb.aiCreditLedger.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    const entitlements = await getUserEntitlements("user-1");
    expect(entitlements.planCode).toBe("plus");
    expect(entitlements.plan.code).toBe("plus");
    expect(entitlements.hasActiveMembership).toBe(true);
  });

  test("legacy member_plus subscription normalizes to plus", async () => {
    mockDb.membershipSubscription.findUnique.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      planCode: "member_plus",
      status: "active",
      currentPeriodStart: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2027-01-01"),
      updatedAt: new Date(),
    });

    mockDb.profile.findUnique.mockResolvedValue({ id: "prof-1", userId: "user-1" });
    mockDb.link.count.mockResolvedValue(5);
    mockDb.knowledgeDocument.count.mockResolvedValue(3);
    mockDb.aiCreditLedger.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    const entitlements = await getUserEntitlements("user-1");
    expect(entitlements.planCode).toBe("plus");
    expect(entitlements.plan.code).toBe("plus");
    expect(entitlements.hasActiveMembership).toBe(true);
  });
});

// ============================================
// 3. Credits atomic rollback
// ============================================

describe("processPaymentSuccess - credits atomicity", () => {
  test("ledger non-unique error triggers transaction rollback", async () => {
    const order = {
      id: "order-1",
      userId: "user-1",
      planCode: "plus",
      planNameSnapshot: "Plus",
      billingCycle: "yearly",
      orderNo: "LNK20260101000001",
      payableAmount: 18800,
      status: ORDER_STATUS.PROCESSING,
      providerTradeNo: null,
      paidAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.order.findUnique.mockResolvedValue(order);

    const tx = makeMockTx();
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.order.findUnique.mockResolvedValue(order);
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: ORDER_STATUS.PAID, providerTradeNo: "TRADE001" });
    tx.membershipSubscription.findUnique.mockResolvedValue(null);
    tx.aiCreditAccount.upsert.mockResolvedValue({ id: "acct-1", balance: 300, version: 1 });

    // Simulate a non-unique-key error on ledger create
    const dbError = new Prisma.PrismaClientKnownRequestError("Database error", {
      code: "P2010",
      clientVersion: "5.0.0",
    });
    tx.aiCreditLedger.create.mockRejectedValue(dbError);

    mockDb.$transaction.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => {
      return fn(tx);
    });

    const result = await processPaymentSuccess({
      orderId: "order-1",
      providerTradeNo: "TRADE001",
      paidAt: new Date(),
      metadata: {},
    } as any);

    // Non-unique ledger error should cause the transaction to fail and roll back
    expect(result.success).toBe(false);
    expect(result.error).toContain("Database error");
    expect(tx.aiCreditLedger.create).toHaveBeenCalled();
  });

  test("ledger unique conflict on idempotency_key is idempotent", async () => {
    const order = {
      id: "order-1",
      userId: "user-1",
      planCode: "plus",
      planNameSnapshot: "Plus",
      billingCycle: "yearly",
      orderNo: "LNK20260101000001",
      payableAmount: 18800,
      status: ORDER_STATUS.PROCESSING,
      providerTradeNo: null,
      paidAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.order.findUnique.mockResolvedValue(order);

    const tx = makeMockTx();
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.order.findUnique.mockResolvedValue(order);
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: ORDER_STATUS.PAID, providerTradeNo: "TRADE001" });
    tx.membershipSubscription.findUnique.mockResolvedValue(null);
    tx.aiCreditAccount.upsert.mockResolvedValue({ id: "acct-1", balance: 300, version: 1 });

    const uniqueError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
      meta: { target: ["idempotency_key"] },
    });
    tx.aiCreditLedger.create.mockRejectedValue(uniqueError);

    mockDb.$transaction.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => {
      return fn(tx);
    });

    const result = await processPaymentSuccess({
      orderId: "order-1",
      providerTradeNo: "TRADE001",
      paidAt: new Date(),
      metadata: {},
    } as any);

    expect(result.success).toBe(true);
    expect(tx.aiCreditLedger.create).toHaveBeenCalled();
  });
});

// ============================================
// 4. Refund old order does not affect new membership
// ============================================

describe("processRefund - legacy local refund is disabled", () => {
  test("legacy path cannot update an order or membership without provider confirmation", async () => {
    const result = await processRefund({
      orderId: "order-legacy",
      reason: "test refund",
      refundedBy: "admin-1",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("LEGACY_REFUND_DISABLED");
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
});

// ============================================
// 5. Duplicate callback idempotency
// ============================================

describe("processPaymentSuccess - duplicate callback idempotency", () => {
  test("duplicate providerTradeNo returns existing paid order without side effects", async () => {
    const order = {
      id: "order-1",
      userId: "user-1",
      planCode: "plus",
      planNameSnapshot: "Plus",
      billingCycle: "yearly",
      orderNo: "LNK20260101000001",
      payableAmount: 18800,
      status: ORDER_STATUS.PAID,
      providerTradeNo: "TRADE001",
      paidAt: new Date("2026-01-01"),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.order.findUnique.mockResolvedValue(order);

    const result = await processPaymentSuccess({
      orderId: "order-1",
      providerTradeNo: "TRADE001",
      paidAt: new Date(),
      metadata: {},
    } as any);

    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.order?.status).toBe(ORDER_STATUS.PAID);
    // Should NOT enter the transaction at all
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
});

// ============================================
// 6. isUniqueConstraintError helper
// ============================================

describe("isUniqueConstraintError", () => {
  test("returns true for P2002 with matching field", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
      meta: { target: ["idempotency_key"] },
    });
    expect(isUniqueConstraintError(error, "idempotency_key")).toBe(true);
  });

  test("returns false for P2002 with non-matching field", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
      meta: { target: ["order_no"] },
    });
    expect(isUniqueConstraintError(error, "idempotency_key")).toBe(false);
  });

  test("returns false for non-P2002 errors", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    expect(isUniqueConstraintError(error, "idempotency_key")).toBe(false);
  });

  test("returns false for plain Error", () => {
    expect(isUniqueConstraintError(new Error("boom"), "idempotency_key")).toBe(false);
  });
});
