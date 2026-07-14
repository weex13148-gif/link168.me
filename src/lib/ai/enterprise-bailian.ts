import net from "node:net";
import { getConfig, isAiTester } from "@/lib/app-config";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { DEFAULT_CONFIG, type AiProvider, type AppConfigValues } from "@/lib/app-config-values";

export const ENTERPRISE_BAILIAN_ALLOWED_PLANS = new Set([
  "member_basic",
  "member_plus",
  "pro",
  "enterprise",
  "enterprise_pro_plus",
  "internal_test",
]);

const PROVIDERS: AiProvider[] = [
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
  dashscopeWorkspaceId: string;
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

type EnterpriseBailianUser = { id: string; email: string };
type EnterpriseAiUrlValidationError = { code: string; message: string };

function envValue(key: string) {
  const value = process.env[key] ?? process.env[key.toLowerCase()];
  return typeof value === "string" ? value.trim() : "";
}

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseBoolean(value: unknown, fallback = false) {
  return value === true ? true : value === false ? false : fallback;
}

function parseString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseStringArray(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return source.map((item) => typeof item === "string" ? item.trim().toLowerCase() : "").filter((item) => EMAIL_REGEX.test(item));
}

function isPrivateOrReservedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) return true;
  if (["100.100.100.200", "169.254.169.254", "0.0.0.0", "metadata.google.internal"].includes(host)) return true;
  if (net.isIP(host)) {
    if (host.startsWith("10.") || host.startsWith("127.") || host.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    if (host.startsWith("169.254.") || host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  }
  return false;
}

function validatePublicHttpsUrl(raw: string, label: string): EnterpriseAiUrlValidationError | null {
  if (!raw) return { code: "BAD_BODY", message: `${label} must not be empty.` };
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return { code: "FORBIDDEN", message: `${label} must use https://.` };
    if (isPrivateOrReservedHost(url.hostname)) return { code: "FORBIDDEN", message: `${label} must not target a private host.` };
    return null;
  } catch {
    return { code: "BAD_BODY", message: `${label} must be a valid URL.` };
  }
}

export function resolveEnterpriseBailianConfig(config: AppConfigValues): EnterpriseBailianConfig {
  const appId = config.aiBailianAppId?.trim() || envValue("BAILIAN_APP_ID");
  const apiKey = config.aiApiKey?.trim() || envValue("DASHSCOPE_API_KEY") || envValue("BAILIAN_API_KEY");
  const baseUrl = config.aiBailianBaseUrl?.trim()
    || envValue("BAILIAN_APP_BASE_URL")
    || envValue("DASHSCOPE_BASE_URL")
    || "https://dashscope.aliyuncs.com/api/v1";
  const workspaceId = config.aiBailianWorkspaceId?.trim() || envValue("DASHSCOPE_WORKSPACE_ID");
  const timeoutMs = Math.max(10, Number(config.aiRequestTimeout || 45)) * 1000;
  return { appId, apiKey, baseUrl, dashscopeWorkspaceId: workspaceId, timeoutMs, configured: Boolean(appId && apiKey && baseUrl) };
}

async function getContext(user: EnterpriseBailianUser | null) {
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
  const membershipUsable = entitlements.hasActiveMembership || entitlements.isGracePeriod;
  const allowed = membershipUsable
    && entitlements.features.aiEnabled
    && ENTERPRISE_BAILIAN_ALLOWED_PLANS.has(entitlements.planCode);
  return {
    user,
    config,
    resolved,
    isTester: tester,
    entitlements,
    access: {
      allowed,
      planCode: entitlements.planCode,
      reason: allowed
        ? null
        : entitlements.isGracePeriod
          ? "当前会员宽限期内 AI 权限不可用，请完成续费后重试。"
          : `AI 服务需要有效的 Plus、Pro 或企业会员。当前套餐：${entitlements.plan.name}`,
      isTester: tester,
      isConfigured: resolved.configured,
    } satisfies EnterpriseBailianAccess,
  };
}

export async function getEnterpriseBailianAccess(userId: string, email: string) {
  return getContext({ id: userId, email });
}

export async function getEnterpriseBailianAccessForRequest(request: Request) {
  const { getCurrentUserFromRequest } = await import("@/lib/auth");
  return getContext(await getCurrentUserFromRequest(request));
}

export function maskEnterpriseBailianConfig(config: AppConfigValues) {
  const resolved = resolveEnterpriseBailianConfig(config);
  return {
    appId: resolved.appId,
    apiKey: resolved.apiKey ? `${resolved.apiKey.slice(0, 4)}****${resolved.apiKey.slice(-4)}` : "",
    baseUrl: resolved.baseUrl,
    dashscopeWorkspaceId: resolved.dashscopeWorkspaceId,
    configured: resolved.configured,
  };
}

