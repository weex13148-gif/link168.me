import crypto from "crypto";
import { db } from "@/lib/db";

export type DomainInfo = {
  id: string;
  domain: string;
  normalizedDomain: string;
  domainType: "subdomain" | "custom";
  status: "pending" | "verified" | "failed" | "unbound";
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
  status: "pending" | "verified" | "failed" | "unbound";
  failureReason?: string;
  dnsVerified: boolean;
  tlsVerified: boolean;
  routingReady: boolean;
};

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

export function validateCustomDomainInput(input: string): { valid: boolean; normalized: string; error?: string } {
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

export async function createUserSubdomain(username: string, userId: string): Promise<DomainInfo> {
  const domain = `${username}.${BASE_DOMAIN}`;
  const normalizedDomain = domain.toLowerCase();

  const existing = await db.domain.findUnique({ where: { normalizedDomain } });
  if (existing) {
    if (existing.userId === userId && existing.status === "unbound") {
      await db.domain.update({
        where: { id: existing.id },
        data: {
          status: "verified",
          verifiedAt: new Date(),
          unboundAt: null,
          failureReason: null,
        },
      });
      return getDomainVerificationInfo(existing.id, userId) as Promise<DomainInfo>;
    }
    throw new Error("域名已被占用");
  }

  const verificationToken = crypto.randomBytes(16).toString("hex");
  const cnameTarget = `${verificationToken}.cname.${BASE_DOMAIN}`;

  const domainRecord = await db.domain.create({
    data: {
      userId,
      domain,
      normalizedDomain,
      domainType: "subdomain",
      status: "verified",
      verificationToken,
      cnameTarget,
      verifiedAt: new Date(),
    },
    select: {
      id: true,
      domain: true,
      normalizedDomain: true,
      domainType: true,
      status: true,
      cnameTarget: true,
      verifiedAt: true,
      createdAt: true,
    },
  });

  return {
    ...domainRecord,
    domainType: domainRecord.domainType as "subdomain" | "custom",
    status: domainRecord.status as "pending" | "verified" | "failed" | "unbound",
    verifiedAt: domainRecord.verifiedAt ?? undefined,
    dnsVerified: true,
    tlsVerified: false,
    routingReady: false,
  };
}

export async function bindCustomDomain(domain: string, userId: string): Promise<DomainInfo> {
  const validation = validateCustomDomainInput(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalizedDomain = validation.normalized;

  const existing = await db.domain.findUnique({ where: { normalizedDomain } });
  if (existing) {
    if (existing.userId === userId && existing.status === "unbound") {
      const newToken = crypto.randomBytes(16).toString("hex");
      const newCnameTarget = `${newToken}.cname.${BASE_DOMAIN}`;

      const updated = await db.domain.update({
        where: { id: existing.id },
        data: {
          userId,
          verificationToken: newToken,
          cnameTarget: newCnameTarget,
          status: "pending",
          verifiedAt: null,
          failureReason: null,
          unboundAt: null,
        },
        select: {
          id: true,
          domain: true,
          normalizedDomain: true,
          domainType: true,
          status: true,
          cnameTarget: true,
          createdAt: true,
        },
      });
      return {
        ...updated,
        domainType: updated.domainType as "subdomain" | "custom",
        status: updated.status as "pending" | "verified" | "failed" | "unbound",
        dnsVerified: false,
        tlsVerified: false,
        routingReady: false,
      };
    }
    throw new Error("域名已被其他用户绑定");
  }

  const existingUserDomain = await db.domain.findFirst({
    where: { userId, domainType: "custom", status: { not: "unbound" } },
  });
  if (existingUserDomain) {
    throw new Error("您已绑定过自定义域名，请先解绑");
  }

  const verificationToken = crypto.randomBytes(16).toString("hex");
  const cnameTarget = `${verificationToken}.cname.${BASE_DOMAIN}`;

  const domainRecord = await db.domain.create({
    data: {
      userId,
      domain: normalizedDomain,
      normalizedDomain,
      domainType: "custom",
      status: "pending",
      verificationToken,
      cnameTarget,
    },
    select: {
      id: true,
      domain: true,
      normalizedDomain: true,
      domainType: true,
      status: true,
      cnameTarget: true,
      createdAt: true,
    },
  });

  return {
    ...domainRecord,
    domainType: domainRecord.domainType as "subdomain" | "custom",
    status: domainRecord.status as "pending" | "verified" | "failed" | "unbound",
    dnsVerified: false,
    tlsVerified: false,
    routingReady: false,
  };
}

export async function verifyDomain(domainId: string, userId: string): Promise<DomainVerificationResult> {
  const domainRecord = await db.domain.findUnique({ where: { id: domainId } });
  if (!domainRecord) {
    return { success: false, domainId, status: "failed", failureReason: "域名记录不存在", dnsVerified: false, tlsVerified: false, routingReady: false };
  }

  if (domainRecord.userId !== userId) {
    return { success: false, domainId, status: "failed", failureReason: "无权操作该域名", dnsVerified: false, tlsVerified: false, routingReady: false };
  }

  if (domainRecord.status === "unbound") {
    return { success: false, domainId, status: "failed", failureReason: "域名已解绑", dnsVerified: false, tlsVerified: false, routingReady: false };
  }

  const verificationResult = await verifyDnsRecord(domainRecord.domain, domainRecord.cnameTarget);

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
      status: updated.status as "pending" | "verified" | "failed" | "unbound",
      dnsVerified: true,
      tlsVerified: false,
      routingReady: false,
    };
  } else {
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
      status: updated.status as "pending" | "verified" | "failed" | "unbound",
      failureReason: updated.failureReason ?? undefined,
      dnsVerified: false,
      tlsVerified: false,
      routingReady: false,
    };
  }
}

