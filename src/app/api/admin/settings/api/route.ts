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
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AI_PROVIDERS: AiProvider[] = ["openai", "deepseek", "qwen", "doubao", "zhipu", "openai-compatible"];
const STORAGE_PROVIDERS: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
const SMTP_SECURE_MODES: SmtpSecureMode[] = ["ssl", "tls", "none"];
const KNOWN_ASSISTANTS = Object.values(AI_ASSISTANTS);

const BOOLEAN_KEYS = new Set<keyof AppConfigValues>([
  "aiEnabled",
  "aiAssistantTaxEnabled",
  "aiAssistantLegalEnabled",
  "aiAssistantMarketEnabled",
  "aiAssistantDesignEnabled",
  "aiAssistantSocialEnabled",
  "mailEnabled",
  "paymentEnabled",
  "paymentWechatEnabled",
  "paymentAlipayEnabled",
  "paymentTestMode",
  "storageEnabled",
  "smsEnabled",
  "analyticsEnabled",
  "webhookEnabled",
]);

const NUMBER_LIMITS: Partial<Record<keyof AppConfigValues, { min: number; max: number }>> = {
  aiDailyLimitTotal: { min: 1, max: 1_000_000 },
  aiDailyLimitPerUser: { min: 1, max: 100_000 },
  smtpPort: { min: 1, max: 65_535 },
};

type UpdateBody = Partial<Record<keyof AppConfigValues, unknown>>;
type TestActionBody = {
  action?: unknown;
  email?: unknown;
};

const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

function parseBoolean(value: unknown, fallback = false) {
  return value === true ? true : value === false ? false : fallback;
}

function parseString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function parseStringArray(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return Array.from(
    new Set(
      source
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter((item) => EMAIL_REGEX.test(item)),
    ),
  );
}

function safeErrorMessage(error: unknown, fallback: string) {
  if (process.env.NODE_ENV === "production") return fallback;
  const message = error instanceof Error ? error.message : fallback;
  if (!message) return fallback;
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-****")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer ****")
    .slice(0, 240);
}

function validateAndCoerce(body: UpdateBody): Partial<AppConfigValues> {
  const patch: Partial<AppConfigValues> = {};
  const mutable = patch as Record<string, unknown>;

  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof AppConfigValues)[]) {
    if (!hasOwn(body, key)) continue;
    const value = body[key];

    if (BOOLEAN_KEYS.has(key)) {
      mutable[key] = parseBoolean(value, DEFAULT_CONFIG[key] as boolean);
      continue;
    }

    const numberLimit = NUMBER_LIMITS[key];
    if (numberLimit) {
      mutable[key] = parseNumber(value, DEFAULT_CONFIG[key] as number, numberLimit.min, numberLimit.max);
      continue;
    }

    if (key === "aiProvider") {
      const normalized = parseString(value, DEFAULT_CONFIG.aiProvider).toLowerCase() as AiProvider;
      patch.aiProvider = AI_PROVIDERS.includes(normalized) ? normalized : DEFAULT_CONFIG.aiProvider;
      continue;
    }

    if (key === "storageProvider") {
      const normalized = parseString(value, DEFAULT_CONFIG.storageProvider).toLowerCase() as StorageProvider;
      patch.storageProvider = STORAGE_PROVIDERS.includes(normalized) ? normalized : DEFAULT_CONFIG.storageProvider;
      continue;
    }

    if (key === "smtpSecureMode") {
      const normalized = parseString(value, DEFAULT_CONFIG.smtpSecureMode).toLowerCase() as SmtpSecureMode;
      patch.smtpSecureMode = SMTP_SECURE_MODES.includes(normalized) ? normalized : DEFAULT_CONFIG.smtpSecureMode;
      continue;
    }

    if (key === "aiTesterEmails") {
      patch.aiTesterEmails = parseStringArray(value);
      continue;
    }

    mutable[key] = parseString(value, String(DEFAULT_CONFIG[key] ?? ""));
  }

  return patch;
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

function getSafeExternalBaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) return null;
    if (!url.hostname || url.username || url.password || isBlockedHostname(url.hostname)) return null;
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
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

  const rl = rateLimit(request, "admin-settings:update", 30, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json({ success: false, error: "保存过于频繁，请稍后再试。" }, { status: 429 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const patch = validateAndCoerce(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: "没有可保存的配置。" }, { status: 400 });
  }

  try {
    await updateConfig(patch);
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, "保存配置失败") }, { status: 400 });
  }

  const config = await getMaskedConfig();
  return NextResponse.json({ success: true, config });
}

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
  if (user.role === ROLE_SUPER_ADMIN) {
    return NextResponse.json({ success: true, message: `${email} 已经是超级管理员` });
  }

  await db.user.update({ where: { id: user.id }, data: { role: ROLE_SUPER_ADMIN } });
  return NextResponse.json({ success: true, message: `已将 ${email} 提升为超级管理员` });
}

async function handleTestAiConnection() {
  const config = await getConfig();
  if (!config.aiApiKey) {
    return NextResponse.json({ success: false, error: "请先填写完整 AI API Key" }, { status: 400 });
  }

  const baseUrl = getSafeExternalBaseUrl(config.aiBaseUrl);
  if (!baseUrl) {
    return NextResponse.json({ success: false, error: "AI Base URL 无效或指向受限网络地址。" }, { status: 400 });
  }

  try {
    const endpoint = new URL(`${baseUrl.toString().replace(/\/$/, "")}/models`);
    const apiResponse = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.aiApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
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
  } finally {
    transporter.close();
  }
}

async function handleTestStorage() {
  const config = await getConfig();
  if (!config.storageEnabled) {
    return NextResponse.json({ success: false, error: "对象存储尚未启用" }, { status: 400 });
  }

  if (config.storageProvider === "local") {
    return NextResponse.json({ success: true, message: "本地存储模式已启用。" });
  }

  return NextResponse.json(
    { success: false, error: "云存储真实连通性测试尚未实现，不能判定配置可用。" },
    { status: 501 },
  );
}

async function handleTestPayment() {
  return NextResponse.json(
    { success: false, error: "真实支付测试尚未实现，请保持支付总开关关闭。" },
    { status: 501 },
  );
}

async function handleTestSms() {
  return NextResponse.json(
    { success: false, error: "真实短信发送测试尚未实现，请保持短信总开关关闭。" },
    { status: 501 },
  );
}

export async function POST(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const rl = rateLimit(request, "admin-settings:action", 20, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json({ success: false, error: "操作过于频繁，请稍后再试。" }, { status: 429 });
  }

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
