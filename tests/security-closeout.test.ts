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
  appConfig: { findMany: jest.Mock; upsert: jest.Mock };
  $transaction: jest.Mock;
};

const mockCookies = cookies as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================
// 1. Jeepwork 权限：仅允许 super_admin
// ============================================

describe("Jeepwork auth - super_admin only", () => {
  const superAdminUser = {
    id: "u1",
    email: "super@example.com",
    role: "super_admin",
  };
  const adminUser = {
    id: "u2",
    email: "admin@example.com",
    role: "admin",
  };

  test("getJeepworkSessionUser returns super_admin user", async () => {
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

  test("requireJeepworkAdmin returns null for super_admin user", async () => {
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
    });

    const req = new Request("http://localhost");
    const res = await jeepworkLoginHandler(req, "admin@example.com", "password123");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

// ============================================
// 2. 敏感配置密钥
// ============================================

describe("Config encryption key security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete (process.env as any).CONFIG_ENCRYPTION_KEY;
    delete (process.env as any).ADMIN_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("production without CONFIG_ENCRYPTION_KEY throws on encrypt", async () => {
    (process.env as any).NODE_ENV = "production";
    const { updateConfig } = await import("@/lib/app-config");
    mockDb.appConfig.findMany.mockResolvedValue([]);
    mockDb.appConfig.upsert.mockResolvedValue({});

    await expect(
      updateConfig({ smtpPassword: "secret123" }),
    ).rejects.toThrow("生产环境必须配置安全且长度不少于 16 字符的 CONFIG_ENCRYPTION_KEY");
  });

  test("production with short CONFIG_ENCRYPTION_KEY throws on encrypt", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.CONFIG_ENCRYPTION_KEY = "short";
    const { updateConfig } = await import("@/lib/app-config");
    mockDb.appConfig.findMany.mockResolvedValue([]);
    mockDb.appConfig.upsert.mockResolvedValue({});

    await expect(
      updateConfig({ smtpPassword: "secret123" }),
    ).rejects.toThrow("生产环境必须配置安全且长度不少于 16 字符的 CONFIG_ENCRYPTION_KEY");
  });

  test("production with valid CONFIG_ENCRYPTION_KEY succeeds", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.CONFIG_ENCRYPTION_KEY = "a-very-long-and-secure-encryption-key-32";
    const { updateConfig } = await import("@/lib/app-config");
    mockDb.appConfig.findMany.mockResolvedValue([]);
    mockDb.appConfig.upsert.mockResolvedValue({});

    await expect(
      updateConfig({ smtpPassword: "secret123" }),
    ).resolves.toBeUndefined();
  });

  test("dev environment falls back to explicit test key", async () => {
    (process.env as any).NODE_ENV = "development";
    delete (process.env as any).CONFIG_ENCRYPTION_KEY;
    const { updateConfig } = await import("@/lib/app-config");
    mockDb.appConfig.findMany.mockResolvedValue([]);
    mockDb.appConfig.upsert.mockResolvedValue({});

    await expect(
      updateConfig({ smtpPassword: "secret123" }),
    ).resolves.toBeUndefined();
  });
});

// ============================================
// 3. Cookie 安全：生产环境强制 Secure
// ============================================

describe("Cookie secure flag", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("session cookie is Secure in production", async () => {
    (process.env as any).NODE_ENV = "production";
    delete (process.env as any).COOKIE_SECURE;
    const { setSessionCookie } = await import("@/lib/auth");
    const res = { cookies: { set: jest.fn() } } as any;
    setSessionCookie(res, "token", new Date());
    expect(res.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });

  test("jeepwork cookie is Secure in production", async () => {
    (process.env as any).NODE_ENV = "production";
    delete (process.env as any).COOKIE_SECURE;
    const { setJeepworkCookie } = await import("@/lib/jeepwork-auth");
    const res = { cookies: { set: jest.fn() } } as any;
    setJeepworkCookie(res, "token");
    expect(res.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });

  test("session cookie respects COOKIE_SECURE in development", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.COOKIE_SECURE = "false";
    const { setSessionCookie } = await import("@/lib/auth");
    const res = { cookies: { set: jest.fn() } } as any;
    setSessionCookie(res, "token", new Date());
    expect(res.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false }),
    );
  });
});

// ============================================
// 4. 企业 Host 校验：源码级别检查
// ============================================

describe("Enterprise host validation", () => {
  test("the internal /__w route uses Next.js encoded underscore registration", () => {
    const fs = require("fs");
    expect(fs.existsSync("src/app/%5F_w/[workspaceId]/page.tsx")).toBe(true);
    expect(fs.existsSync("src/app/__w")).toBe(false);
  });

  test.each([
    "page.tsx",
    "about/page.tsx",
    "ai/page.tsx",
    "contact/page.tsx",
    "employees/page.tsx",
    "products/page.tsx",
    "p/[slug]/page.tsx",
  ])("enterprise route %s gates metadata and body before loading data", (route) => {
    const fs = require("fs");
    const content = fs.readFileSync(
      `src/app/%5F_w/[workspaceId]/${route}`,
      "utf8",
    );
    expect(
      (content.match(/await requireWorkspacePublicRequestHost\(workspaceId\)/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
  });

  test("the shared request guard requires a signed workspace routing proof", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "src/lib/workspace-public-request.ts",
      "utf8",
    );
    expect(content).toContain("verifyWorkspaceRoutingProof");
    expect(content).toContain("WORKSPACE_ROUTING_HOST_HEADER");
    expect(content).toContain("WORKSPACE_ROUTING_PROOF_HEADER");
    expect(content).not.toContain('requestHeaders.get("x-forwarded-host")');
  });

  test("enterprise home page and metadata share a fail-closed Host gate", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "src/app/%5F_w/[workspaceId]/page.tsx",
      "utf8",
    );
    expect(content).toContain("requireWorkspacePublicRequestHost");
    expect((content.match(/await requireWorkspacePublicRequestHost\(workspaceId\)/g) ?? []).length).toBe(2);
    expect(content).not.toMatch(/if\s*\(host\)/);
    expect(content).not.toContain("NEXT_PUBLIC_APP_URL ? null");
  });

  test("enterprise employee page and metadata share a fail-closed Host gate", () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx",
      "utf8",
    );
    expect(content).toContain("requireWorkspacePublicRequestHost");
    expect((content.match(/await requireWorkspacePublicRequestHost\(workspaceId\)/g) ?? []).length).toBe(2);
    expect(content).not.toMatch(/if\s*\(host\)/);
    expect(content).not.toContain("NEXT_PUBLIC_APP_URL ? null");
  });
});
