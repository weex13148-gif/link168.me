import {
  consumeEnterpriseQuota,
  confirmEnterpriseQuota,
  refundEnterpriseQuota,
  getUserEnterpriseUsage,
} from "@/lib/ai/enterprise-quota";
import * as fs from "fs";
import * as path from "path";

// ============================================
// Mock Prisma db
// ============================================

type MockDb = {
  workspace: { findUnique: jest.Mock };
  workspaceMember: { findUnique: jest.Mock };
  enterpriseQuotaPool: {
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  enterpriseQuotaConsumption: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    aggregate: jest.Mock;
  };
  $transaction: jest.Mock;
};

jest.mock("@/lib/db", () => {
  const mock: MockDb = {
    workspace: { findUnique: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
    enterpriseQuotaPool: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    enterpriseQuotaConsumption: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: MockDb) => Promise<unknown>) => fn(mock)),
  };
  return { db: mock };
});

jest.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: jest.fn(),
}));

import { db } from "@/lib/db";
import { getUserEntitlements } from "@/lib/billing/entitlements";

const mockDb = db as unknown as MockDb;

const mockGetUserEntitlements = getUserEntitlements as jest.Mock;

// ============================================
// Helpers
// ============================================

function makeEntitlements(planCode: string, aiMax: number, active = true) {
  return {
    hasActiveMembership: active,
    isLegacyActive: false,
    isGracePeriod: false,
    gracePeriodDays: 0,
    planCode,
    plan: { name: planCode },
    currentPeriodStart: new Date(2026, 6, 1),
    currentPeriodEnd: new Date(2026, 6, 31, 23, 59, 59, 999),
    daysRemaining: 30,
    features: { aiEnabled: true },
    limits: {
      aiChatsPerMonth: { max: aiMax, used: 0, remaining: aiMax },
      teamSeats: { max: 10 },
    },
  };
}

function makeExpiredEntitlements(planCode: string, aiMax: number) {
  return {
    ...makeEntitlements(planCode, aiMax, false),
    isGracePeriod: false,
    hasActiveMembership: false,
    isLegacyActive: false,
  };
}

const PERIOD_START = new Date(2026, 6, 1);
const PERIOD_END = new Date(2026, 6, 31, 23, 59, 59, 999);

function setupWorkspaceAndMember(workspaceId: string, userId: string, memberStatus = "active") {
  mockDb.workspace.findUnique.mockResolvedValue({
    id: workspaceId,
    isActive: true,
    ownerId: "owner-1",
  });
  mockDb.workspaceMember.findUnique.mockResolvedValue({
    id: "member-1",
    workspaceId,
    userId,
    status: memberStatus,
    role: "member",
  });
}

function setupPool(workspaceId: string, totalQuota: number, usedQuota: number, version = 0) {
  mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
    id: "pool-1",
    workspaceId,
    totalQuota,
    usedQuota,
    version,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockDb));
});

// ============================================
// 1. validateAmount
// ============================================

describe("consumeEnterpriseQuota - amount validation", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  test("负数 amount 被拒绝", async () => {
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: -1, operationId: "op-1", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_AMOUNT");
    }
  });

  test("amount 为 0 被拒绝", async () => {
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 0, operationId: "op-2", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_AMOUNT");
    }
  });

  test("浮点 amount 被拒绝", async () => {
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1.5, operationId: "op-3", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_AMOUNT");
    }
  });

  test("超大 amount 被拒绝", async () => {
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 101, operationId: "op-4", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_AMOUNT");
    }
  });
});

// ============================================
// 2. Plan checks
// ============================================

