import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import {
  AI_ASSISTANTS,
  DEFAULT_CONFIG,
  getAiDailyUsage,
  getConfig,
  getMaskedConfig,
  isAiTester,
  updateConfig,
  type AppConfigValues,
  type AiProvider,
  type StorageProvider,
  type SmtpSecureMode,
} from "@/lib/app-config";
import {
  getEnterpriseAiSettingsUrlValidationError,
  validateEnterpriseAiSettingsPatch,
} from "@/lib/ai/enterprise-bailian";
import { db } from "@/lib/db";
import { ROLE_SUPER_ADMIN } from "@/lib/auth";
import nodemailer from "nodemailer";
import net from "node:net";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AI_PROVIDERS: AiProvider[] = ["openai", "deepseek", "qwen", "doubao", "zhipu", "openai-compatible"];
const STORAGE_PROVIDERS: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
const SMTP_SECURE_MODES: SmtpSecureMode[] = ["ssl", "tls", "none"];
const KNOWN_ASSISTANTS = Object.values(AI_ASSISTANTS);
const AI_CONFIG_KEYS: Array<keyof AppConfigValues> = [
  "aiEnabled",
  "aiProvider",
  "aiBaseUrl",
  "aiModel",
  "aiApiKey",
  "aiBailianAppId",
  "aiBailianBaseUrl",
  "aiBailianWorkspaceId",
  "aiDailyLimitTotal",
  "aiDailyLimitPerUser",
  "aiTesterEmails",
  "aiRequestTimeout",
  "aiMaxOutputTokens",
  "aiTemperature",
  "aiPublicEnabled",
  "aiAssistantTaxEnabled",
  "aiAssistantLegalEnabled",
  "aiAssistantMarketEnabled",
  "aiAssistantDesignEnabled",
  "aiAssistantSocialEnabled",
];

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
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

