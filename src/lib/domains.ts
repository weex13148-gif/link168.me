import crypto from "crypto";
import { db } from "@/lib/db";

// ============================================
// 类型定义
// ============================================

export type DomainStatus = "pending" | "verified" | "failed" | "unbound";
export type DomainType = "subdomain" | "custom";

export type DomainInfo = {
  id: string;
  workspaceId: string;
  domain: string;
  normalizedDomain: string;
  domainType: DomainType;
  status: DomainStatus;
  failureReason?: string;
  cnameTarget: string;
  verifiedAt?: Date;
  unboundAt?: Date;
  createdAt: Date;
  dnsVerified: boolean;
  tlsVerified: boolean;
  routingReady: boolean;
};

export type DomainVerificationResult = {
  success: boolean;
  domainId: string;
  status: DomainStatus;
  failureReason?: string;
  dnsVerified: boolean;
  tlsVerified: boolean;
  routingReady: boolean;
};

// 企业域名解析结果
export type ResolvedDomain =
  | {
      kind: "workspace";
      workspaceId: string;
      workspaceSlug: string;
    }
  | {
      kind: "personal-subdomain";
      userId: string;
      username: string;
    };

// 员工名片路径解析结果
export type ResolvedWorkspaceProfile = {
  workspaceId: string;
  workspaceSlug: string;
  profileId: string;
  userId: string;
  slug: string;
  username: string;
};

// ============================================
// 常量
// ============================================

const BASE_DOMAIN = "link168.me";

const RESERVED_HOSTS = new Set([
  BASE_DOMAIN,
  `www.${BASE_DOMAIN}`,
  `app.${BASE_DOMAIN}`,
  `api.${BASE_DOMAIN}`,
  `admin.${BASE_DOMAIN}`,
  `workbench.${BASE_DOMAIN}`,
  `dashboard.${BASE_DOMAIN}`,
]);

// 企业员工名片保留 slug（不可被员工注册）
// 这些路径用于企业官网自身的页面或系统路径
export const WORKSPACE_RESERVED_SLUGS = new Set<string>([
  "admin",
  "api",
  "login",
  "logout",
  "register",
  "dashboard",
  "console",
  "workbench",
  "products",
  "services",
  "contact",
  "about",
  "team",
  "employees",
  "settings",
  "billing",
  "ai",
  "assets",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "showcase",
  "jeepwork",
]);

// 套餐对应的可绑定域名数量
// 当前权威套餐配置中只有布尔值 customDomain，本轮按以下规则支持：
// - enterprise: 1 个
// - enterprise_pro_plus: 3 个（按现有产品规则）
// 其他套餐：0 个（不允许绑定企业域名）
const PLAN_DOMAIN_LIMITS: Record<string, number> = {
  enterprise: 1,
  enterprise_pro_plus: 3,
};

// 员工名片 slug 格式：3-32 位小写字母、数字、连字符
const WORKSPACE_SLUG_PATTERN = /^[a-z0-9-]{3,32}$/;

// ============================================
// 输入校验（纯函数）
// ============================================

export function validateCustomDomainInput(input: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!input) {
    return { valid: false, normalized: "", error: "域名不能为空" };
  }

  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { valid: false, normalized: "", error: "不允许包含协议，请直接输入域名" };
  }

  if (trimmed.includes("/")) {
    return { valid: false, normalized: "", error: "不允许包含路径，请直接输入域名" };
  }

  if (trimmed.includes("?")) {
    return { valid: false, normalized: "", error: "不允许包含查询参数，请直接输入域名" };
  }

  if (trimmed.includes("#")) {
    return { valid: false, normalized: "", error: "不允许包含片段，请直接输入域名" };
  }

  if (trimmed.includes("@")) {
    return { valid: false, normalized: "", error: "不允许包含认证信息，请直接输入域名" };
  }

  const portMatch = trimmed.match(/:\d+$/);
  if (portMatch) {
    return { valid: false, normalized: "", error: "不允许包含端口，请直接输入域名" };
  }

  const lower = trimmed.toLowerCase();
  const noTrailingDot = lower.replace(/\.$/, "");

  if (noTrailingDot === "localhost") {
    return { valid: false, normalized: "", error: "localhost 不允许绑定" };
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(noTrailingDot)) {
    return { valid: false, normalized: "", error: "IP 地址不允许绑定" };
  }

  if (!isValidDomain(noTrailingDot)) {
    return { valid: false, normalized: "", error: "域名格式无效" };
  }

  if (noTrailingDot === BASE_DOMAIN || noTrailingDot.endsWith(`.${BASE_DOMAIN}`)) {
    return { valid: false, normalized: "", error: "不允许绑定 link168.me 域名" };
  }

  return { valid: true, normalized: noTrailingDot };
}

