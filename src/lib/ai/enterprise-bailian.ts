import net from "node:net";
import { getConfig, isAiTester } from "@/lib/app-config";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { DEFAULT_CONFIG, type AiProvider, type AppConfigValues } from "@/lib/app-config-values";

export const ENTERPRISE_BAILIAN_ALLOWED_PLANS = new Set(["member_plus", "enterprise"]);

const ENTERPRISE_AI_PROVIDER_OPTIONS: AiProvider[] = [
  "openai",
  "deepseek",
  "qwen",
  "bailian",
  "doubao",
  "zhipu",
  "openai-compatible",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EnterpriseBailianConfig = {
  appId: string;
  apiKey: string;
  baseUrl: string;
  workspaceId: string;
  timeoutMs: number;
  configured: boolean;
};

export type EnterpriseBailianAccess = {
  allowed: boolean;
  planCode: string;
  reason: string | null;
  isTester: boolean;
  isConfigured: boolean;
};

type EnterpriseBailianUser = {
  id: string;
  email: string;
};

type EnterpriseAiUrlValidationError = {
  code: string;
  message: string;
};

function envValue(key: string): string {
  const value = process.env[key] ?? process.env[key.toLowerCase()];
  return typeof value === "string" ? value.trim() : "";
}

function hasOwn<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseBoolean(value: unknown, fallback = false) {
  return value === true ? true : value === false ? false : fallback;
}

function parseString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter((item) => EMAIL_REGEX.test(item));
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => EMAIL_REGEX.test(item));
  }

  return [];
}