describe("consumeEnterpriseQuota - plan checks", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    setupWorkspaceAndMember(workspaceId, userId);
    setupPool(workspaceId, 100, 0);
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);
    mockDb.enterpriseQuotaConsumption.create.mockResolvedValue({ id: "c-1" });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});
  });

  test("Plus (member_plus) 不能使用企业额度", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("member_plus", 100));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-plus", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_NOT_ALLOWED");
    }
  });

  test("Pro 不能使用企业额度", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("pro", 100));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-pro", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_NOT_ALLOWED");
    }
  });

  test("free 不能使用企业额度", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("free", 0));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-free", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_NOT_ALLOWED");
    }
  });

  test("enterprise 可以使用企业额度", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", 100));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-ent", reason: "test",
    });
    expect(result.success).toBe(true);
  });

  test("enterprise_pro 可以使用企业额度", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise_pro", 1000));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-epp", reason: "test",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// 3. Plan expiry
// ============================================

describe("consumeEnterpriseQuota - plan expiry", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    setupWorkspaceAndMember(workspaceId, userId);
    setupPool(workspaceId, 100, 0);
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);
  });

  test("套餐过期拒绝", async () => {
    mockGetUserEntitlements.mockResolvedValue(makeExpiredEntitlements("enterprise", 100));
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-expired", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_EXPIRED");
    }
  });
});

// ============================================
// 4. Member status checks
// ============================================

describe("consumeEnterpriseQuota - member status", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", 100));
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId, isActive: true, ownerId: "owner-1",
    });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);
    setupPool(workspaceId, 100, 0);
  });

  test("非成员拒绝", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue(null);
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-non-member", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MEMBER_NOT_FOUND");
    }
  });

  test("disabled 成员拒绝", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "disabled", role: "member",
    });
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-disabled", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MEMBER_NOT_ACTIVE");
    }
  });

  test("removed 成员拒绝", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "removed", role: "member",
    });
    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-removed", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MEMBER_NOT_ACTIVE");
    }
  });
});

// ============================================
// 5. Workspace isolation
// ============================================

describe("consumeEnterpriseQuota - workspace isolation", () => {
  test("多企业用户明确扣指定 Workspace", async () => {
    const wsA = "ws-a";
    const wsB = "ws-b";
    const userId = "user-1";

    // 用户是 ws-a 的成员
    mockDb.workspace.findUnique.mockResolvedValue({ id: wsA, isActive: true, ownerId: "owner-a" });
    mockDb.workspaceMember.findUnique.mockImplementation(async (args) => {
      const { workspaceId, userId: uid } = args.where.workspaceId_userId;
      if (workspaceId === wsA && uid === userId) {
        return { id: "m-a", workspaceId: wsA, userId, status: "active", role: "member" };
      }
      return null;
    });
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", 100));
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);
    setupPool(wsA, 100, 0);
    mockDb.enterpriseQuotaConsumption.create.mockResolvedValue({ id: "c-a" });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    const result = await consumeEnterpriseQuota({
      workspaceId: wsA, userId, amount: 1, operationId: "op-ws-a", reason: "test",
    });
    expect(result.success).toBe(true);
    // Verify workspaceMember was queried with wsA, not wsB
    expect(mockDb.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_userId: { workspaceId: wsA, userId } },
    });
  });

  test("企业 A 不能扣企业 B", async () => {
    const wsA = "ws-a";
    const wsB = "ws-b";
    const userId = "user-1";

    // 用户是 ws-a 的成员，不是 ws-b 的成员
    mockDb.workspace.findUnique.mockResolvedValue({ id: wsB, isActive: true, ownerId: "owner-b" });
    mockDb.workspaceMember.findUnique.mockImplementation(async () => null);
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", 100));
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);

    const result = await consumeEnterpriseQuota({
      workspaceId: wsB, userId, amount: 1, operationId: "op-cross", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MEMBER_NOT_FOUND");
    }
  });

  test("Workspace 停用拒绝", async () => {
    const workspaceId = "ws-inactive";
    const userId = "user-1";

    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: false, ownerId: "owner-1" });
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "active", role: "member",
    });
    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", 100));
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);

    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-inactive-ws", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("WORKSPACE_INACTIVE");
    }
  });
});

