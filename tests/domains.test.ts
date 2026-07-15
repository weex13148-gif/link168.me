import {
  validateCustomDomainInput,
  normalizeRequestHost,
  validateWorkspaceSlug,
  isReservedWorkspaceSlug,
  getWorkspaceDomainLimit,
  WORKSPACE_RESERVED_SLUGS,
  bindWorkspaceDomain,
  verifyWorkspaceDomain,
  unbindWorkspaceDomain,
  getWorkspaceDomains,
  resolveDomain,
  resolveWorkspacePublicProfile,
  createWorkspacePublicProfile,
  updateWorkspacePublicProfileSlug,
  setWorkspacePublicProfileStatus,
} from "@/lib/domains";
import {
  validateWorkspacePublicRequestHost,
} from "@/lib/workspace-public-host";

// ============================================
// Mock Prisma db
// ============================================

jest.mock("@/lib/db", () => {
  const mock = {
    workspace: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    domain: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workspacePublicProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => {
      const tx: any = {
        $queryRaw: jest.fn(),
        workspace: mock.workspace,
        domain: mock.domain,
      };
      return callback(tx);
    }),
    profile: {
      findUnique: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    aiServiceConfig: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  return { db: mock };
});

// 导入被 mock 的 db 以便在测试中控制行为
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  workspace: { findUnique: jest.Mock; findMany: jest.Mock };
  domain: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  workspacePublicProfile: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  workspaceMember: { findFirst: jest.Mock };
  profile: { findUnique: jest.Mock };
  product: { count: jest.Mock; findMany: jest.Mock };
  aiServiceConfig: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================
// 纯函数测试
// ============================================

describe("validateCustomDomainInput", () => {
  test("example.com should pass", () => {
    const result = validateCustomDomainInput("example.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });

  test("www.example.com should pass", () => {
    const result = validateCustomDomainInput("www.example.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("www.example.com");
  });

  test("zhangsen.com should pass", () => {
    const result = validateCustomDomainInput("zhangsen.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("zhangsen.com");
  });

  test("https://example.com should be rejected", () => {
    const result = validateCustomDomainInput("https://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("协议");
  });

  test("http://example.com should be rejected", () => {
    const result = validateCustomDomainInput("http://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("协议");
  });

  test("example.com/path should be rejected", () => {
    const result = validateCustomDomainInput("example.com/path");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("路径");
  });

  test("example.com:443 should be rejected", () => {
    const result = validateCustomDomainInput("example.com:443");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("端口");
  });

  test("link168.me should be rejected", () => {
    const result = validateCustomDomainInput("link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("www.link168.me should be rejected", () => {
    const result = validateCustomDomainInput("www.link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("any.link168.me should be rejected", () => {
    const result = validateCustomDomainInput("any.link168.me");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("link168.me");
  });

  test("127.0.0.1 should be rejected", () => {
    const result = validateCustomDomainInput("127.0.0.1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("IP 地址");
  });

  test("localhost should be rejected", () => {
    const result = validateCustomDomainInput("localhost");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("localhost");
  });

  test("example.com?x=1 should be rejected", () => {
    const result = validateCustomDomainInput("example.com?x=1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("查询参数");
  });

  test("user:pass@example.com should be rejected", () => {
    const result = validateCustomDomainInput("user:pass@example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("认证信息");
  });

  test("trim and lowercase", () => {
    const result = validateCustomDomainInput("  Example.COM  ");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });

  test("trailing dot should be normalized", () => {
    const result = validateCustomDomainInput("example.com.");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("example.com");
  });
});

describe("normalizeRequestHost", () => {
  test("should remove port", () => {
    expect(normalizeRequestHost("example.com:3000")).toBe("example.com");
  });

  test("should remove trailing dot", () => {
    expect(normalizeRequestHost("example.com.")).toBe("example.com");
  });

  test("should lowercase", () => {
    expect(normalizeRequestHost("Example.COM")).toBe("example.com");
  });

  test("localhost should return null", () => {
    expect(normalizeRequestHost("localhost")).toBe(null);
  });
});

// ============================================
// Workspace Slug 校验
// ============================================

describe("validateWorkspaceSlug", () => {
  test("abao should pass", () => {
    const result = validateWorkspaceSlug("abao");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("abao");
  });

  test("zhang-san should pass", () => {
    const result = validateWorkspaceSlug("zhang-san");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("zhang-san");
  });

  test("too short (2 chars) should be rejected", () => {
    const result = validateWorkspaceSlug("ab");
    expect(result.valid).toBe(false);
  });

  test("too long (33 chars) should be rejected", () => {
    const result = validateWorkspaceSlug("a".repeat(33));
    expect(result.valid).toBe(false);
  });

  test("uppercase should be normalized to lowercase", () => {
    const result = validateWorkspaceSlug("Abao");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("abao");
  });

  test("underscore should be rejected (only lowercase + digit + hyphen)", () => {
    const result = validateWorkspaceSlug("ab_ao");
    expect(result.valid).toBe(false);
  });

  test("leading hyphen should be rejected", () => {
    const result = validateWorkspaceSlug("-abao");
    expect(result.valid).toBe(false);
  });

  test("trailing hyphen should be rejected", () => {
    const result = validateWorkspaceSlug("abao-");
    expect(result.valid).toBe(false);
  });

  test("consecutive hyphens should be rejected", () => {
    const result = validateWorkspaceSlug("ab--ao");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'admin' should be rejected", () => {
    const result = validateWorkspaceSlug("admin");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("保留");
  });

  test("reserved slug 'api' should be rejected", () => {
    const result = validateWorkspaceSlug("api");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'products' should be rejected", () => {
    const result = validateWorkspaceSlug("products");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'contact' should be rejected", () => {
    const result = validateWorkspaceSlug("contact");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'login' should be rejected", () => {
    const result = validateWorkspaceSlug("login");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'dashboard' should be rejected", () => {
    const result = validateWorkspaceSlug("dashboard");
    expect(result.valid).toBe(false);
  });

  test("reserved slug 'favicon.ico' should be rejected", () => {
    const result = validateWorkspaceSlug("favicon.ico");
    expect(result.valid).toBe(false);
  });

  test("empty slug should be rejected", () => {
    const result = validateWorkspaceSlug("");
    expect(result.valid).toBe(false);
  });
});

describe("isReservedWorkspaceSlug", () => {
  test("admin is reserved", () => {
    expect(isReservedWorkspaceSlug("admin")).toBe(true);
  });

  test("abao is not reserved", () => {
    expect(isReservedWorkspaceSlug("abao")).toBe(false);
  });

  test("case-insensitive check", () => {
    expect(isReservedWorkspaceSlug("ADMIN")).toBe(true);
  });
});

describe("WORKSPACE_RESERVED_SLUGS", () => {
  test("contains all expected reserved slugs", () => {
    const expected = [
      "admin", "api", "login", "logout", "register",
      "dashboard", "console", "workbench", "products", "services",
      "contact", "about", "team", "employees", "settings",
      "billing", "ai", "assets", "static", "_next",
      "favicon.ico", "robots.txt", "sitemap.xml", "showcase", "jeepwork",
    ];
    for (const slug of expected) {
      expect(WORKSPACE_RESERVED_SLUGS.has(slug)).toBe(true);
    }
  });
});

// ============================================
// 套餐域名数量
// ============================================

describe("getWorkspaceDomainLimit", () => {
  test("enterprise returns 1", () => {
    expect(getWorkspaceDomainLimit("enterprise")).toBe(1);
  });

  test("enterprise_pro_plus returns 3", () => {
    expect(getWorkspaceDomainLimit("enterprise_pro_plus")).toBe(3);
  });

  test("free returns 0", () => {
    expect(getWorkspaceDomainLimit("free")).toBe(0);
  });

  test("pro returns 0", () => {
    expect(getWorkspaceDomainLimit("pro")).toBe(0);
  });

  test("member_plus returns 0", () => {
    expect(getWorkspaceDomainLimit("member_plus")).toBe(0);
  });

  test("null returns 0", () => {
    expect(getWorkspaceDomainLimit(null)).toBe(0);
  });

  test("undefined returns 0", () => {
    expect(getWorkspaceDomainLimit(undefined)).toBe(0);
  });

  test("unknown plan returns 0", () => {
    expect(getWorkspaceDomainLimit("unknown_plan")).toBe(0);
  });
});

// ============================================
// bindWorkspaceDomain（mock db）
// ============================================

describe("bindWorkspaceDomain", () => {
  const workspaceId = "ws-uuid-1";
  const planCode = "enterprise";

  test("non-enterprise plan should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode: "free",
    });
    await expect(
      bindWorkspaceDomain("zhangsen.com", workspaceId),
    ).rejects.toThrow("套餐");
  });

  test("pro plan should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode: "pro",
    });
    await expect(
      bindWorkspaceDomain("zhangsen.com", workspaceId),
    ).rejects.toThrow("套餐");
  });

  test("invalid domain should be rejected before db query", async () => {
    await expect(
      bindWorkspaceDomain("https://invalid.com", workspaceId),
    ).rejects.toThrow("协议");
  });

  test("link168.me domain should be rejected", async () => {
    await expect(
      bindWorkspaceDomain("link168.me", workspaceId),
    ).rejects.toThrow("link168.me");
  });

  test("inactive workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: false,
      planCode,
    });
    await expect(
      bindWorkspaceDomain("zhangsen.com", workspaceId),
    ).rejects.toThrow("Workspace 不存在或已停用");
  });

  test("non-existent workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue(null);
    await expect(
      bindWorkspaceDomain("zhangsen.com", workspaceId),
    ).rejects.toThrow("Workspace 不存在或已停用");
  });

  test("enterprise plan exceeding limit (1 domain) should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode,
    });
    mockDb.domain.count.mockResolvedValue(1);
    await expect(
      bindWorkspaceDomain("second.com", workspaceId),
    ).rejects.toThrow("最多绑定 1 个");
  });

  test("enterprise_pro_plus can bind up to 3 domains", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode: "enterprise_pro_plus",
    });
    mockDb.domain.count.mockResolvedValue(2); // 已有 2 个，还可以绑定 1 个
    mockDb.domain.findUnique.mockResolvedValue(null); // 域名未被占用
    mockDb.domain.create.mockResolvedValue({
      id: "domain-1",
      workspaceId,
      domain: "third.com",
      normalizedDomain: "third.com",
      domainType: "custom",
      status: "pending",
      failureReason: null,
      cnameTarget: "token.cname.link168.me",
      verifiedAt: null,
      unboundAt: null,
      createdAt: new Date(),
    });
    const result = await bindWorkspaceDomain("third.com", workspaceId);
    expect(result.workspaceId).toBe(workspaceId);
    expect(result.status).toBe("pending");
    expect(result.dnsVerified).toBe(false);
    expect(result.tlsVerified).toBe(false);
  });

  test("enterprise_pro_plus exceeding limit (3 domains) should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode: "enterprise_pro_plus",
    });
    mockDb.domain.count.mockResolvedValue(3);
    await expect(
      bindWorkspaceDomain("fourth.com", workspaceId),
    ).rejects.toThrow("最多绑定 3 个");
  });

  test("domain already bound by another workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode,
    });
    mockDb.domain.count.mockResolvedValue(0);
    mockDb.domain.findUnique.mockResolvedValue({
      id: "other-domain",
      workspaceId: "ws-other",
      status: "verified",
    });
    await expect(
      bindWorkspaceDomain("taken.com", workspaceId),
    ).rejects.toThrow("已被其他 Workspace 绑定");
  });

  test("successfully bind new domain", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode,
    });
    mockDb.domain.count.mockResolvedValue(0);
    mockDb.domain.findUnique.mockResolvedValue(null);
    mockDb.domain.create.mockResolvedValue({
      id: "domain-new",
      workspaceId,
      domain: "zhangsen.com",
      normalizedDomain: "zhangsen.com",
      domainType: "custom",
      status: "pending",
      failureReason: null,
      cnameTarget: "token.cname.link168.me",
      verifiedAt: null,
      unboundAt: null,
      createdAt: new Date(),
    });
    const result = await bindWorkspaceDomain("zhangsen.com", workspaceId);
    expect(result.id).toBe("domain-new");
    expect(result.workspaceId).toBe(workspaceId);
    expect(result.status).toBe("pending");
    expect(result.dnsVerified).toBe(false);
    expect(result.tlsVerified).toBe(false);
    expect(result.routingReady).toBe(false);
  });

  test("rebind unbound domain from same workspace should succeed", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      isActive: true,
      planCode,
    });
    mockDb.domain.count.mockResolvedValue(0);
    mockDb.domain.findUnique.mockResolvedValue({
      id: "old-domain",
      workspaceId,
      status: "unbound",
    });
    mockDb.domain.update.mockResolvedValue({
      id: "old-domain",
      workspaceId,
      domain: "zhangsen.com",
      normalizedDomain: "zhangsen.com",
      domainType: "custom",
      status: "pending",
      failureReason: null,
      cnameTarget: "new-token.cname.link168.me",
      verifiedAt: null,
      unboundAt: null,
      createdAt: new Date(),
    });
    const result = await bindWorkspaceDomain("zhangsen.com", workspaceId);
    expect(result.id).toBe("old-domain");
    expect(result.status).toBe("pending");
  });
});

