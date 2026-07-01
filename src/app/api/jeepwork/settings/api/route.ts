import net from "node:net";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import {
  AI_ASSISTANTS,
  getAiDailyUsage,
  getConfig,
  getMaskedConfig,
  isAiTester,
  SENSITIVE_KEYS,
  updateConfig,
  type AiProvider,
  type AppConfigValues,
  type SmtpSecureMode,
  type StorageProvider,
} from "@/lib/app-config";
import { ROLE_SUPER_ADMIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJeepworkSessionUser, requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AI_PROVIDERS: AiProvider[] = ["openai", "deepseek", "qwen", "bailian", "doubao", "zhipu", "openai-compatible"];
const STORAGE_PROVIDERS: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
const SMTP_MODES: SmtpSecureMode[] = ["ssl", "tls", "none"];
const ASSISTANTS = Object.values(AI_ASSISTANTS);

type VisibleConfigInput = Partial<Record<keyof AppConfigValues, unknown>>;

function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function emailList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return values.map((item) => text(item).toLowerCase()).filter((item) => EMAIL_REGEX.test(item));
}

function safeHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (["100.100.100.200", "169.254.169.254", "0.0.0.0", "metadata.google.internal"].includes(host)) return false;
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
  }
  if (ipVersion === 6) {
    if (host === "::" || host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;
  }
  return true;
}

function safeHttpsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && safeHost(url.hostname);
  } catch {
    return false;
  }
}

function visibleConfig(config: VisibleConfigInput) {
  return {
    ...config,
    smtpHost: text(config.smtpHost) || "smtpdm.aliyun.com",
    smtpPort: numberValue(config.smtpPort, 465, 1, 65535),
    smtpUser: text(config.smtpUser) || "no-reply@notice.link168.me",
    mailFrom: text(config.mailFrom) || "Link168 <no-reply@notice.link168.me>",
    smtpSecureMode: text(config.smtpSecureMode) || "ssl",
    mailAppUrl: text(config.mailAppUrl) || "https://link168.me",
  };
}

function buildPatch(body: Record<string, unknown>): Partial<AppConfigValues> {
  const patch: Partial<AppConfigValues> = {};
  const has = (key: keyof AppConfigValues) => Object.prototype.hasOwnProperty.call(body, key);

  const booleanKeys: Array<keyof AppConfigValues> = [
    "aiEnabled", "aiPublicEnabled", "aiAssistantTaxEnabled", "aiAssistantLegalEnabled", "aiAssistantMarketEnabled",
    "aiAssistantDesignEnabled", "aiAssistantSocialEnabled", "mailEnabled", "paymentEnabled", "paymentWechatEnabled",
    "paymentAlipayEnabled", "paymentTestMode", "storageEnabled", "smsEnabled", "analyticsEnabled", "webhookEnabled",
  ];
  for (const key of booleanKeys) if (has(key)) (patch as Record<string, unknown>)[key] = body[key] === true;

  const stringKeys: Array<keyof AppConfigValues> = [
    "aiBaseUrl", "aiApiKey", "aiModel", "aiBailianAppId", "aiBailianBaseUrl", "aiBailianWorkspaceId",
    "smtpHost", "smtpUser", "smtpPassword", "mailFrom", "mailAppUrl", "paymentMerchantId", "paymentAppId",
    "paymentApiKey", "paymentAlipayAppId", "paymentAlipayAppPrivateKey", "paymentAlipayPublicKey",
    "paymentAlipaySellerId", "paymentCertPath", "paymentNotifyUrl", "paymentAlipayNotifyUrl", "storageEndpoint",
    "storageBucket", "storageRegion", "storageAccessKeyId", "storageAccessKeySecret", "storageUploadPrefix",
    "smsProvider", "smsAccessKeyId", "smsAccessKeySecret", "smsSignName", "smsTemplateId", "mapApiKey",
    "analyticsProvider", "analyticsKey", "webhookUrl", "customApiConfig",
  ];
  for (const key of stringKeys) {
    if (!has(key)) continue;
    const value = text(body[key]);
    if (SENSITIVE_KEYS.has(key) && (!value || value.includes("****"))) continue;
    (patch as Record<string, unknown>)[key] = value;
  }

  if (has("aiProvider")) {
    const provider = text(body.aiProvider).toLowerCase() as AiProvider;
    if (AI_PROVIDERS.includes(provider)) patch.aiProvider = provider;
  }
  if (has("storageProvider")) {
    const provider = text(body.storageProvider).toLowerCase() as StorageProvider;
    if (STORAGE_PROVIDERS.includes(provider)) patch.storageProvider = provider;
  }
  if (has("smtpSecureMode")) {
    const mode = text(body.smtpSecureMode).toLowerCase() as SmtpSecureMode;
    patch.smtpSecureMode = SMTP_MODES.includes(mode) ? mode : "ssl";
  }
  if (has("aiTesterEmails")) patch.aiTesterEmails = emailList(body.aiTesterEmails);
  if (has("smtpPort")) patch.smtpPort = numberValue(body.smtpPort, 465, 1, 65535);
  if (has("aiDailyLimitTotal")) patch.aiDailyLimitTotal = numberValue(body.aiDailyLimitTotal, 500, 1, 1_000_000);
  if (has("aiDailyLimitPerUser")) patch.aiDailyLimitPerUser = numberValue(body.aiDailyLimitPerUser, 50, 1, 100_000);
  if (has("aiRequestTimeout")) patch.aiRequestTimeout = numberValue(body.aiRequestTimeout, 45, 10, 120);
  if (has("aiMaxOutputTokens")) patch.aiMaxOutputTokens = numberValue(body.aiMaxOutputTokens, 1500, 100, 8000);
  if (has("aiTemperature")) patch.aiTemperature = numberValue(body.aiTemperature, 0.3, 0, 2);
  return patch;
}

function mailFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("535") || lower.includes("auth") || lower.includes("password")) return "SMTP 密码错误，或阿里云发信地址未授权。";
  if (lower.includes("timeout") || lower.includes("timed out")) return "连接 SMTP 服务器超时，请检查服务器网络和端口。";
  if (lower.includes("enotfound")) return "SMTP 服务器地址无法解析，请检查服务器地址。";
  if (lower.includes("econnrefused") || lower.includes("connect")) return "无法连接 SMTP 服务器，请检查端口和加密方式。";
  if (lower.includes("sender") || lower.includes("from")) return "发信地址被拒绝，请确认阿里云发信地址已经验证。";
  return "测试邮件发送失败，请检查 SMTP 配置后重试。";
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const config = await getMaskedConfig();
  return NextResponse.json({ success: true, data: visibleConfig(config), error: null });
}

export async function PUT(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse("BAD_BODY", "请求格式不正确。", 400);
  }

  const patch = buildPatch(body);
  if (patch.aiBaseUrl && !safeHttpsUrl(patch.aiBaseUrl)) return errorResponse("BAD_URL", "AI 接口地址必须是安全的 HTTPS 公网地址。", 400);
  if (patch.aiBailianBaseUrl && !safeHttpsUrl(patch.aiBailianBaseUrl)) return errorResponse("BAD_URL", "百炼接口地址必须是安全的 HTTPS 公网地址。", 400);
  if (patch.webhookUrl && !safeHttpsUrl(patch.webhookUrl)) return errorResponse("BAD_URL", "Webhook 地址必须是安全的 HTTPS 公网地址。", 400);
  if (patch.paymentNotifyUrl && !safeHttpsUrl(patch.paymentNotifyUrl)) return errorResponse("BAD_URL", "支付回调地址必须是安全的 HTTPS 公网地址。", 400);
  if (patch.paymentAlipayNotifyUrl && !safeHttpsUrl(patch.paymentAlipayNotifyUrl)) return errorResponse("BAD_ALIPAY_NOTIFY_URL", "支付宝异步通知地址必须是安全的 HTTPS 公网地址。", 400);
  if (patch.storageEndpoint && !safeHttpsUrl(patch.storageEndpoint)) return errorResponse("BAD_URL", "对象存储地址必须是安全的 HTTPS 公网地址。", 400);

  const currentConfig = await getConfig();
  const nextPaymentEnabled = patch.paymentEnabled ?? currentConfig.paymentEnabled;
  const nextAlipayEnabled = patch.paymentAlipayEnabled ?? currentConfig.paymentAlipayEnabled;
  const nextTestMode = patch.paymentTestMode ?? currentConfig.paymentTestMode;
  const nextAlipayNotifyUrl = patch.paymentAlipayNotifyUrl ?? currentConfig.paymentAlipayNotifyUrl ?? currentConfig.paymentNotifyUrl;
  if (nextPaymentEnabled && nextAlipayEnabled && !nextTestMode && !nextAlipayNotifyUrl) {
    return errorResponse("ALIPAY_NOTIFY_REQUIRED", "正式收款模式必须填写支付宝公网 HTTPS 异步通知地址。", 400);
  }
  if (nextPaymentEnabled && nextAlipayEnabled && !nextTestMode && !safeHttpsUrl(nextAlipayNotifyUrl)) {
    return errorResponse("BAD_ALIPAY_NOTIFY_URL", "正式收款模式的支付宝通知地址必须是安全的 HTTPS 公网地址。", 400);
  }

  try {
    await updateConfig(patch);
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
      targetType: "system_config",
      targetId: "app-config",
      metadata: { updatedKeys: Object.keys(patch) },
      request,
      success: true,
    });
    const config = await getMaskedConfig();
    return NextResponse.json({ success: true, data: visibleConfig(config), message: "配置已保存。", error: null });
  } catch {
    return errorResponse("SAVE_FAILED", "配置保存失败，请稍后重试。", 500);
  }
}