// ============================================
// 6. Idempotency
// ============================================

describe("consumeEnterpriseQuota - idempotency", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  test("同一 operationId 只扣一次 (reserved 状态幂等)", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-existing",
      workspaceId,
      userId,
      operationId: "op-dup",
      amount: 1,
      source: "test",
      status: "reserved",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1", workspaceId, totalQuota: 100, usedQuota: 1, version: 1,
      periodStart: PERIOD_START, periodEnd: PERIOD_END,
    });

    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-dup", reason: "test",
    });
    expect(result.success).toBe(true);
    // Should NOT create a new consumption or update the pool
    expect(mockDb.enterpriseQuotaConsumption.create).not.toHaveBeenCalled();
    expect(mockDb.enterpriseQuotaPool.updateMany).not.toHaveBeenCalled();
  });

  test("同一 operationId 只扣一次 (succeeded 状态幂等)", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-existing",
      workspaceId,
      userId,
      operationId: "op-succ",
      amount: 1,
      source: "test",
      status: "succeeded",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1", workspaceId, totalQuota: 100, usedQuota: 1, version: 1,
      periodStart: PERIOD_START, periodEnd: PERIOD_END,
    });

    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-succ", reason: "test",
    });
    expect(result.success).toBe(true);
    expect(mockDb.enterpriseQuotaConsumption.create).not.toHaveBeenCalled();
    expect(mockDb.enterpriseQuotaPool.updateMany).not.toHaveBeenCalled();
  });

  test("同 operationId 不同参数冲突 → IDEMPOTENCY_CONFLICT", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-existing",
      workspaceId,
      userId: "different-user",
      operationId: "op-conflict",
      amount: 1,
      source: "test",
      status: "reserved",
    });

    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-conflict", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });

  test("已退款的 operationId 再次使用被拒绝", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-refunded",
      workspaceId,
      userId,
      operationId: "op-refunded",
      amount: 1,
      source: "test",
      status: "refunded",
    });

    const result = await consumeEnterpriseQuota({
      workspaceId, userId, amount: 1, operationId: "op-refunded", reason: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("IDEMPOTENCY_CONFLICT");
    }
  });
});

// ============================================
// 7. Concurrency (20 concurrent requests)
// ============================================

describe("consumeEnterpriseQuota - concurrency", () => {
  test("20 个并发请求不能透支", async () => {
    const workspaceId = "ws-concurrent";
    const userId = "user-1";
    const totalQuota = 10;
    let currentUsedQuota = 9; // Only 1 remaining
    let currentVersion = 0;

    mockGetUserEntitlements.mockResolvedValue(makeEntitlements("enterprise", totalQuota));
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true, ownerId: "owner-1" });
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "active", role: "member",
    });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);

    // Stateful pool mock: simulates atomic conditional update
    mockDb.enterpriseQuotaPool.findUnique.mockImplementation(async () => ({
      id: "pool-c",
      workspaceId,
      totalQuota,
      usedQuota: currentUsedQuota,
      version: currentVersion,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    }));

    mockDb.enterpriseQuotaPool.updateMany.mockImplementation(async (args: { where: { version: number }; data: { usedQuota: { increment: number } } }) => {
      // Simulate optimistic concurrency control
      if (args.where.version === currentVersion) {
        currentUsedQuota += args.data.usedQuota.increment;
        currentVersion += 1;
        return { count: 1 };
      }
      return { count: 0 };
    });

    mockDb.enterpriseQuotaConsumption.create.mockImplementation(async (args: { data: { operationId: string } }) => ({
      id: `c-${args.data.operationId}`,
    }));
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    const promises = Array.from({ length: 20 }, (_, i) =>
      consumeEnterpriseQuota({
        workspaceId, userId, amount: 1,
        operationId: `op-concurrent-${i}`,
        reason: "test",
      }),
    );
    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(19);
    // currentUsedQuota should be exactly 10 (not more)
    expect(currentUsedQuota).toBe(10);
  });
});