export function normalizeRequestHost(host: string): string | null {
  if (!host) return null;

  let result = host.toLowerCase().trim();

  const portIndex = result.lastIndexOf(":");
  if (portIndex !== -1 && portIndex > result.lastIndexOf(".")) {
    result = result.substring(0, portIndex);
  }

  result = result.replace(/\.$/, "");

  if (!isValidDomain(result)) {
    return null;
  }

  return result;
}

// 校验员工名片 slug（格式 + 保留路径）
export function validateWorkspaceSlug(slug: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!slug) {
    return { valid: false, normalized: "", error: "slug 不能为空" };
  }

  const trimmed = slug.trim().toLowerCase();

  if (!WORKSPACE_SLUG_PATTERN.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      error: "slug 格式无效，需为 3-32 位小写字母、数字或连字符",
    };
  }

  if (WORKSPACE_RESERVED_SLUGS.has(trimmed)) {
    return { valid: false, normalized: "", error: "该路径为系统保留，不可注册" };
  }

  if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
    return { valid: false, normalized: "", error: "slug 不能以连字符开头或结尾" };
  }

  if (trimmed.includes("--")) {
    return { valid: false, normalized: "", error: "slug 不能包含连续连字符" };
  }

  return { valid: true, normalized: trimmed };
}

export function isReservedWorkspaceSlug(slug: string): boolean {
  return WORKSPACE_RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

// 读取套餐对应的可绑定域名数量
export function getWorkspaceDomainLimit(planCode: string | null | undefined): number {
  if (!planCode) return 0;
  return PLAN_DOMAIN_LIMITS[planCode] ?? 0;
}

// ============================================
// Workspace 域名绑定
// ============================================

export async function bindWorkspaceDomain(
  domain: string,
  workspaceId: string,
  planCode: string,
): Promise<DomainInfo> {
  const validation = validateCustomDomainInput(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalizedDomain = validation.normalized;

  // 校验套餐允许绑定企业域名（纯函数检查，优先于 DB 查询）
  const limit = getWorkspaceDomainLimit(planCode);
  if (limit <= 0) {
    throw new Error("当前套餐不支持绑定企业域名");
  }

  // 校验 Workspace 存在且 active
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, isActive: true, planCode: true },
  });
  if (!workspace || !workspace.isActive) {
    throw new Error("Workspace 不存在或已停用");
  }

  // 校验同一 Workspace 未超过套餐数量
  const activeCount = await db.domain.count({
    where: {
      workspaceId,
      domainType: "custom",
      status: { not: "unbound" },
    },
  });
  if (activeCount >= limit) {
    throw new Error(`当前套餐最多绑定 ${limit} 个企业域名`);
  }

  // 检查域名是否已被其他 Workspace 绑定
  const existing = await db.domain.findUnique({
    where: { normalizedDomain },
  });

  if (existing) {
    // 同一 Workspace 重新绑定已解绑的域名
    if (existing.workspaceId === workspaceId && existing.status === "unbound") {
      const newToken = crypto.randomBytes(16).toString("hex");
      const newCnameTarget = `${newToken}.cname.${BASE_DOMAIN}`;

      const updated = await db.domain.update({
        where: { id: existing.id },
        data: {
          workspaceId,
          verificationToken: newToken,
          cnameTarget: newCnameTarget,
          status: "pending",
          verifiedAt: null,
          failureReason: null,
          unboundAt: null,
        },
        select: domainSelectFields,
      });
      return toDomainInfo(updated);
    }
    throw new Error("域名已被其他 Workspace 绑定");
  }

  const verificationToken = crypto.randomBytes(16).toString("hex");
  const cnameTarget = `${verificationToken}.cname.${BASE_DOMAIN}`;

  const domainRecord = await db.domain.create({
    data: {
      workspaceId,
      domain: normalizedDomain,
      normalizedDomain,
      domainType: "custom",
      status: "pending",
      verificationToken,
      cnameTarget,
    },
    select: domainSelectFields,
  });

  return toDomainInfo(domainRecord);
}