function redactKeys(message: string) {
  if (!message) return message;
  return message
    .replace(/sk-[A-Za-z0-9_\-]{4,}/g, "sk-****")
    .replace(/Bearer\s+[A-Za-z0-9_\-.]{4,}/gi, "Bearer ****")
    .replace(/AKIA[0-9A-Z]{10,}/g, "AKIA****")
    .replace(/LTA[0-9A-Z]{8,}/g, "LTA****")
    .replace(/accessKeyId[\s=:]["']?[A-Za-z0-9_\-+/=]{6,}/gi, "accessKeyId=****");
}

// SSRF 保护：仅允许 https://，且禁止私有/环回/云元数据地址
// 必须只在 fetch 前校验，避免 Node �?hostname 发起内网请求
function isPrivateOrReservedHost(hostname: string): boolean {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();

  if (lower === "localhost") return true;
  if (lower.endsWith(".local")) return true;
  if (lower === "metadata.google.internal") return true;
  // 阿里�?腾讯�?华为云元数据
  if (lower === "100.100.100.200") return true;
  if (lower === "169.254.169.254") return true;

  if (net.isIP(lower) !== 0) {
    // IPv4 私有�?    if (lower.startsWith("10.") || lower.startsWith("127.") || lower.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
    // 0.0.0.0 / 0.0.0.0/8
    if (lower === "0.0.0.0" || lower.startsWith("0.")) return true;
    // IPv6 本地/私有
    if (lower.startsWith("::1") || lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true;
    if (lower === "::ffff:127.0.0.1") return true;
    if (lower === "::ffff:169.254.169.254") return true;
    return false;
  }
  // 允许 FQDN（外部域名）；但再次拒绝元数据专用域�?  if (lower.endsWith(".metadata")) return true;
  if (lower.includes("metadata") && (lower.includes("169.254") || lower.endsWith(".compute.internal"))) return true;
  return false;
}

function assertSafeOutboundUrl(urlRaw: string, kind: string) {
  if (!urlRaw) return apiError("BAD_BODY", `${kind} must not be empty.`, 400);
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return apiError("BAD_BODY", `${kind} must be a valid URL.`, 400);
  }
  if (parsed.protocol !== "https:") return apiError("FORBIDDEN", `${kind} must use https://.`, 400);
  if (isPrivateOrReservedHost(parsed.hostname)) return apiError("FORBIDDEN", `${kind} must not target a private or metadata host.`, 400);
  return null;
}

function validateAndCoerce(body: Partial<Record<keyof AppConfigValues, unknown>>): Partial<AppConfigValues> {
  const aiProviderRaw = parseString(body.aiProvider, DEFAULT_CONFIG.aiProvider).toLowerCase() as AiProvider;
  const storageProviderRaw = parseString(body.storageProvider, DEFAULT_CONFIG.storageProvider).toLowerCase() as StorageProvider;
  const smtpSecureModeRaw = parseString(body.smtpSecureMode, DEFAULT_CONFIG.smtpSecureMode).toLowerCase() as SmtpSecureMode;

  return {
    aiEnabled: parseBoolean(body.aiEnabled, DEFAULT_CONFIG.aiEnabled),
    aiProvider: AI_PROVIDERS.includes(aiProviderRaw) ? aiProviderRaw : DEFAULT_CONFIG.aiProvider,
    aiBaseUrl: parseString(body.aiBaseUrl, DEFAULT_CONFIG.aiBaseUrl),
    aiModel: parseString(body.aiModel, DEFAULT_CONFIG.aiModel),
    aiApiKey: parseString(body.aiApiKey, ""),
    aiBailianAppId: parseString(body.aiBailianAppId, DEFAULT_CONFIG.aiBailianAppId),
    aiBailianBaseUrl: parseString(body.aiBailianBaseUrl, DEFAULT_CONFIG.aiBailianBaseUrl),
    aiBailianWorkspaceId: parseString(body.aiBailianWorkspaceId, DEFAULT_CONFIG.aiBailianWorkspaceId),
    aiDailyLimitTotal: parseNumber(body.aiDailyLimitTotal, DEFAULT_CONFIG.aiDailyLimitTotal, 1, 1_000_000),
    aiDailyLimitPerUser: parseNumber(body.aiDailyLimitPerUser, DEFAULT_CONFIG.aiDailyLimitPerUser, 1, 100_000),
    aiTesterEmails: parseStringArray(body.aiTesterEmails),
    aiRequestTimeout: parseNumber(body.aiRequestTimeout, DEFAULT_CONFIG.aiRequestTimeout, 10, 120),
    aiMaxOutputTokens: parseNumber(body.aiMaxOutputTokens, DEFAULT_CONFIG.aiMaxOutputTokens, 100, 8000),
    aiTemperature: parseNumber(body.aiTemperature, DEFAULT_CONFIG.aiTemperature, 0, 2),
    aiPublicEnabled: parseBoolean(body.aiPublicEnabled, DEFAULT_CONFIG.aiPublicEnabled),
    aiAssistantTaxEnabled: parseBoolean(body.aiAssistantTaxEnabled, DEFAULT_CONFIG.aiAssistantTaxEnabled),
    aiAssistantLegalEnabled: parseBoolean(body.aiAssistantLegalEnabled, DEFAULT_CONFIG.aiAssistantLegalEnabled),
    aiAssistantMarketEnabled: parseBoolean(body.aiAssistantMarketEnabled, DEFAULT_CONFIG.aiAssistantMarketEnabled),
    aiAssistantDesignEnabled: parseBoolean(body.aiAssistantDesignEnabled, DEFAULT_CONFIG.aiAssistantDesignEnabled),
    aiAssistantSocialEnabled: parseBoolean(body.aiAssistantSocialEnabled, DEFAULT_CONFIG.aiAssistantSocialEnabled),

    mailEnabled: parseBoolean(body.mailEnabled, DEFAULT_CONFIG.mailEnabled),
    smtpHost: parseString(body.smtpHost),
    smtpPort: parseNumber(body.smtpPort, DEFAULT_CONFIG.smtpPort, 1, 65535),
    smtpUser: parseString(body.smtpUser),
    smtpPassword: parseString(body.smtpPassword, ""),
    mailFrom: parseString(body.mailFrom),
    smtpSecureMode: SMTP_SECURE_MODES.includes(smtpSecureModeRaw) ? smtpSecureModeRaw : DEFAULT_CONFIG.smtpSecureMode,

    paymentEnabled: parseBoolean(body.paymentEnabled, DEFAULT_CONFIG.paymentEnabled),
    paymentWechatEnabled: parseBoolean(body.paymentWechatEnabled, DEFAULT_CONFIG.paymentWechatEnabled),
    paymentAlipayEnabled: parseBoolean(body.paymentAlipayEnabled, DEFAULT_CONFIG.paymentAlipayEnabled),
    paymentMerchantId: parseString(body.paymentMerchantId),
    paymentAppId: parseString(body.paymentAppId),
    paymentApiKey: parseString(body.paymentApiKey, ""),
    paymentCertPath: parseString(body.paymentCertPath),
    paymentNotifyUrl: parseString(body.paymentNotifyUrl),
    paymentTestMode: parseBoolean(body.paymentTestMode, DEFAULT_CONFIG.paymentTestMode),

    storageEnabled: parseBoolean(body.storageEnabled, DEFAULT_CONFIG.storageEnabled),
    storageProvider: STORAGE_PROVIDERS.includes(storageProviderRaw) ? storageProviderRaw : DEFAULT_CONFIG.storageProvider,
    storageEndpoint: parseString(body.storageEndpoint),
    storageBucket: parseString(body.storageBucket),
    storageRegion: parseString(body.storageRegion),
    storageAccessKeyId: parseString(body.storageAccessKeyId, ""),
    storageAccessKeySecret: parseString(body.storageAccessKeySecret, ""),
    storageUploadPrefix: parseString(body.storageUploadPrefix, DEFAULT_CONFIG.storageUploadPrefix),

    smsEnabled: parseBoolean(body.smsEnabled, DEFAULT_CONFIG.smsEnabled),
    smsProvider: parseString(body.smsProvider),
    smsAccessKeyId: parseString(body.smsAccessKeyId, ""),
    smsAccessKeySecret: parseString(body.smsAccessKeySecret, ""),
    smsSignName: parseString(body.smsSignName),
    smsTemplateId: parseString(body.smsTemplateId),

    mapApiKey: parseString(body.mapApiKey, ""),
    analyticsEnabled: parseBoolean(body.analyticsEnabled, DEFAULT_CONFIG.analyticsEnabled),
    analyticsProvider: parseString(body.analyticsProvider),
    analyticsKey: parseString(body.analyticsKey, ""),
    webhookEnabled: parseBoolean(body.webhookEnabled, DEFAULT_CONFIG.webhookEnabled),
    webhookUrl: parseString(body.webhookUrl),
    customApiConfig: parseString(body.customApiConfig),
  };
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const config = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    data: { config },
    error: null,
  });
}