export function validateEnterpriseAiSettingsPatch(
  body: Partial<Record<keyof AppConfigValues, unknown>>,
): Partial<AppConfigValues> {
  const patch: Partial<AppConfigValues> = {};
  if (hasOwn(body, "aiEnabled")) patch.aiEnabled = parseBoolean(body.aiEnabled, DEFAULT_CONFIG.aiEnabled);
  if (hasOwn(body, "aiProvider")) {
    const provider = parseString(body.aiProvider, DEFAULT_CONFIG.aiProvider).toLowerCase() as AiProvider;
    patch.aiProvider = PROVIDERS.includes(provider) ? provider : DEFAULT_CONFIG.aiProvider;
  }
  if (hasOwn(body, "aiBaseUrl")) patch.aiBaseUrl = parseString(body.aiBaseUrl, DEFAULT_CONFIG.aiBaseUrl);
  if (hasOwn(body, "aiModel")) patch.aiModel = parseString(body.aiModel, DEFAULT_CONFIG.aiModel);
  if (hasOwn(body, "aiApiKey")) patch.aiApiKey = parseString(body.aiApiKey);
  if (hasOwn(body, "aiBailianAppId")) patch.aiBailianAppId = parseString(body.aiBailianAppId);
  if (hasOwn(body, "aiBailianBaseUrl")) patch.aiBailianBaseUrl = parseString(body.aiBailianBaseUrl, DEFAULT_CONFIG.aiBailianBaseUrl);
  if (hasOwn(body, "aiBailianWorkspaceId")) patch.aiBailianWorkspaceId = parseString(body.aiBailianWorkspaceId);
  if (hasOwn(body, "aiDailyLimitTotal")) patch.aiDailyLimitTotal = parseNumber(body.aiDailyLimitTotal, DEFAULT_CONFIG.aiDailyLimitTotal, 1, 1_000_000);
  if (hasOwn(body, "aiDailyLimitPerUser")) patch.aiDailyLimitPerUser = parseNumber(body.aiDailyLimitPerUser, DEFAULT_CONFIG.aiDailyLimitPerUser, 1, 100_000);
  if (hasOwn(body, "aiTesterEmails")) patch.aiTesterEmails = parseStringArray(body.aiTesterEmails);
  if (hasOwn(body, "aiRequestTimeout")) patch.aiRequestTimeout = parseNumber(body.aiRequestTimeout, DEFAULT_CONFIG.aiRequestTimeout, 10, 120);
  if (hasOwn(body, "aiMaxOutputTokens")) patch.aiMaxOutputTokens = parseNumber(body.aiMaxOutputTokens, DEFAULT_CONFIG.aiMaxOutputTokens, 100, 8000);
  if (hasOwn(body, "aiTemperature")) patch.aiTemperature = parseNumber(body.aiTemperature, DEFAULT_CONFIG.aiTemperature, 0, 2);
  if (hasOwn(body, "aiPublicEnabled")) patch.aiPublicEnabled = parseBoolean(body.aiPublicEnabled, DEFAULT_CONFIG.aiPublicEnabled);
  if (hasOwn(body, "aiAssistantTaxEnabled")) patch.aiAssistantTaxEnabled = parseBoolean(body.aiAssistantTaxEnabled, false);
  if (hasOwn(body, "aiAssistantLegalEnabled")) patch.aiAssistantLegalEnabled = parseBoolean(body.aiAssistantLegalEnabled, false);
  if (hasOwn(body, "aiAssistantMarketEnabled")) patch.aiAssistantMarketEnabled = parseBoolean(body.aiAssistantMarketEnabled, false);
  if (hasOwn(body, "aiAssistantDesignEnabled")) patch.aiAssistantDesignEnabled = parseBoolean(body.aiAssistantDesignEnabled, false);
  if (hasOwn(body, "aiAssistantSocialEnabled")) patch.aiAssistantSocialEnabled = parseBoolean(body.aiAssistantSocialEnabled, false);
  return patch;
}

export function getEnterpriseAiSettingsUrlValidationError(
  patch: Partial<AppConfigValues>,
): EnterpriseAiUrlValidationError | null {
  if (patch.aiBaseUrl) return validatePublicHttpsUrl(patch.aiBaseUrl, "AI Base URL");
  if (patch.aiBailianBaseUrl) return validatePublicHttpsUrl(patch.aiBailianBaseUrl, "Bailian App Base URL");
  return null;
}