async function testMail(emailValue: unknown) {
  const targetEmail = text(emailValue).toLowerCase();
  if (!EMAIL_REGEX.test(targetEmail)) return errorResponse("BAD_EMAIL", "请输入正确的测试收件邮箱。", 400);

  const config = await getConfig();
  if (!config.mailEnabled) return errorResponse("MAIL_DISABLED", "邮件服务总开关尚未开启。", 400);
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.mailFrom) {
    return errorResponse("MAIL_INCOMPLETE", "SMTP 配置不完整，请先保存服务器地址、发信地址、密码和发件人。", 400);
  }
  if (!safeHost(config.smtpHost)) return errorResponse("BAD_SMTP_HOST", "SMTP 服务器地址不允许使用本地或内网地址。", 400);

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecureMode === "ssl",
    requireTLS: config.smtpSecureMode === "tls",
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: config.mailFrom,
      to: targetEmail,
      subject: "Link168 邮件服务测试成功",
      text: "收到本邮件表示 Link168 SMTP 配置可以正常发送注册验证码和忘记密码邮件。",
      html: "<h2>Link168 邮件服务测试成功</h2><p>收到本邮件表示 SMTP 配置可以正常发送注册验证码和忘记密码邮件。</p>",
    });
    return NextResponse.json({ success: true, data: { message: "测试邮件发送成功，请检查收件箱或垃圾箱。" }, error: null });
  } catch (error) {
    return errorResponse("SMTP_FAILED", mailFailureMessage(error), 502);
  }
}

async function testWhitelist(emailValue: unknown) {
  const email = text(emailValue).toLowerCase();
  if (!EMAIL_REGEX.test(email)) return errorResponse("BAD_EMAIL", "请输入正确的邮箱地址。", 400);
  const tester = await isAiTester(email);
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  const usage = user
    ? await Promise.all(ASSISTANTS.map(async (assistant) => ({ assistant, ...(await getAiDailyUsage(user.id, assistant)) })))
    : [];
  return NextResponse.json({ success: true, data: { message: tester ? "该邮箱在 AI 测试白名单中。" : "该邮箱不在 AI 测试白名单中。", email, isTester: tester, usage }, error: null });
}

async function promoteSuperAdmin(emailValue: unknown) {
  const email = text(emailValue).toLowerCase();
  if (!EMAIL_REGEX.test(email)) return errorResponse("BAD_EMAIL", "请输入正确的邮箱地址。", 400);
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return errorResponse("NOT_FOUND", "没有找到该用户。", 404);
  await db.user.update({ where: { id: user.id }, data: { role: ROLE_SUPER_ADMIN } });
  return NextResponse.json({ success: true, data: { message: `已将 ${email} 设置为超级管理员。` }, error: null });
}

async function testAi() {
  const config = await getConfig();
  if (!config.aiEnabled) return errorResponse("AI_DISABLED", "AI 服务总开关尚未开启。", 400);
  if (!config.aiApiKey) return errorResponse("AI_INCOMPLETE", "请先填写完整的 AI API Key。", 400);
  if (config.aiProvider === "bailian" && !config.aiBailianAppId) return errorResponse("AI_INCOMPLETE", "请先填写百炼应用 App ID。", 400);
  return NextResponse.json({ success: true, data: { message: "AI 配置项完整。真实对话请在企业 AI 页面验证。" }, error: null });
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  let body: { action?: unknown; email?: unknown };
  try {
    body = await request.json() as { action?: unknown; email?: unknown };
  } catch {
    return errorResponse("BAD_BODY", "请求格式不正确。", 400);
  }

  switch (body.action) {
    case "test-mail": return testMail(body.email);
    case "test-email": return testWhitelist(body.email);
    case "promote-super-admin": return promoteSuperAdmin(body.email);
    case "test-ai-connection": return testAi();
    case "test-storage": return NextResponse.json({ success: true, data: { message: "存储配置已保存；云厂商实时连通测试尚未启用。" }, error: null });
    case "test-payment": return NextResponse.json({ success: true, data: { message: "请在支付宝与收费页面使用专用签名测试、查单和补单工具。" }, error: null });
    case "test-sms": return NextResponse.json({ success: true, data: { message: "短信配置已保存；内测阶段真实短信发送尚未启用。" }, error: null });
    default: return errorResponse("BAD_ACTION", "不支持的操作。", 400);
  }
}
