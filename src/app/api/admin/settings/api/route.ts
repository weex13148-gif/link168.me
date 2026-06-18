import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
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
import { db } from "@/lib/db";
import { ROLE_SUPER_ADMIN } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AI_PROVIDERS: AiProvider[] = ["openai", "deepseek", "qwen", "doubao", "zhipu", "openai-compatible"];
const STORAGE_PROVIDERS: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
const SMTP_SECURE_MODES: SmtpSecureMode[] = ["ssl", "tls", "none"];
const KNOWN_ASSISTANTS = Object.values(AI_ASSISTANTS);

type UpdateBody = Partial<Record<keyof AppConfigValues, unknown>>;

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

function safeErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (!message) return fallback;
  return message.replace(/sk-[A-Za-z0-9_\-]+/g, "sk-****").replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer ****");
}

function validateAndCoerce(body: UpdateBody): Partial<AppConfigValues> {
  const aiProviderRaw = parseString(body.aiProvider, DEFAULT_CONFIG.aiProvider).toLowerCase() as AiProvider;
  const storageProviderRaw = parseString(body.storageProvider, DEFAULT_CONFIG.storageProvider).toLowerCase() as StorageProvider;
  const smtpSecureModeRaw = parseString(body.smtpSecureMode, DEFAULT_CONFIG.smtpSecureMode).toLowerCase() as SmtpSecureMode;

  return {
    aiEnabled: parseBoolean(body.aiEnabled, DEFAULT_CONFIG.aiEnabled),
    aiProvider: AI_PROVIDERS.includes(aiProviderRaw) ? aiProviderRaw : DEFAULT_CONFIG.aiProvider,
    aiBaseUrl: parseString(body.aiBaseUrl, DEFAULT_CONFIG.aiBaseUrl),
    aiModel: parseString(body.aiModel, DEFAULT_CONFIG.aiModel),
    aiApiKey: parseString(body.aiApiKey, ""),
    aiDailyLimitTotal: parseNumber(body.aiDailyLimitTotal, DEFAULT_CONFIG.aiDailyLimitTotal, 1, 1_000_000),
    aiDailyLimitPerUser: parseNumber(body.aiDailyLimitPerUser, DEFAULT_CONFIG.aiDailyLimitPerUser, 1, 100_000),
    aiTesterEmails: parseStringArray(body.aiTesterEmails),
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
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const config = await getMaskedConfig();
  return NextResponse.json({ success: true, config });
}

export async function PUT(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  try {
    await updateConfig(validateAndCoerce(body));
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, "保存配置失败") }, { status: 400 });
  }

  const config = await getMaskedConfig();
  return NextResponse.json({ success: true, config });
}

type TestActionBody = {
  action?: unknown;
  email?: unknown;
};

async function handleTestWhitelist(emailUnknown: unknown) {
  const email = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ success: false, error: "邮箱格式不正确" }, { status: 400 });
  }

  const tester = await isAiTester(email);
  const user = await db.user.findUnique({ where: { email } });
  const usageByAssistant = !user
    ? KNOWN_ASSISTANTS.map((assistant) => ({ assistant, used: 0, limit: 0, remaining: 0 }))
    : await Promise.all(
        KNOWN_ASSISTANTS.map(async (assistant) => {
          const usage = await getAiDailyUsage(user.id, assistant);
          return { assistant, ...usage };
        }),
      );

  return NextResponse.json({ success: true, email, isTester: tester, userId: user?.id ?? null, usage: usageByAssistant });
}

async function handlePromote(emailUnknown: unknown) {
  const email = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ success: false, error: "邮箱格式不正确" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: false, error: "该邮箱尚未注册" }, { status: 404 });
  }

  await db.user.update({ where: { id: user.id }, data: { role: ROLE_SUPER_ADMIN } });
  return NextResponse.json({ success: true, message: `已将 ${email} 提升为超级管理员` });
}

async function handleTestAiConnection() {
  const config = await getConfig();
  if (!config.aiApiKey) {
    return NextResponse.json({ success: false, error: "请先填写完整 AI API Key" }, { status: 400 });
  }

  const baseUrl = config.aiBaseUrl.endsWith("/") ? config.aiBaseUrl.slice(0, -1) : config.aiBaseUrl;

  try {
    const apiResponse = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.aiApiKey}` },
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      return NextResponse.json({ success: false, error: `AI 服务连接失败（HTTP ${apiResponse.status}）` }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: `AI 连接成功：${config.aiProvider} / ${config.aiModel}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, "无法连接 AI 服务") }, { status: 502 });
  }
}

async function handleTestMail(emailUnknown: unknown) {
  const targetEmail = parseString(emailUnknown).toLowerCase();
  if (!EMAIL_REGEX.test(targetEmail)) {
    return NextResponse.json({ success: false, error: "请输入用于测试的收件邮箱" }, { status: 400 });
  }

  const config = await getConfig();
  if (!config.mailEnabled) {
    return NextResponse.json({ success: false, error: "邮件服务尚未启用" }, { status: 400 });
  }
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.mailFrom) {
    return NextResponse.json({ success: false, error: "SMTP 配置不完整，请先保存后再测试" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecureMode === "ssl",
    requireTLS: config.smtpSecureMode === "tls",
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: config.mailFrom,
      to: targetEmail,
      subject: "Link168 SMTP 测试邮件",
      text: "这是一封来自 Link168 超级管理员配置中心的测试邮件。",
      html: "<p>这是一封来自 <strong>Link168</strong> 超级管理员配置中心的测试邮件。</p>",
    });
    return NextResponse.json({ success: true, message: `测试邮件已发送至 ${targetEmail}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, "SMTP 测试失败") }, { status: 502 });
  }
}

async function handleTestStorage() {
  const config = await getConfig();
  if (!config.storageEnabled) {
    return NextResponse.json({ success: false, error: "对象存储尚未启用" }, { status: 400 });
  }

  if (config.storageProvider === "local") {
    return NextResponse.json({ success: true, message: "本地存储模式可用，上传将写入服务器本地目录" });
  }

  return NextResponse.json({
    success: true,
    message: "云存储配置已保存。内测版暂不开放真实云厂商连通性测试，请由老板或运维在服务器侧验证。",
  });
}

async function handleTestPayment() {
  return NextResponse.json({
    success: true,
    message: "支付配置预留已启用。内测版暂不开放真实支付测试，请保持默认关闭。",
  });
}

async function handleTestSms() {
  return NextResponse.json({
    success: true,
    message: "短信配置预留已启用。内测版暂不开放真实短信发送。",
  });
}

export async function POST(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: TestActionBody;
  try {
    body = (await request.json()) as TestActionBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  switch (body.action) {
    case "test-email":
      return handleTestWhitelist(body.email);
    case "promote-super-admin":
      return handlePromote(body.email);
    case "test-ai-connection":
      return handleTestAiConnection();
    case "test-mail":
      return handleTestMail(body.email);
    case "test-storage":
      return handleTestStorage();
    case "test-payment":
      return handleTestPayment();
    case "test-sms":
      return handleTestSms();
    default:
      return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
  }
}
