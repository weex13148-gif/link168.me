/**
 * 安全收口测试：Jeepwork 权限、配置加密密钥、Cookie 安全、企业 Host 校验
 */

// ============================================
// Mock Prisma db
// ============================================
jest.mock("@/lib/db", () => {
  const mock = {
    session: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    freezeRecord: {
      findMany: jest.fn(),
    },
    appConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(async (ops: any[]) => {
      for (const op of ops) await op;
    }),
  };
  return { db: mock };
});

// Mock next/headers cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { db } from "@/lib/db";
import { cookies } from "next/headers";

const mockDb = db as unknown as {
  session: { findFirst: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
  user: { findUnique: jest.Mock; count: jest.Mock };
  freezeRecord: { findMany: jest.Mock };
  appConfig: { findMany: jest.Mock; upsert: jest.Mock };
  $transaction: jest.Mock;
};

const mockCookies = cookies as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.freezeRecord.findMany.mockResolvedValue([]);
});

// ============================================
// 1. Jeepwork 权限：仅允许符合账号能力规则的 super_admin
// ============================================

describe("Jeepwork auth - super_admin only", () => {
  const superAdminUser = {
    id: "u1",
    email: "super@example.com",
    role: "super_admin",
    emailVerified: true,
    accountStatus: "active",
  };
  const adminUser = {
    id: "u2",
    email: "admin@example.com",
    role: "admin",
    emailVerified: true,
    accountStatus: "active",
  };

  test("getJeepworkSessionUser returns eligible super_admin user", async () => {
    const { getJeepworkSessionUser } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: superAdminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    const user = await getJeepworkSessionUser(req);
    expect(user).not.toBeNull();
    expect(user?.role).toBe("super_admin");
  });

  test("getJeepworkSessionUser returns null for admin user", async () => {
    const { getJeepworkSessionUser } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: adminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    const user = await getJeepworkSessionUser(req);
    expect(user).toBeNull();
  });

  test("getJeepworkSessionUser returns null for unverified super_admin", async () => {
    const { getJeepworkSessionUser } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: { ...superAdminUser, emailVerified: false },
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    expect(await getJeepworkSessionUser(req)).toBeNull();
  });

  test("getJeepworkSessionUser returns null for deactivated super_admin", async () => {
    const { getJeepworkSessionUser } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: { ...superAdminUser, accountStatus: "deactivated" },
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    expect(await getJeepworkSessionUser(req)).toBeNull();
  });

  test("getJeepworkSessionUser returns null for frozen super_admin", async () => {
    const { getJeepworkSessionUser } = await import("@/lib/jeepwork-auth");
    mockDb.freezeRecord.findMany.mockResolvedValue([
      { type: "ADMIN_FREEZE", reason: "manual freeze", expiresAt: null },
    ]);
    mockDb.session.findFirst.mockResolvedValue({
      user: superAdminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    expect(await getJeepworkSessionUser(req)).toBeNull();
  });

  test("requireJeepworkAdmin returns 401 for admin user (token rejected at session level)", async () => {
    const { requireJeepworkAdmin } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: adminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    const res = await requireJeepworkAdmin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  test("requireJeepworkAdmin returns null for eligible super_admin user", async () => {
    const { requireJeepworkAdmin } = await import("@/lib/jeepwork-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: superAdminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    const res = await requireJeepworkAdmin(req);
    expect(res).toBeNull();
  });

  test("requireAdmin (admin-auth) returns 401 for admin user (token rejected at session level)", async () => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    mockDb.session.findFirst.mockResolvedValue({
      user: adminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const req = new Request("http://localhost", {
      headers: { cookie: "link168_admin_session=validtoken" },
    });
    const res = await requireAdmin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  test("jeepworkPageAdminOnly returns null for admin cookie", async () => {
    const { jeepworkPageAdminOnly } = await import("@/lib/jeepwork-auth");
    mockCookies.mockResolvedValue({
      get: () => ({ value: "token" }),
    });
    mockDb.session.findFirst.mockResolvedValue({
      user: adminUser,
      expiresAt: new Date(Date.now() + 10000),
    });

    const user = await jeepworkPageAdminOnly();
    expect(user).toBeNull();
  });

  test("jeepworkLoginHandler rejects admin credentials", async () => {
    process.env.DATABASE_URL = "postgres://localhost/test";
    const { jeepworkLoginHandler } = await import("@/lib/jeepwork-auth");
    mockDb.user.findUnique.mockResolvedValue({
      id: "u2",
      email: "admin@example.com",
      passwordHash: "$2b$12$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu",
      role: "admin",
      emailVerified: true,
      accountStatus: "active",
    });

    const req = new Request("http://localhost");
    const res = await jeepworkLoginHandler(req, "admin@example.com", "password123");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