// ============================================
// verifyWorkspaceDomain
// ============================================

describe("verifyWorkspaceDomain", () => {
  const workspaceId = "ws-uuid-1";
  const domainId = "domain-1";

  test("non-existent domain should return failure", async () => {
    mockDb.domain.findUnique.mockResolvedValue(null);
    const result = await verifyWorkspaceDomain(domainId, workspaceId);
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("不存在");
  });

  test("domain belonging to other workspace should be rejected", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: domainId,
      workspaceId: "ws-other",
      domain: "zhangsen.com",
      cnameTarget: "token.cname.link168.me",
      status: "pending",
    });
    const result = await verifyWorkspaceDomain(domainId, workspaceId);
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain("无权");
  });

  test("unbound domain should return failure", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: domainId,
      workspaceId,
      domain: "zhangsen.com",
      cnameTarget: "token.cname.link168.me",
      status: "unbound",
    });
    const result = await verifyWorkspaceDomain(domainId, workspaceId);
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain("已解绑");
  });
});

// ============================================
// unbindWorkspaceDomain
// ============================================

describe("unbindWorkspaceDomain", () => {
  const workspaceId = "ws-uuid-1";
  const domainId = "domain-1";

  test("non-existent domain should return false", async () => {
    mockDb.domain.findUnique.mockResolvedValue(null);
    const result = await unbindWorkspaceDomain(domainId, workspaceId);
    expect(result).toBe(false);
  });

  test("domain belonging to other workspace should return false", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: domainId,
      workspaceId: "ws-other",
      status: "verified",
    });
    const result = await unbindWorkspaceDomain(domainId, workspaceId);
    expect(result).toBe(false);
  });

  test("successfully unbind own domain", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: domainId,
      workspaceId,
      status: "verified",
    });
    mockDb.domain.update.mockResolvedValue({});
    const result = await unbindWorkspaceDomain(domainId, workspaceId);
    expect(result).toBe(true);
    expect(mockDb.domain.update).toHaveBeenCalledWith({
      where: { id: domainId },
      data: { status: "unbound", unboundAt: expect.any(Date) },
    });
  });
});