export async function verifyWorkspaceDomain(
  domainId: string,
  workspaceId: string,
): Promise<DomainVerificationResult> {
  const domainRecord = await db.domain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      workspaceId: true,
      domain: true,
      cnameTarget: true,
      status: true,
    },
  });

  if (!domainRecord) {
    return {
      success: false,
      domainId,
      status: "failed",
      failureReason: "域名记录不存在",
      dnsVerified: false,
      tlsVerified: false,
      routingReady: false,
    };
  }

  if (domainRecord.workspaceId !== workspaceId) {
    return {
      success: false,
      domainId,
      status: "failed",
      failureReason: "无权操作该域名",
      dnsVerified: false,
      tlsVerified: false,
      routingReady: false,
    };
  }

  if (domainRecord.status === "unbound") {
    return {
      success: false,
      domainId,
      status: "failed",
      failureReason: "域名已解绑",
      dnsVerified: false,
      tlsVerified: false,
      routingReady: false,
    };
  }

  const verificationResult = await verifyDnsRecord(
    domainRecord.domain,
    domainRecord.cnameTarget,
  );

  if (verificationResult.success) {
    const updated = await db.domain.update({
      where: { id: domainId },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        lastVerifiedAt: new Date(),
        failureReason: null,
      },
      select: { id: true, status: true },
    });
    return {
      success: true,
      domainId: updated.id,
      status: updated.status as DomainStatus,
      dnsVerified: true,
      tlsVerified: false,
      routingReady: false,
    };
  }

  const updated = await db.domain.update({
    where: { id: domainId },
    data: {
      status: "failed",
      lastVerifiedAt: new Date(),
      failureReason: verificationResult.failureReason,
    },
    select: { id: true, status: true, failureReason: true },
  });
  return {
    success: false,
    domainId: updated.id,
    status: updated.status as DomainStatus,
    failureReason: updated.failureReason ?? undefined,
    dnsVerified: false,
    tlsVerified: false,
    routingReady: false,
  };
}

export async function unbindWorkspaceDomain(
  domainId: string,
  workspaceId: string,
): Promise<boolean> {
  const domainRecord = await db.domain.findUnique({
    where: { id: domainId },
    select: { id: true, workspaceId: true, status: true },
  });
  if (!domainRecord) return false;
  if (domainRecord.workspaceId !== workspaceId) return false;

  await db.domain.update({
    where: { id: domainId },
    data: { status: "unbound", unboundAt: new Date() },
  });
  return true;
}

export async function getWorkspaceDomains(workspaceId: string): Promise<DomainInfo[]> {
  const domains = await db.domain.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: domainSelectFields,
  });
  return domains.map(toDomainInfo);
}

export async function getWorkspaceDomainVerificationInfo(
  domainId: string,
  workspaceId: string,
): Promise<DomainInfo | null> {
  const domain = await db.domain.findUnique({
    where: { id: domainId },
    select: { ...domainSelectFields, workspaceId: true },
  });
  if (!domain) return null;
  if (domain.workspaceId !== workspaceId) return null;

  const { workspaceId: _ignored, ...rest } = domain;
  return toDomainInfo({ ...rest, workspaceId: domain.workspaceId });
}

// ============================================
// Workspace 员工公开名片（slug 路径）
// ============================================

export type WorkspacePublicProfileInfo = {
  id: string;
  workspaceId: string;
  userId: string;
  slug: string;
  status: "active" | "disabled" | "removed";
  createdAt: Date;
  updatedAt: Date;
};