export async function unbindDomain(domainId: string, userId: string): Promise<boolean> {
  const domainRecord = await db.domain.findUnique({ where: { id: domainId } });
  if (!domainRecord) {
    return false;
  }

  if (domainRecord.userId !== userId) {
    return false;
  }

  await db.domain.update({
    where: { id: domainId },
    data: { status: "unbound", unboundAt: new Date() },
  });

  return true;
}

export async function getUserDomains(userId: string): Promise<DomainInfo[]> {
  const domains = await db.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      normalizedDomain: true,
      domainType: true,
      status: true,
      failureReason: true,
      cnameTarget: true,
      verifiedAt: true,
      unboundAt: true,
      createdAt: true,
    },
  });

  return domains.map((d) => ({
    ...d,
    domainType: d.domainType as "subdomain" | "custom",
    status: d.status as "pending" | "verified" | "failed" | "unbound",
    failureReason: d.failureReason ?? undefined,
    verifiedAt: d.verifiedAt ?? undefined,
    unboundAt: d.unboundAt ?? undefined,
    dnsVerified: d.status === "verified",
    tlsVerified: false,
    routingReady: false,
  }));
}

export async function resolveDomain(domain: string): Promise<{ userId: string; username: string } | null> {
  const normalizedDomain = normalizeRequestHost(domain);
  if (!normalizedDomain) {
    return null;
  }

  if (RESERVED_HOSTS.has(normalizedDomain)) {
    return null;
  }

  if (normalizedDomain === BASE_DOMAIN || normalizedDomain.endsWith(`.${BASE_DOMAIN}`)) {
    if (!normalizedDomain.startsWith(`${BASE_DOMAIN}.`) && normalizedDomain.split(".").length === 3) {
      const username = normalizedDomain.slice(0, -(`.${BASE_DOMAIN}`.length));
      if (!username.includes(".")) {
        if (!RESERVED_HOSTS.has(normalizedDomain)) {
          const profile = await db.profile.findUnique({
            where: { username },
            include: { user: true },
          });
          if (profile) {
            return { userId: profile.userId, username: profile.username };
          }
        }
      }
    }
    return null;
  }

  const domainRecord = await db.domain.findUnique({
    where: { normalizedDomain },
    include: { user: { include: { profile: true } } },
  });

  if (domainRecord) {
    if (domainRecord.status !== "verified") {
      return null;
    }
    if (!domainRecord.user?.profile) {
      return null;
    }
    return { userId: domainRecord.userId, username: domainRecord.user.profile.username };
  }

  return null;
}

export async function getDomainVerificationInfo(domainId: string, userId: string): Promise<DomainInfo | null> {
  const domain = await db.domain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      domain: true,
      normalizedDomain: true,
      domainType: true,
      status: true,
      failureReason: true,
      cnameTarget: true,
      verifiedAt: true,
      createdAt: true,
      userId: true,
    },
  });

  if (!domain) return null;
  if (domain.userId !== userId) return null;

  return {
    ...domain,
    domainType: domain.domainType as "subdomain" | "custom",
    status: domain.status as "pending" | "verified" | "failed" | "unbound",
    failureReason: domain.failureReason ?? undefined,
    verifiedAt: domain.verifiedAt ?? undefined,
    dnsVerified: domain.status === "verified",
    tlsVerified: false,
    routingReady: false,
  };
}

function isValidDomain(domain: string): boolean {
  const regex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

async function verifyDnsRecord(domain: string, expectedTarget: string): Promise<{ success: boolean; failureReason?: string }> {
  try {
    const dns = await import("dns");
    const normalizedTarget = expectedTarget.toLowerCase().replace(/\.$/, "");

    const records = await dns.promises.resolveCname(domain).catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOTFOUND") {
        throw new Error("未查询到该域名");
      }
      if (err.code === "ENODATA") {
        throw new Error("未配置 CNAME 记录");
      }
      if (err.code === "ETIMEOUT") {
        throw new Error("DNS 查询超时，请稍后重试");
      }
      throw new Error("DNS 服务异常，请稍后重试");
    });

    const normalizedRecords = records.map((r: string) => r.toLowerCase().replace(/\.$/, ""));

    if (normalizedRecords.length === 0) {
      return { success: false, failureReason: "未配置 CNAME 记录" };
    }

    if (!normalizedRecords.includes(normalizedTarget)) {
      return { success: false, failureReason: `CNAME 目标不匹配，当前指向: ${normalizedRecords.join(", ")}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, failureReason: error instanceof Error ? error.message : "DNS 验证失败" };
  }
}