// ============================================
// getWorkspaceDomains
// ============================================

describe("getWorkspaceDomains", () => {
  test("returns domains for workspace", async () => {
    mockDb.domain.findMany.mockResolvedValue([
      {
        id: "d1",
        workspaceId: "ws-1",
        domain: "zhangsen.com",
        normalizedDomain: "zhangsen.com",
        domainType: "custom",
        status: "verified",
        failureReason: null,
        cnameTarget: "t.cname.link168.me",
        verifiedAt: new Date(),
        unboundAt: null,
        createdAt: new Date(),
      },
    ]);
    const result = await getWorkspaceDomains("ws-1");
    expect(result).toHaveLength(1);
    expect(result[0].workspaceId).toBe("ws-1");
    expect(result[0].dnsVerified).toBe(true);
    expect(result[0].tlsVerified).toBe(false);
  });
});

// ============================================
// resolveDomain（域名解析）
// ============================================

describe("resolveDomain", () => {
  test("reserved host (link168.me) returns null", async () => {
    const result = await resolveDomain("link168.me");
    expect(result).toBe(null);
  });

  test("www.link168.me returns null", async () => {
    const result = await resolveDomain("www.link168.me");
    expect(result).toBe(null);
  });

  test("localhost returns null", async () => {
    const result = await resolveDomain("localhost");
    expect(result).toBe(null);
  });

  test("pending domain returns null (not resolved)", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: "d1",
      workspaceId: "ws-1",
      status: "pending",
      workspace: { id: "ws-1", isActive: true, slug: "zhangsen" },
    });
    const result = await resolveDomain("zhangsen.com");
    expect(result).toBe(null);
  });

  test("failed domain returns null (not resolved)", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: "d1",
      workspaceId: "ws-1",
      status: "failed",
      workspace: { id: "ws-1", isActive: true, slug: "zhangsen" },
    });
    const result = await resolveDomain("zhangsen.com");
    expect(result).toBe(null);
  });

  test("unbound domain returns null (not resolved)", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: "d1",
      workspaceId: "ws-1",
      status: "unbound",
      workspace: { id: "ws-1", isActive: true, slug: "zhangsen" },
    });
    const result = await resolveDomain("zhangsen.com");
    expect(result).toBe(null);
  });

  test("verified domain resolves to workspace", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: "d1",
      workspaceId: "ws-1",
      status: "verified",
      workspace: { id: "ws-1", isActive: true, slug: "zhangsen" },
    });
    const result = await resolveDomain("zhangsen.com");
    expect(result).not.toBe(null);
    expect(result?.kind).toBe("workspace");
    if (result && result.kind === "workspace") {
      expect(result.workspaceId).toBe("ws-1");
      expect(result.workspaceSlug).toBe("zhangsen");
    }
  });

  test("verified domain but workspace inactive returns null", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      id: "d1",
      workspaceId: "ws-1",
      status: "verified",
      workspace: { id: "ws-1", isActive: false, slug: "zhangsen" },
    });
    const result = await resolveDomain("zhangsen.com");
    expect(result).toBe(null);
  });

  test("unregistered domain returns null", async () => {
    mockDb.domain.findUnique.mockResolvedValue(null);
    const result = await resolveDomain("unknown.com");
    expect(result).toBe(null);
  });

  test("username.link168.me resolves to personal subdomain", async () => {
    mockDb.profile.findUnique.mockResolvedValue({
      userId: "user-1",
      username: "zhangsan",
      user: { id: "user-1" },
    });
    const result = await resolveDomain("zhangsan.link168.me");
    expect(result).not.toBe(null);
    expect(result?.kind).toBe("personal-subdomain");
    if (result && result.kind === "personal-subdomain") {
      expect(result.userId).toBe("user-1");
      expect(result.username).toBe("zhangsan");
    }
  });

  test("non-existent username.link168.me returns null", async () => {
    mockDb.profile.findUnique.mockResolvedValue(null);
    const result = await resolveDomain("nouser.link168.me");
    expect(result).toBe(null);
  });

  test("link168.me root returns null (not personal subdomain)", async () => {
    const result = await resolveDomain("link168.me");
    expect(result).toBe(null);
  });

  test("www.link168.me returns null (reserved)", async () => {
    const result = await resolveDomain("www.link168.me");
    expect(result).toBe(null);
  });

  test("multi-level subdomain (a.b.link168.me) returns null", async () => {
    const result = await resolveDomain("a.b.link168.me");
    expect(result).toBe(null);
  });
});