export async function createWorkspacePublicProfile(
  workspaceId: string,
  userId: string,
  slug: string,
): Promise<WorkspacePublicProfileInfo> {
  const validation = validateWorkspaceSlug(slug);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const normalizedSlug = validation.normalized;

  // 校验 Workspace 存在且 active
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) {
    throw new Error("Workspace 不存在或已停用");
  }

  // 校验用户是该 Workspace 的 active 成员
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId, status: "active" },
    select: { id: true },
  });
  if (!member) {
    throw new Error("用户不是该 Workspace 的活跃成员");
  }

  // 校验 slug 在 Workspace 内唯一
  const existing = await db.workspacePublicProfile.findUnique({
    where: { workspaceId_slug: { workspaceId, slug: normalizedSlug } },
  });
  if (existing) {
    throw new Error("该 slug 已被本 Workspace 内其他员工占用");
  }

  // 校验用户在该 Workspace 内还没有公开名片
  const existingForUser = await db.workspacePublicProfile.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (existingForUser) {
    throw new Error("该员工在本 Workspace 内已存在公开名片");
  }

  const profile = await db.workspacePublicProfile.create({
    data: {
      workspaceId,
      userId,
      slug: normalizedSlug,
      status: "active",
    },
    select: publicProfileSelectFields,
  });
  return toPublicProfileInfo(profile);
}

export async function updateWorkspacePublicProfileSlug(
  profileId: string,
  workspaceId: string,
  slug: string,
): Promise<WorkspacePublicProfileInfo> {
  const validation = validateWorkspaceSlug(slug);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const normalizedSlug = validation.normalized;

  const existing = await db.workspacePublicProfile.findUnique({
    where: { id: profileId },
    select: { id: true, workspaceId: true, slug: true, status: true },
  });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("名片记录不存在");
  }

  if (existing.slug === normalizedSlug) {
    const profile = await db.workspacePublicProfile.findUnique({
      where: { id: profileId },
      select: publicProfileSelectFields,
    });
    if (!profile) throw new Error("名片记录不存在");
    return toPublicProfileInfo(profile);
  }

  // 校验新 slug 在 Workspace 内唯一
  const conflict = await db.workspacePublicProfile.findUnique({
    where: { workspaceId_slug: { workspaceId, slug: normalizedSlug } },
  });
  if (conflict) {
    throw new Error("该 slug 已被本 Workspace 内其他员工占用");
  }

  const updated = await db.workspacePublicProfile.update({
    where: { id: profileId },
    data: { slug: normalizedSlug },
    select: publicProfileSelectFields,
  });
  return toPublicProfileInfo(updated);
}

export async function setWorkspacePublicProfileStatus(
  profileId: string,
  workspaceId: string,
  status: "active" | "disabled" | "removed",
): Promise<WorkspacePublicProfileInfo> {
  const existing = await db.workspacePublicProfile.findUnique({
    where: { id: profileId },
    select: { id: true, workspaceId: true },
  });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("名片记录不存在");
  }

  const updated = await db.workspacePublicProfile.update({
    where: { id: profileId },
    data: { status },
    select: publicProfileSelectFields,
  });
  return toPublicProfileInfo(updated);
}

export async function getWorkspacePublicProfiles(
  workspaceId: string,
): Promise<WorkspacePublicProfileInfo[]> {
  const profiles = await db.workspacePublicProfile.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: publicProfileSelectFields,
  });
  return profiles.map(toPublicProfileInfo);
}

// ============================================
// 域名解析（proxy 使用）
// ============================================

// 解析 Host 到 Workspace 或个人主页
// 仅 verified 企业域名可解析；pending/failed/unbound 全部返回 null
export async function resolveDomain(host: string): Promise<ResolvedDomain | null> {
  const normalizedDomain = normalizeRequestHost(host);
  if (!normalizedDomain) return null;

  if (RESERVED_HOSTS.has(normalizedDomain)) return null;

  // link168.me 系统域名：username.link168.me 个人主页
  if (normalizedDomain === BASE_DOMAIN || normalizedDomain.endsWith(`.${BASE_DOMAIN}`)) {
    // 仅支持单层子域名：username.link168.me
    if (normalizedDomain.startsWith(`${BASE_DOMAIN}.`) || normalizedDomain === BASE_DOMAIN) {
      return null;
    }
    if (normalizedDomain.split(".").length !== 3) {
      return null;
    }
    const username = normalizedDomain.slice(0, -(`.${BASE_DOMAIN}`.length));
    if (!username || username.includes(".")) {
      return null;
    }
    const profile = await db.profile.findUnique({
      where: { username },
      include: { user: true },
    });
    if (!profile) return null;
    return {
      kind: "personal-subdomain",
      userId: profile.userId,
      username: profile.username,
    };
  }

  // 企业自定义域名
  const domainRecord = await db.domain.findUnique({
    where: { normalizedDomain },
    include: { workspace: true },
  });

  if (!domainRecord) return null;
  if (domainRecord.status !== "verified") return null;
  if (!domainRecord.workspace || !domainRecord.workspace.isActive) return null;

  return {
    kind: "workspace",
    workspaceId: domainRecord.workspaceId,
    workspaceSlug: domainRecord.workspace.slug,
  };
}