// ============================================
// 8. Refund tests
// ============================================

describe("refundEnterpriseQuota", () => {
  const workspaceId = "ws-1";
  const operationId = "op-refund";

  test("退款查询使用 workspaceId，而不是 pool id", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "reserved",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-uuid-123",
      workspaceId,
      totalQuota: 100,
      usedQuota: 5,
      version: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    await refundEnterpriseQuota(workspaceId, operationId);

    // Verify findUnique was called with { where: { workspaceId } }, NOT { where: { id: consumption.workspaceId } }
    expect(mockDb.enterpriseQuotaPool.findUnique).toHaveBeenCalledWith({
      where: { workspaceId },
    });
    // Verify it was NOT called with the pool's UUID as id
    const call = mockDb.enterpriseQuotaPool.findUnique.mock.calls[0][0];
    expect(call.where).not.toEqual({ id: workspaceId });
  });

  test("退款 updateMany count 为 0 时不标记已退款", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "reserved",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1",
      workspaceId,
      totalQuota: 100,
      usedQuota: 5,
      version: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    // updateMany returns count = 0 (lost race)
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 0 });

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("CONCURRENT_UPDATE");
    }
    // consumption.update IS called (refund_pending then failureReason),
    // but should NOT be called with status "refunded"
    const updateCalls = mockDb.enterpriseQuotaConsumption.update.mock.calls;
    const refundedCall = updateCalls.find((c: any[]) => c[0]?.data?.status === "refunded");
    expect(refundedCall).toBeUndefined();
  });

  test("重复退款不重复增加余额 (已退款状态幂等)", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "refunded",
    });

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("ALREADY_REFUNDED");
    }
    // Should NOT call updateMany (no re-refund)
    expect(mockDb.enterpriseQuotaPool.updateMany).not.toHaveBeenCalled();
    expect(mockDb.enterpriseQuotaConsumption.update).not.toHaveBeenCalled();
  });

  test("reserved 状态可以退款", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "reserved",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1",
      workspaceId,
      totalQuota: 100,
      usedQuota: 5,
      version: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("REFUNDED");
      expect(result.refunded).toBe(true);
    }
    // Verify consumption was marked as "refunded"
    expect(mockDb.enterpriseQuotaConsumption.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { status: "refunded", failureReason: expect.stringContaining("退回") },
    });
  });

  test("succeeded 状态可以退款", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "succeeded",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1",
      workspaceId,
      totalQuota: 100,
      usedQuota: 5,
      version: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("REFUNDED");
      expect(result.refunded).toBe(true);
    }
  });

  test("pending 状态不能退款", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "pending",
    });

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_STATE");
    }
    expect(mockDb.enterpriseQuotaPool.updateMany).not.toHaveBeenCalled();
  });

  test("failed 状态不能退款", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "failed",
    });

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_STATE");
    }
    expect(mockDb.enterpriseQuotaPool.updateMany).not.toHaveBeenCalled();
  });

  test("不存在的 consumption 返回 false", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);

    const result = await refundEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  test("退款使用复合键 (workspaceId, operationId) 查询", async () => {
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      userId: "user-1",
      operationId,
      amount: 1,
      source: "test",
      status: "reserved",
    });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1",
      workspaceId,
      totalQuota: 100,
      usedQuota: 5,
      version: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    mockDb.enterpriseQuotaPool.updateMany.mockResolvedValue({ count: 1 });
    mockDb.enterpriseQuotaConsumption.update.mockResolvedValue({});

    await refundEnterpriseQuota(workspaceId, operationId);

    // Verify findUnique was called with composite key
    expect(mockDb.enterpriseQuotaConsumption.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_operationId: { workspaceId, operationId } },
    });
  });
});

// ============================================
// 9. confirmEnterpriseQuota
// ============================================