// ============================================
// resolveWorkspacePublicProfile（员工名片解析）
// ============================================

describe("resolveWorkspacePublicProfile", () => {
  const workspaceId = "ws-1";

  test("reserved slug returns null", async () => {
    const result = await resolveWorkspacePublicProfile(workspaceId, "admin");
    expect(result).toBe(null);
  });

  test("products reserved slug returns null", async () => {
    const result = await resolveWorkspacePublicProfile(workspaceId, "products");
    expect(result).toBe(null);
  });

  test("empty slug returns null", async () => {
    const result = await resolveWorkspacePublicProfile(workspaceId, "");
    expect(result).toBe(null);
  });

  test("non-existent profile returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue(null);
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });

  test("disabled profile returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "disabled",
      user: { accountStatus: "active", profile: { username: "abao" } },
    });
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });

  test("removed profile returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "removed",
      user: { accountStatus: "active", profile: { username: "abao" } },
    });
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });

  test("user account not active returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "active",
      user: { accountStatus: "frozen", profile: { username: "abao" } },
    });
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });

  test("user no longer active member returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "active",
      user: { accountStatus: "active", profile: { username: "abao" } },
    });
    mockDb.workspaceMember.findFirst.mockResolvedValue(null); // 不再是成员
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });

  test("active employee profile resolves", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "active",
      user: { accountStatus: "active", profile: { username: "abao-user" } },
    });
    mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "m1" });
    mockDb.workspace.findUnique.mockResolvedValue({ slug: "zhangsen", isActive: true });
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).not.toBe(null);
    expect(result?.slug).toBe("abao");
    expect(result?.userId).toBe("u1");
    expect(result?.username).toBe("abao-user");
    expect(result?.workspaceSlug).toBe("zhangsen");
  });

  test("inactive workspace returns null", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "p1",
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "active",
      user: { accountStatus: "active", profile: { username: "abao-user" } },
    });
    mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "m1" });
    mockDb.workspace.findUnique.mockResolvedValue({ slug: "zhangsen", isActive: false });
    const result = await resolveWorkspacePublicProfile(workspaceId, "abao");
    expect(result).toBe(null);
  });
});

