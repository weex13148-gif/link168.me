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
};

export type DomainVerificationResult = {
  success: boolean;
  domainId: string;
  status: "pending" | "verified" | "failed" | "unbound";
  failureReason?: string;
};

const BASE_DOMAIN = "link168.me";

const RESERVED_DOMAINS = new Set([
  BASE_DOMAIN,
  `www.${BASE_DOMAIN}`,
  `app.${BASE_DOMAIN}`,
  `api.${BASE_DOMAIN}`,
  `admin.${BASE_DOMAIN}`,
  `workbench.${BASE_DOMAIN}`,
  `dashboard.${BASE_DOMAIN}`,
]);

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

  return domainRecord as DomainInfo;
}

export async function bindCustomDomain(domain: string, userId: string): Promise<DomainInfo> {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    throw new Error("域名格式无效");
  }

  if (RESERVED_DOMAINS.has(normalizedDomain)) {
    throw new Error("该域名不允许绑定");
  }

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
      return updated as DomainInfo;
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

  return domainRecord as DomainInfo;
}

export async function verifyDomain(domainId: string, userId: string): Promise<DomainVerificationResult> {
  const domainRecord = await db.domain.findUnique({ where: { id: domainId } });
  if (!domainRecord) {
    return { success: false, domainId, status: "failed", failureReason: "域名记录不存在" };
  }

  if (domainRecord.userId !== userId) {
    return { success: false, domainId, status: "failed", failureReason: "无权操作该域名" };
  }

  if (domainRecord.status === "unbound") {
    return { success: false, domainId, status: "failed", failureReason: "域名已解绑" };
  }

  const isValid = await verifyDnsRecord(domainRecord.domain, domainRecord.cnameTarget);

  if (isValid) {
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
    return { success: true, domainId: updated.id, status: updated.status as "pending" | "verified" | "failed" | "unbound" };
  } else {
    const updated = await db.domain.update({
      where: { id: domainId },
      data: {
        status: "failed",
        lastVerifiedAt: new Date(),
        failureReason: "DNS 记录未生效，请检查 CNAME 配置",
      },
      select: { id: true, status: true, failureReason: true },
    });
    return {
      success: false,
      domainId: updated.id,
      status: updated.status as "pending" | "verified" | "failed" | "unbound",
      failureReason: updated.failureReason ?? undefined,
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
  }));
}

export async function resolveDomain(domain: string): Promise<{ userId: string; username: string } | null> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return null;
  }

  if (RESERVED_DOMAINS.has(normalizedDomain)) {
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

  const subdomainMatch = normalizedDomain.match(`^([^.]+)\\.${BASE_DOMAIN}$`);
  if (subdomainMatch) {
    const username = subdomainMatch[1];
    const profile = await db.profile.findUnique({
      where: { username },
      include: { user: true },
    });
    if (profile) {
      return { userId: profile.userId, username: profile.username };
    }
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
  };
}

function normalizeDomain(domain: string): string | null {
  if (!domain) return null;

  let result = domain.toLowerCase().trim();

  result = result.replace(/^https?:\/\//i, "");

  const pathIndex = result.indexOf("/");
  if (pathIndex !== -1) {
    result = result.substring(0, pathIndex);
  }

  const portIndex = result.lastIndexOf(":");
  if (portIndex !== -1 && portIndex > result.lastIndexOf(".")) {
    result = result.substring(0, portIndex);
  }

  result = result.replace(/\.$/, "");

  if (!isValidDomain(result)) {
    return null;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(result)) {
    return null;
  }

  if (result === "localhost") {
    return null;
  }

  return result;
}

function isValidDomain(domain: string): boolean {
  const regex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

async function verifyDnsRecord(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const dns = await import("dns");
    const records = await dns.promises.resolveCname(domain).catch(() => []);
    const normalizedRecords = records.map((r: string) => r.toLowerCase().replace(/\.$/, ""));
    const normalizedTarget = expectedTarget.toLowerCase().replace(/\.$/, "");
    return normalizedRecords.includes(normalizedTarget);
  } catch {
    return false;
  }
}