function isPrivateOrReservedHost(hostname: string): boolean {
  if (!hostname) return true;

  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;
  if (lower.endsWith(".local")) return true;
  if (lower === "metadata.google.internal") return true;
  if (lower === "100.100.100.200") return true;
  if (lower === "169.254.169.254") return true;

  if (net.isIP(lower) !== 0) {
    if (lower.startsWith("10.") || lower.startsWith("127.") || lower.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
    if (lower === "0.0.0.0" || lower.startsWith("0.")) return true;
    if (lower.startsWith("::1") || lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true;
    if (lower === "::ffff:127.0.0.1") return true;
    if (lower === "::ffff:169.254.169.254") return true;
    return false;
  }

  if (lower.endsWith(".metadata")) return true;
  if (lower.includes("metadata") && (lower.includes("169.254") || lower.endsWith(".compute.internal"))) return true;
  return false;
}

function validatePublicHttpsUrl(urlRaw: string, kind: string): EnterpriseAiUrlValidationError | null {
  if (!urlRaw) {
    return { code: "BAD_BODY", message: `${kind} must not be empty.` };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return { code: "BAD_BODY", message: `${kind} must be a valid URL.` };
  }

  if (parsed.protocol !== "https:") {
    return { code: "FORBIDDEN", message: `${kind} must use https://.` };
  }

  if (isPrivateOrReservedHost(parsed.hostname)) {
    return { code: "FORBIDDEN", message: `${kind} must not target a private or metadata host.` };
  }

  return null;
}

function buildAccess(
  planCode: string,
  planName: string,
  hasActiveMembership: boolean,
  isTester: boolean,
  configured: boolean,
): EnterpriseBailianAccess {
  const allowed = ENTERPRISE_BAILIAN_ALLOWED_PLANS.has(planCode) && hasActiveMembership;
  return {
    allowed,
    planCode,
    reason: allowed ? null : `Enterprise AI requires member_plus or enterprise. Current plan: ${planName}`,
    isTester,
    isConfigured: configured,
  };
}

async function getEnterpriseBailianAccessContext(user: EnterpriseBailianUser | null) {
  const config = await getConfig();
  const resolved = resolveEnterpriseBailianConfig(config);

  if (!user) {
    return {
      user: null,
      config,
      resolved,
      isTester: false,
      access: {
        allowed: false,
        planCode: "free",
        reason: "Please sign in first.",
        isTester: false,
        isConfigured: resolved.configured,
      } satisfies EnterpriseBailianAccess,
    };
  }

  const [entitlements, tester] = await Promise.all([
    getUserEntitlements(user.id),
    isAiTester(user.email),
  ]);

  return {
    user,
    config,
    resolved,
    isTester: tester,
    entitlements,
    access: buildAccess(
      entitlements.planCode,
      entitlements.plan.name,
      entitlements.hasActiveMembership,
      tester,
      resolved.configured,
    ),
  };
}

export function resolveEnterpriseBailianConfig(config: AppConfigValues): EnterpriseBailianConfig {
  const appId = config.aiBailianAppId?.trim() || envValue("BAILIAN_APP_ID");
  const apiKey = config.aiApiKey?.trim() || envValue("DASHSCOPE_API_KEY") || envValue("BAILIAN_API_KEY");
  const baseUrl =
    config.aiBailianBaseUrl?.trim() ||
    envValue("BAILIAN_APP_BASE_URL") ||
    envValue("DASHSCOPE_BASE_URL") ||
    "https://dashscope.aliyuncs.com/api/v1";
  const workspaceId = config.aiBailianWorkspaceId?.trim() || envValue("DASHSCOPE_WORKSPACE_ID");
  const timeoutMs = Math.max(10, Number(config.aiRequestTimeout || 45)) * 1000;

  return {
    appId,
    apiKey,
    baseUrl,
    workspaceId,
    timeoutMs,
    configured: Boolean(appId && apiKey && baseUrl),
  };
}

export async function getEnterpriseBailianAccess(userId: string, email: string) {
  return getEnterpriseBailianAccessContext({ id: userId, email });
}

export async function getEnterpriseBailianAccessForRequest(request: Request) {
  const { getCurrentUserFromRequest } = await import("@/lib/auth");
  const user = await getCurrentUserFromRequest(request);
  return getEnterpriseBailianAccessContext(user);
}

export function maskEnterpriseBailianConfig(config: AppConfigValues) {
  const resolved = resolveEnterpriseBailianConfig(config);

  return {
    appId: resolved.appId,
    apiKey: resolved.apiKey ? `${resolved.apiKey.slice(0, 4)}****${resolved.apiKey.slice(-4)}` : "",
    baseUrl: resolved.baseUrl,
    workspaceId: resolved.workspaceId,
    configured: resolved.configured,
  };
}

export function validateEnterpriseAiSettingsPatch(
  body: Partial<Record<keyof AppConfigValues, unknown>>,
): Partial<AppConfigValues> {
  const patch: Partial<AppConfigValues> = {};

  if (hasOwn(body, "aiEnabled")) {
    patch.aiEnabled = parseBoolean(body.aiEnabled, DEFAULT_CONFIG.aiEnabled);
  }
  if (hasOwn(body, "aiProvider")) {
    const aiProviderRaw = parseString(body.aiProvider, DEFAULT_CONFIG.aiProvider).toLowerCase() as AiProvider;
    patch.aiProvider = ENTERPRISE_AI_PROVIDER_OPTIONS.includes(aiProviderRaw) ? aiProviderRaw : DEFAULT_CONFIG.aiProvider;
  }
  if (hasOwn(body, "aiBaseUrl")) {
    patch.aiBaseUrl = parseString(body.aiBaseUrl, DEFAULT_CONFIG.aiBaseUrl);
  }
  if (hasOwn(body, "aiModel")) {
    patch.aiModel = parseString(body.aiModel, DEFAULT_CONFIG.aiModel);
  }
  if (hasOwn(body, "aiApiKey")) {
    patch.aiApiKey = parseString(body.aiApiKey, "");
  }
  if (hasOwn(body, "aiBailianAppId")) {
    patch.aiBailianAppId = parseString(body.aiBailianAppId, DEFAULT_CONFIG.aiBailianAppId);
  }
  if (hasOwn(body, "aiBailianBaseUrl")) {
    patch.aiBailianBaseUrl = parseString(body.aiBailianBaseUrl, DEFAULT_CONFIG.aiBailianBaseUrl);
  }
  if (hasOwn(body, "aiBailianWorkspaceId")) {
    patch.aiBailianWorkspaceId = parseString(body.aiBailianWorkspaceId, DEFAULT_CONFIG.aiBailianWorkspaceId);
  }
  if (hasOwn(body, "aiDailyLimitTotal")) {
    patch.aiDailyLimitTotal = parseNumber(body.aiDailyLimitTotal, DEFAULT_CONFIG.aiDailyLimitTotal, 1, 1_000_000);
  }
  if (hasOwn(body, "aiDailyLimitPerUser")) {
    patch.aiDailyLimitPerUser = parseNumber(body.aiDailyLimitPerUser, DEFAULT_CONFIG.aiDailyLimitPerUser, 1, 100_000);
  }
  if (hasOwn(body, "aiTesterEmails")) {
    patch.aiTesterEmails = parseStringArray(body.aiTesterEmails);
  }
  if (hasOwn(body, "aiRequestTimeout")) {
    patch.aiRequestTimeout = parseNumber(body.aiRequestTimeout, DEFAULT_CONFIG.aiRequestTimeout, 10, 120);
  }
  if (hasOwn(body, "aiMaxOutputTokens")) {
    patch.aiMaxOutputTokens = parseNumber(body.aiMaxOutputTokens, DEFAULT_CONFIG.aiMaxOutputTokens, 100, 8000);
  }
  if (hasOwn(body, "aiTemperature")) {
    patch.aiTemperature = parseNumber(body.aiTemperature, DEFAULT_CONFIG.aiTemperature, 0, 2);
  }
  if (hasOwn(body, "aiPublicEnabled")) {
    patch.aiPublicEnabled = parseBoolean(body.aiPublicEnabled, DEFAULT_CONFIG.aiPublicEnabled);
  }
  if (hasOwn(body, "aiAssistantTaxEnabled")) {
    patch.aiAssistantTaxEnabled = parseBoolean(body.aiAssistantTaxEnabled, DEFAULT_CONFIG.aiAssistantTaxEnabled);
  }
  if (hasOwn(body, "aiAssistantLegalEnabled")) {
    patch.aiAssistantLegalEnabled = parseBoolean(body.aiAssistantLegalEnabled, DEFAULT_CONFIG.aiAssistantLegalEnabled);
  }
  if (hasOwn(body, "aiAssistantMarketEnabled")) {
    patch.aiAssistantMarketEnabled = parseBoolean(body.aiAssistantMarketEnabled, DEFAULT_CONFIG.aiAssistantMarketEnabled);
  }
  if (hasOwn(body, "aiAssistantDesignEnabled")) {
    patch.aiAssistantDesignEnabled = parseBoolean(body.aiAssistantDesignEnabled, DEFAULT_CONFIG.aiAssistantDesignEnabled);
  }
  if (hasOwn(body, "aiAssistantSocialEnabled")) {
    patch.aiAssistantSocialEnabled = parseBoolean(body.aiAssistantSocialEnabled, DEFAULT_CONFIG.aiAssistantSocialEnabled);
  }

  return patch;
}

export function getEnterpriseAiSettingsUrlValidationError(
  patch: Partial<AppConfigValues>,
): EnterpriseAiUrlValidationError | null {
  if (patch.aiBaseUrl) {
    return validatePublicHttpsUrl(patch.aiBaseUrl, "AI Base URL");
  }

  if (patch.aiBailianBaseUrl) {
    return validatePublicHttpsUrl(patch.aiBailianBaseUrl, "Bailian App Base URL");
  }

  return null;
}