// ============================================
// createWorkspacePublicProfile
// ============================================

describe("createWorkspacePublicProfile", () => {
  const workspaceId = "ws-1";
  const userId = "u1";

  test("invalid slug should be rejected", async () => {
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "ab"),
    ).rejects.toThrow("格式无效");
  });

  test("reserved slug should be rejected", async () => {
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "admin"),
    ).rejects.toThrow("保留");
  });

  test("inactive workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: false });
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "abao"),
    ).rejects.toThrow("Workspace 不存在或已停用");
  });

  test("non-active member should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true });
    mockDb.workspaceMember.findFirst.mockResolvedValue(null);
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "abao"),
    ).rejects.toThrow("活跃成员");
  });

  test("duplicate slug in same workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true });
    mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "m1" });
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: "existing",
      workspaceId,
      slug: "abao",
    });
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "abao"),
    ).rejects.toThrow("已被本 Workspace 内其他员工占用");
  });

  test("user already has profile in workspace should be rejected", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true });
    mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "m1" });
    // 第一次 findUnique (slug 检查) 返回 null
    mockDb.workspacePublicProfile.findUnique.mockResolvedValueOnce(null);
    // 第二次 findUnique (userId 检查) 返回已存在
    mockDb.workspacePublicProfile.findUnique.mockResolvedValueOnce({
      id: "existing",
      workspaceId,
      userId,
    });
    await expect(
      createWorkspacePublicProfile(workspaceId, userId, "abao"),
    ).rejects.toThrow("已存在公开名片");
  });

  test("successfully create profile", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: workspaceId, isActive: true });
    mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "m1" });
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue(null);
    mockDb.workspacePublicProfile.create.mockResolvedValue({
      id: "new-profile",
      workspaceId,
      userId,
      slug: "abao",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await createWorkspacePublicProfile(workspaceId, userId, "Abao");
    expect(result.slug).toBe("abao");
    expect(result.status).toBe("active");
  });
});