describe("confirmEnterpriseQuota", () => {
  const workspaceId = "ws-1";
  const operationId = "op-confirm";

  test("确认 reserved → succeeded", async () => {
    // confirmEnterpriseQuota uses enterpriseQuotaConsumption.updateMany internally
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 1 });

    const result = await confirmEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("CONFIRMED");
    }
    // Verify updateMany was called to transition reserved → succeeded
    expect(mockDb.enterpriseQuotaConsumption.updateMany).toHaveBeenCalledWith({
      where: {
        workspaceId,
        operationId,
        status: "reserved",
      },
      data: { status: "succeeded" },
    });
  });

  test("确认已 succeeded → 幂等成功", async () => {
    // updateMany returns count = 0 (nothing to update), then findUnique shows succeeded
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 0 });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      operationId,
      status: "succeeded",
    });

    const result = await confirmEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.code).toBe("ALREADY_CONFIRMED");
    }
    // Should NOT call update (the old API) — updateMany was called but found 0 rows
    expect(mockDb.enterpriseQuotaConsumption.update).not.toHaveBeenCalled();
  });

  test("确认 refunded → 失败", async () => {
    // updateMany returns count = 0, then findUnique shows refunded
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 0 });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      operationId,
      status: "refunded",
    });

    const result = await confirmEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_STATE");
    }
    expect(mockDb.enterpriseQuotaConsumption.update).not.toHaveBeenCalled();
  });

  test("确认 pending → 失败", async () => {
    // updateMany returns count = 0, then findUnique shows pending
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 0 });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      operationId,
      status: "pending",
    });

    const result = await confirmEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_STATE");
    }
  });

  test("确认不存在的 consumption → false", async () => {
    // updateMany returns count = 0, then findUnique returns null
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 0 });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue(null);

    const result = await confirmEnterpriseQuota(workspaceId, operationId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  test("确认使用复合键查询", async () => {
    // updateMany returns count = 0, then findUnique is called with composite key
    mockDb.enterpriseQuotaConsumption.updateMany.mockResolvedValue({ count: 0 });
    mockDb.enterpriseQuotaConsumption.findUnique.mockResolvedValue({
      id: "c-1",
      workspaceId,
      operationId,
      status: "succeeded",
    });

    await confirmEnterpriseQuota(workspaceId, operationId);

    expect(mockDb.enterpriseQuotaConsumption.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_operationId: { workspaceId, operationId } },
    });
  });
});

// ============================================
// 10. getUserEnterpriseUsage (my-usage)
// ============================================

describe("getUserEnterpriseUsage - permissions", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  test("非成员返回 { allowed: false, code: MEMBER_NOT_FOUND }", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue(null);

    const result = await getUserEnterpriseUsage(workspaceId, userId);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MEMBER_NOT_FOUND");
    }
    // Should NOT query pool or consumptions (no data leak)
    expect(mockDb.enterpriseQuotaPool.findUnique).not.toHaveBeenCalled();
    expect(mockDb.enterpriseQuotaConsumption.aggregate).not.toHaveBeenCalled();
  });

  test("disabled 成员返回 { allowed: false, code: MEMBER_NOT_ACTIVE }", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "disabled", role: "member",
    });

    const result = await getUserEnterpriseUsage(workspaceId, userId);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MEMBER_NOT_ACTIVE");
    }
  });

  test("removed 成员返回 { allowed: false, code: MEMBER_NOT_ACTIVE }", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "removed", role: "member",
    });

    const result = await getUserEnterpriseUsage(workspaceId, userId);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MEMBER_NOT_ACTIVE");
    }
  });

  test("active 成员返回 { allowed: true, ... }", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "active", role: "member",
    });
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true, ownerId: "owner-1" });
    mockDb.enterpriseQuotaPool.findUnique.mockResolvedValue({
      id: "pool-1", workspaceId, totalQuota: 100, usedQuota: 5,
      periodStart: PERIOD_START, periodEnd: PERIOD_END,
    });
    mockDb.enterpriseQuotaConsumption.aggregate.mockResolvedValue({
      _sum: { amount: 3 },
      _count: { id: 3 },
    });

    const result = await getUserEnterpriseUsage(workspaceId, userId);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.totalAmount).toBe(3);
      expect(result.callCount).toBe(3);
    }
  });

  test("Workspace 停用返回 { allowed: false, code: WORKSPACE_INACTIVE }", async () => {
    mockDb.workspaceMember.findUnique.mockResolvedValue({
      id: "m-1", workspaceId, userId, status: "active", role: "member",
    });
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: false, ownerId: "owner-1" });

    const result = await getUserEnterpriseUsage(workspaceId, userId);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("WORKSPACE_INACTIVE");
    }
  });
});