export async function PUT(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: Partial<Record<keyof AppConfigValues, unknown>>;
  try {
    body = (await request.json()) as Partial<Record<keyof AppConfigValues, unknown>>;
  } catch {
    return apiError("BAD_BODY", "Request body must be valid JSON.", 400);
  }

  const validated = validateAndCoerce(body);
  const validatedAiPatch = validateEnterpriseAiSettingsPatch(body);
  const aiValidationError = getEnterpriseAiSettingsUrlValidationError(validatedAiPatch);

  for (const key of AI_CONFIG_KEYS) {
    delete validated[key];
  }
  Object.assign(validated, validatedAiPatch);

  // SSRF validation before saving: aiBaseUrl / webhookUrl / paymentNotifyUrl / storageEndpoint
  if (aiValidationError) {
    return apiError(aiValidationError.code, aiValidationError.message, 400);
  }
  if (validated.webhookUrl && parseBoolean(body.webhookEnabled, false)) {
    const blocked = assertSafeOutboundUrl(validated.webhookUrl, "Webhook");
    if (blocked) return blocked;
  }
  if (validated.paymentNotifyUrl) {
    const blocked = assertSafeOutboundUrl(validated.paymentNotifyUrl, "支付回调");
    if (blocked) return blocked;
  }
  if (validated.storageEndpoint) {
    // Object storage endpoint: allow HTTPS public domains only
    const blocked = assertSafeOutboundUrl(validated.storageEndpoint, "Object storage");
    if (blocked) return blocked;
  }

  try {
    await updateConfig(validated);
  } catch (error) {
    const message = redactKeys(error instanceof Error ? error.message : String(error));
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
      targetType: "system_config",
      targetId: "app-config",
      metadata: { updatedKeys: Object.keys(validated), reason: message },
      request,
      success: false,
    });
    return apiError("DB_ERROR", `Failed to save config: ${message}`, 500);
  }

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
    targetType: "system_config",
    targetId: "app-config",
    // 仅记�?key 列表，values 在审计写入内部已脱敏
    metadata: { updatedKeys: Object.keys(validated) },
    request,
    success: true,
  });

  const config = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    data: { config, updatedKeys: Object.keys(validated), message: "配置已更新（敏感字段已脱敏）" },
    error: null,
  });
}

async function handleTestWhitelist(emailUnknown: unknown) {
  const email = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(email)) return apiError("BAD_BODY", "Invalid email format.", 400);

  const tester = await isAiTester(email);
  const user = await db.user.findUnique({ where: { email } });
  const usageByAssistant = !user
    ? KNOWN_ASSISTANTS.map((assistant) => ({ assistant, used: 0, limit: 0, remaining: 0 }))
    : await Promise.all(KNOWN_ASSISTANTS.map(async (assistant) => ({ assistant, ...(await getAiDailyUsage(user.id, assistant)) })));

  return NextResponse.json({
    success: true,
    data: { email, isTester: tester, userId: user?.id ?? null, usage: usageByAssistant },
    error: null,
  });
}