// ============================================
// updateWorkspacePublicProfileSlug
// ============================================

describe("updateWorkspacePublicProfileSlug", () => {
  const workspaceId = "ws-1";
  const profileId = "p1";

  test("profile from other workspace should be rejected", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId: "ws-other",
      slug: "old",
      status: "active",
    });
    await expect(
      updateWorkspacePublicProfileSlug(profileId, workspaceId, "new"),
    ).rejects.toThrow("不存在");
  });

  test("conflicting slug should be rejected", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValueOnce({
      id: profileId,
      workspaceId,
      slug: "old",
      status: "active",
    });
    // slug 冲突检查
    mockDb.workspacePublicProfile.findUnique.mockResolvedValueOnce({
      id: "other-profile",
      workspaceId,
      slug: "taken",
    });
    await expect(
      updateWorkspacePublicProfileSlug(profileId, workspaceId, "taken"),
    ).rejects.toThrow("已被本 Workspace");
  });

  test("same slug returns without update", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId,
      slug: "abao",
      status: "active",
    });
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await updateWorkspacePublicProfileSlug(profileId, workspaceId, "abao");
    expect(result.slug).toBe("abao");
  });
});

// ============================================
// setWorkspacePublicProfileStatus
// ============================================

describe("setWorkspacePublicProfileStatus", () => {
  const workspaceId = "ws-1";
  const profileId = "p1";

  test("profile from other workspace should be rejected", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId: "ws-other",
    });
    await expect(
      setWorkspacePublicProfileStatus(profileId, workspaceId, "disabled"),
    ).rejects.toThrow("不存在");
  });

  test("successfully disable profile", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId,
    });
    mockDb.workspacePublicProfile.update.mockResolvedValue({
      id: profileId,
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "disabled",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await setWorkspacePublicProfileStatus(profileId, workspaceId, "disabled");
    expect(result.status).toBe("disabled");
  });

  test("successfully remove profile", async () => {
    mockDb.workspacePublicProfile.findUnique.mockResolvedValue({
      id: profileId,
      workspaceId,
    });
    mockDb.workspacePublicProfile.update.mockResolvedValue({
      id: profileId,
      workspaceId,
      userId: "u1",
      slug: "abao",
      status: "removed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await setWorkspacePublicProfileStatus(profileId, workspaceId, "removed");
    expect(result.status).toBe("removed");
  });
});