// ============================================
// 11. Migration CHECK constraints
// ============================================

describe("Migration CHECK constraints", () => {
  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260713120100_enterprise_quota",
    "migration.sql",
  );

  let migrationSql: string;

  beforeAll(() => {
    migrationSql = fs.readFileSync(migrationPath, "utf-8");
  });

  test("total_quota >= 0 CHECK 约束存在", () => {
    expect(migrationSql).toMatch(/CHECK\s*\(total_quota\s*>=\s*0\)/i);
  });

  test("used_quota >= 0 CHECK 约束存在", () => {
    expect(migrationSql).toMatch(/CHECK\s*\(used_quota\s*>=\s*0\)/i);
  });

  test("used_quota <= total_quota CHECK 约束存在", () => {
    expect(migrationSql).toMatch(/CHECK\s*\(used_quota\s*<=\s*total_quota\)/i);
  });

  test("amount > 0 CHECK 约束存在", () => {
    expect(migrationSql).toMatch(/CHECK\s*\(amount\s*>\s*0\)/i);
  });

  test("status CHECK 约束包含 pending/reserved/succeeded/failed/refunded", () => {
    expect(migrationSql).toMatch(/status\s+IN\s*\(/i);
    expect(migrationSql).toMatch(/pending/i);
    expect(migrationSql).toMatch(/reserved/i);
    expect(migrationSql).toMatch(/succeeded/i);
    expect(migrationSql).toMatch(/failed/i);
    expect(migrationSql).toMatch(/refunded/i);
  });

  test("复合唯一索引 (workspace_id, operation_id) 存在", () => {
    expect(migrationSql).toMatch(/UNIQUE INDEX.*workspace_id.*operation_id/i);
  });

  test("operation_id 不再是全局 UNIQUE 列约束", () => {
    // The column definition should NOT have UNIQUE on operation_id
    // It should be "operation_id" TEXT NOT NULL (without UNIQUE)
    const columnDef = migrationSql.match(/"operation_id"\s+TEXT\s+NOT\s+NULL(\s+UNIQUE)?/i);
    expect(columnDef).toBeTruthy();
    expect(columnDef![0]).not.toMatch(/UNIQUE/i);
  });
});

// ============================================
// 12. Schema composite unique
// ============================================

describe("Schema composite unique", () => {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let schemaSql: string;

  beforeAll(() => {
    schemaSql = fs.readFileSync(schemaPath, "utf-8");
  });

  test("EnterpriseQuotaConsumption has @@unique([workspaceId, operationId])", () => {
    expect(schemaSql).toMatch(/@@unique\(\[workspaceId,\s*operationId\]\)/);
  });

  test("EnterpriseQuotaConsumption does NOT have operationId @unique", () => {
    // Find the model section
    const modelMatch = schemaSql.match(/model EnterpriseQuotaConsumption \{[\s\S]*?\}/);
    expect(modelMatch).toBeTruthy();
    const modelText = modelMatch![0];
    // operationId should not have @unique
    expect(modelText).not.toMatch(/operationId\s+String\s+@unique/);
  });
});
