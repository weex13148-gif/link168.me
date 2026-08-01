import { normalizeRequestHost, resolveDomain } from "@/lib/domains";
import { getConfiguredAppHost, isPlatformHost } from "@/lib/platform-hosts";

export type PublicAiRequestContext =
  | { ok: true; expectedWorkspaceId: string | null }
  | { ok: false; code: "PUBLIC_CONTEXT_UNVERIFIED"; message: string };

function requestHost(request: Request): string | null {
  const rawHost = request.headers.get("host") || new URL(request.url).host;
  const normalized = normalizeRequestHost(rawHost);
  if (normalized) return normalized;

  // normalizeRequestHost intentionally rejects localhost. It is accepted only
  // when it is the explicitly configured application host.
  const configuredHost = getConfiguredAppHost();
  try {
    const urlHost = new URL(`http://${rawHost}`).hostname.toLowerCase().replace(/\.$/, "");
    return configuredHost === urlHost ? urlHost : null;
  } catch {
    return null;
  }
}

function normalizedUsername(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
    : "";
}

export async function resolvePublicAiRequestContext(
  request: Request,
  username: unknown,
): Promise<PublicAiRequestContext> {
  const host = requestHost(request);
  if (!host) {
    return {
      ok: false,
      code: "PUBLIC_CONTEXT_UNVERIFIED",
      message: "无法确认当前公开页面来源。",
    };
  }

  const resolved = await resolveDomain(host);
  if (resolved?.kind === "workspace") {
    return { ok: true, expectedWorkspaceId: resolved.workspaceId };
  }

  if (resolved?.kind === "personal-subdomain") {
    if (resolved.username !== normalizedUsername(username)) {
      return {
        ok: false,
        code: "PUBLIC_CONTEXT_UNVERIFIED",
        message: "公开主页与请求用户不匹配。",
      };
    }
    return { ok: true, expectedWorkspaceId: null };
  }

  if (isPlatformHost(host)) {
    return { ok: true, expectedWorkspaceId: null };
  }

  return {
    ok: false,
    code: "PUBLIC_CONTEXT_UNVERIFIED",
    message: "当前域名未绑定到可用的公开页面。",
  };
}