async function handlePromote(request: Request, emailUnknown: unknown) {
  const actor = await getJeepworkSessionUser(request);
  const email = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(email)) return apiError("BAD_BODY", "Invalid email format.", 400);

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_USER_ROLE,
      targetType: "user",
      targetId: email,
      metadata: { targetEmail: email, newRole: ROLE_SUPER_ADMIN, reason: "email_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "User not found.", 404);
  }

  const oldRole = user.role;
  await db.user.update({ where: { id: user.id }, data: { role: ROLE_SUPER_ADMIN } });

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.UPDATE_USER_ROLE,
    targetType: "user",
    targetId: user.id,
    metadata: { targetEmail: email, oldRole, newRole: ROLE_SUPER_ADMIN },
    request,
    success: true,
  });

  return NextResponse.json({
    success: true,
    data: { message: `已将 ${email} 提升为超级管理员`, userId: user.id, email, oldRole, newRole: ROLE_SUPER_ADMIN },
    error: null,
  });
}

async function handleTestAiConnection() {
  const config = await getConfig();
  if (!config.aiApiKey) return apiError("BAD_BODY", "请先填写完整 AI API Key", 400);

  const baseUrl = config.aiBaseUrl.endsWith("/") ? config.aiBaseUrl.slice(0, -1) : config.aiBaseUrl;
  const blocked = assertSafeOutboundUrl(baseUrl, "AI Base URL");
  if (blocked) return blocked;

  const controller = new AbortController();
  const timeoutMs = 6000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiResponse = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.aiApiKey}` },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "UPSTREAM_ERROR", message: `AI 服务连接失败（HTTP ${apiResponse.status}）` } },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: `AI 连接成功�?{config.aiProvider} / ${config.aiModel}`, provider: config.aiProvider, model: config.aiModel },
      error: null,
    });
  } catch (error) {
    const message = redactKeys(error instanceof Error ? error.message : "无法连接 AI 服务");
    return apiError("UPSTREAM_ERROR", `AI connectivity test failed: ${message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

async function handleTestMail(emailUnknown: unknown) {
  const targetEmail = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(targetEmail)) return apiError("BAD_BODY", "请输入用于测试的收件邮箱", 400);

  const config = await getConfig();
  if (!config.mailEnabled) return apiError("BAD_BODY", "邮件服务尚未启用", 400);
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.mailFrom)
    return apiError("BAD_BODY", "SMTP 配置不完整，请先保存后再测试", 400);

  // �?smtpHost �?SSRF 保护（不允许环回/私有/元数据）
  const smtpHostLower = config.smtpHost.toLowerCase();
  if (isPrivateOrReservedHost(smtpHostLower)) {
    return apiError("FORBIDDEN", "SMTP host must not target a private or local host.", 400);
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecureMode === "ssl",
    requireTLS: config.smtpSecureMode === "tls",
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 10000,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: config.mailFrom,
      to: targetEmail,
      subject: "Link168 SMTP test email",
      text: "This is a test email from the Link168 admin settings center.",
      html: "<p>This is a test email from the <strong>Link168</strong> admin settings center.</p>",
    });
    return NextResponse.json({
      success: true,
      data: { message: `测试邮件已发送至 ${targetEmail}`, targetEmail },
      error: null,
    });
  } catch (error) {
    const message = redactKeys(error instanceof Error ? error.message : "SMTP 测试失败");
    return apiError("UPSTREAM_ERROR", `SMTP test failed: ${message}`, 502);
  }
}

async function handleTestStorage() {
  const config = await getConfig();
  if (!config.storageEnabled) return apiError("BAD_BODY", "对象存储尚未启用", 400);

  if (config.storageProvider === "local") {
    return NextResponse.json({
      success: true,
      data: { message: "Local storage mode is available. Uploads will be written to the server local directory.", provider: "local" },
      error: null,
    });
  }

  if (config.storageEndpoint) {
    const blocked = assertSafeOutboundUrl(config.storageEndpoint, "对象存储");
    if (blocked) return blocked;
  }

  return NextResponse.json({
    success: true,
    data: { message: "Cloud storage config has been saved. Live vendor connectivity testing remains disabled in this build.", provider: config.storageProvider },
    error: null,
  });
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: { action?: unknown; email?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; email?: unknown };
  } catch {
    return apiError("BAD_BODY", "Request body must be valid JSON.", 400);
  }

  switch (body.action) {
    case "test-email":
      return handleTestWhitelist(body.email);
    case "promote-super-admin":
      return handlePromote(request, body.email);
    case "test-ai-connection":
      return handleTestAiConnection();
    case "test-mail":
      return handleTestMail(body.email);
    case "test-storage":
      return handleTestStorage();
    case "test-payment":
      return NextResponse.json({
        success: true,
        data: { message: "Payment config is present. Live payment testing remains disabled in this build.", test: "payment" },
        error: null,
      });
    case "test-sms":
      return NextResponse.json({
        success: true,
        data: { message: "SMS config is present. Live SMS sending remains disabled in this build.", test: "sms" },
        error: null,
      });
    default:
      return apiError("BAD_BODY", "Unknown action.", 400);
  }
}

