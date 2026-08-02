import { isPlatformHost, PLATFORM_BASE_DOMAIN } from "@/lib/platform-hosts";

export type PublicHostStatus = "missing" | "pending" | "failed" | "verified";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPrismaUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export function isAllowedPersonalContactHost(
  normalizedHost: string | null | undefined,
  username: string,
): boolean {
  if (!normalizedHost) return false;
  if (isPlatformHost(normalizedHost)) return true;

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return false;
  return normalizedHost === `${normalizedUsername}.${PLATFORM_BASE_DOMAIN}`;
}

export type PublicHostSummary = {
  publicHost: string | null;
  publicHostStatus: PublicHostStatus;
};

type DomainRecord = {
  domain: string;
  status: string;
};

/**
 * Only a verified custom host may be rendered into a team QR code. The caller
 * supplies records in descending creation order, so the first verified domain
 * is also the currently preferred public host.
 */
export function summarizeWorkspacePublicHost(domains: ReadonlyArray<DomainRecord>): PublicHostSummary {
  const verified = domains.find((domain) => domain.status === "verified");
  if (verified) return { publicHost: verified.domain, publicHostStatus: "verified" };
  if (domains.some((domain) => domain.status === "pending")) return { publicHost: null, publicHostStatus: "pending" };
  if (domains.some((domain) => domain.status === "failed")) return { publicHost: null, publicHostStatus: "failed" };
  return { publicHost: null, publicHostStatus: "missing" };
}