// 解析企业域名下的员工名片路径
// 返回 null 表示不是员工名片路径（应由企业官网路由处理）
export async function resolveWorkspacePublicProfile(
  workspaceId: string,
  slug: string,
): Promise<ResolvedWorkspaceProfile | null> {
  if (!slug || isReservedWorkspaceSlug(slug)) return null;

  const profile = await db.workspacePublicProfile.findUnique({
    where: { workspaceId_slug: { workspaceId, slug } },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!profile) return null;
  if (profile.status !== "active") return null;
  if (!profile.user?.profile) return null;
  if (profile.user.accountStatus !== "active") return null;

  // 校验该用户仍是该 Workspace 的 active 成员
  const member = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: profile.userId,
      status: "active",
    },
    select: { id: true },
  });
  if (!member) return null;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) return null;

  return {
    workspaceId,
    workspaceSlug: workspace.slug,
    profileId: profile.id,
    userId: profile.userId,
    slug: profile.slug,
    username: profile.user.profile.username,
  };
}

// ============================================
// 内部辅助
// ============================================

const domainSelectFields = {
  id: true,
  workspaceId: true,
  domain: true,
  normalizedDomain: true,
  domainType: true,
  status: true,
  failureReason: true,
  cnameTarget: true,
  verifiedAt: true,
  unboundAt: true,
  createdAt: true,
} as const;

const publicProfileSelectFields = {
  id: true,
  workspaceId: true,
  userId: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toDomainInfo(d: {
  id: string;
  workspaceId: string;
  domain: string;
  normalizedDomain: string;
  domainType: string;
  status: string;
  failureReason: string | null;
  cnameTarget: string;
  verifiedAt: Date | null;
  unboundAt: Date | null;
  createdAt: Date;
}): DomainInfo {
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    domain: d.domain,
    normalizedDomain: d.normalizedDomain,
    domainType: d.domainType as DomainType,
    status: d.status as DomainStatus,
    failureReason: d.failureReason ?? undefined,
    cnameTarget: d.cnameTarget,
    verifiedAt: d.verifiedAt ?? undefined,
    unboundAt: d.unboundAt ?? undefined,
    createdAt: d.createdAt,
    dnsVerified: d.status === "verified",
    tlsVerified: false,
    routingReady: false,
  };
}

function toPublicProfileInfo(p: {
  id: string;
  workspaceId: string;
  userId: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkspacePublicProfileInfo {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    userId: p.userId,
    slug: p.slug,
    status: p.status as "active" | "disabled" | "removed",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function isValidDomain(domain: string): boolean {
  const regex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

async function verifyDnsRecord(
  domain: string,
  expectedTarget: string,
): Promise<{ success: boolean; failureReason?: string }> {
  try {
    const dns = await import("dns");
    const normalizedTarget = expectedTarget.toLowerCase().replace(/\.$/, "");

    const records = await dns.promises.resolveCname(domain).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOTFOUND") {
        throw new Error("未查询到该域名");
      }
      if (err.code === "ENODATA") {
        throw new Error("域名未配置 CNAME 记录");
      }
      if (err.code === "ETIMEOUT") {
        throw new Error("DNS 查询超时，请稍后重试");
      }
      throw err;
    });

    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, failureReason: "未找到 CNAME 记录" };
    }

    const matched = records.some((r) => r.toLowerCase().replace(/\.$/, "") === normalizedTarget);
    if (!matched) {
      return {
        success: false,
        failureReason: "CNAME 记录不匹配，请检查 DNS 配置",
      };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DNS 验证失败";
    return { success: false, failureReason: message };
  }
}