// ============================================
// 企业公开页 Host fail-closed 边界
// ============================================

describe("validateWorkspacePublicRequestHost", () => {
  test.each([null, undefined, "", "   "])(
    "missing Host %p is rejected before database access",
    async (rawHost) => {
      await expect(
        validateWorkspacePublicRequestHost("ws-1", rawHost),
      ).resolves.toBeNull();
      expect(mockDb.domain.findUnique).not.toHaveBeenCalled();
      expect(mockDb.workspace.findUnique).not.toHaveBeenCalled();
    },
  );

  test.each([
    "link168.me",
    "www.link168.me",
    "app.link168.me:443",
    "merchant.link168.me",
  ])("platform Host %s is rejected before database access", async (rawHost) => {
    await expect(
      validateWorkspacePublicRequestHost("ws-1", rawHost),
    ).resolves.toBeNull();
    expect(mockDb.domain.findUnique).not.toHaveBeenCalled();
    expect(mockDb.workspace.findUnique).not.toHaveBeenCalled();
  });

  test("unknown Host is rejected before loading Workspace", async () => {
    mockDb.domain.findUnique.mockResolvedValue(null);

    await expect(
      validateWorkspacePublicRequestHost("ws-1", "unknown.example.com"),
    ).resolves.toBeNull();
    expect(mockDb.workspace.findUnique).not.toHaveBeenCalled();
  });

  test.each(["pending", "failed", "unbound"])(
    "%s Domain is rejected before loading Workspace",
    async (status) => {
      mockDb.domain.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        status,
      });

      await expect(
        validateWorkspacePublicRequestHost("ws-1", "brand.example.com"),
      ).resolves.toBeNull();
      expect(mockDb.workspace.findUnique).not.toHaveBeenCalled();
    },
  );

  test("cross-Workspace Host is rejected before loading Workspace", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      workspaceId: "ws-2",
      status: "verified",
    });

    await expect(
      validateWorkspacePublicRequestHost("ws-1", "other.example.com"),
    ).resolves.toBeNull();
    expect(mockDb.workspace.findUnique).not.toHaveBeenCalled();
  });

  test("inactive Workspace is rejected", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      status: "verified",
    });
    mockDb.workspace.findUnique.mockResolvedValue({ isActive: false });

    await expect(
      validateWorkspacePublicRequestHost("ws-1", "brand.example.com"),
    ).resolves.toBeNull();
  });

  test("verified Host is normalized for case, trailing dot, and port", async () => {
    mockDb.domain.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      status: "verified",
    });
    mockDb.workspace.findUnique.mockResolvedValue({ isActive: true });

    await expect(
      validateWorkspacePublicRequestHost(
        "ws-1",
        "  Brand.Example.com.:443  ",
      ),
    ).resolves.toBe("brand.example.com");
    expect(mockDb.domain.findUnique).toHaveBeenCalledWith({
      where: { normalizedDomain: "brand.example.com" },
      select: { workspaceId: true, status: true },
    });
  });
});
