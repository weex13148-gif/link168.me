import crypto from "crypto";
import { db } from "@/lib/db";

export const AI_ASSISTANTS = {
  tax: "财税 AI Agent",
  legal: "法务 AI Agent",
  market: "市场调研 AI Agent",
  design: "设计 AI Agent",
  social: "社媒运营 AI Agent",
} as const;

export type AiAssistantKey = keyof typeof AI_ASSISTANTS;
export type AiProvider =
  | "openai"
  | "deepseek"
  | "qwen"
  | "doubao"
  | "zhipu"
  | "openai-compatible";
export type StorageProvider = "local" | "aliyun-oss" | "tencent-cos";
export type SmtpSecureMode = "ssl" | "tls" | "none";

export type AppConfigValues = {
  aiEnabled: boolean;
  aiProvider: AiProvider;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiDailyLimitTotal: number;
  aiDailyLimitPerUser: number;
  aiTesterEmails: string[];
  aiAssistantTaxEnabled: boolean;
  aiAssistantLegalEnabled: boolean;
  aiAssistantMarketEnabled: boolean;
  aiAssistantDesignEnabled: boolean;
  aiAssistantSocialEnabled: boolean;

  mailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  mailFrom: string;
  smtpSecureMode: SmtpSecureMode;

  paymentEnabled: boolean;
  paymentWechatEnabled: boolean;
  paymentAlipayEnabled: boolean;
  paymentMerchantId: string;
  paymentAppId: string;
  paymentApiKey: string;
  paymentCertPath: string;
  paymentNotifyUrl: string;
  paymentTestMode: boolean;

  storageEnabled: boolean;
  storageProvider: StorageProvider;
  storageEndpoint: string;
  storageBucket: string;
  storageRegion: string;
  storageAccessKeyId: string;
  storageAccessKeySecret: string;
  storageUploadPrefix: string;

  smsEnabled: boolean;
  smsProvider: string;
  smsAccessKeyId: string;
  smsAccessKeySecret: string;
  smsSignName: string;
  smsTemplateId: string;

  mapApiKey: string;
  analyticsEnabled: boolean;
  analyticsProvider: string;
  analyticsKey: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  customApiConfig: string;
};

type ConfigValueType = "boolean" | "string" | "number" | "json";
type AppConfigKey = keyof AppConfigValues;
type ConfigDef<K extends AppConfigKey = AppConfigKey> = {
  key: K;
  dbKey: string;
  legacyKeys?: string[];
  type: ConfigValueType;
  sensitive?: boolean;
};

export const DEFAULT_CONFIG: AppConfigValues = {
  aiEnabled: false,
  aiProvider: "openai-compatible",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiApiKey: "",
  aiDailyLimitTotal: 500,
  aiDailyLimitPerUser: 50,
  aiTesterEmails: [],
  aiAssistantTaxEnabled: false,
  aiAssistantLegalEnabled: false,
  aiAssistantMarketEnabled: false,
  aiAssistantDesignEnabled: false,
  aiAssistantSocialEnabled: false,

  mailEnabled: false,
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  mailFrom: "",
  smtpSecureMode: "ssl",

  paymentEnabled: false,
  paymentWechatEnabled: false,
  paymentAlipayEnabled: false,
  paymentMerchantId: "",
  paymentAppId: "",
  paymentApiKey: "",
  paymentCertPath: "",
  paymentNotifyUrl: "",
  paymentTestMode: true,

  storageEnabled: false,
  storageProvider: "local",
  storageEndpoint: "",
  storageBucket: "",
  storageRegion: "",
  storageAccessKeyId: "",
  storageAccessKeySecret: "",
  storageUploadPrefix: "uploads",

  smsEnabled: false,
  smsProvider: "",
  smsAccessKeyId: "",
  smsAccessKeySecret: "",
  smsSignName: "",
  smsTemplateId: "",

  mapApiKey: "",
  analyticsEnabled: false,
  analyticsProvider: "",
  analyticsKey: "",
  webhookEnabled: false,
  webhookUrl: "",
  customApiConfig: "",
};

const CONFIG_DEFS: ConfigDef[] = [
  { key: "aiEnabled", dbKey: "ai.enabled", legacyKeys: ["aiEnabled"], type: "boolean" },
  { key: "aiProvider", dbKey: "ai.provider", type: "string" },
  { key: "aiBaseUrl", dbKey: "ai.baseUrl", legacyKeys: ["aiBaseUrl"], type: "string" },
  { key: "aiModel", dbKey: "ai.model", legacyKeys: ["aiModel"], type: "string" },
  { key: "aiApiKey", dbKey: "ai.apiKey", legacyKeys: ["aiApiKey"], type: "string", sensitive: true },
  { key: "aiDailyLimitTotal", dbKey: "ai.dailyLimit", type: "number" },
  { key: "aiDailyLimitPerUser", dbKey: "ai.userDailyLimit", legacyKeys: ["aiDailyLimitPerUser"], type: "number" },
  { key: "aiTesterEmails", dbKey: "ai.testWhitelist", legacyKeys: ["aiTesterEmails"], type: "json" },
  { key: "aiAssistantTaxEnabled", dbKey: "ai.assistant.tax.enabled", type: "boolean" },
  { key: "aiAssistantLegalEnabled", dbKey: "ai.assistant.legal.enabled", type: "boolean" },
  { key: "aiAssistantMarketEnabled", dbKey: "ai.assistant.market.enabled", type: "boolean" },
  { key: "aiAssistantDesignEnabled", dbKey: "ai.assistant.design.enabled", type: "boolean" },
  { key: "aiAssistantSocialEnabled", dbKey: "ai.assistant.social.enabled", type: "boolean" },

  { key: "mailEnabled", dbKey: "mail.enabled", legacyKeys: ["emailEnabled"], type: "boolean" },
  { key: "smtpHost", dbKey: "mail.smtpHost", type: "string" },
  { key: "smtpPort", dbKey: "mail.smtpPort", type: "number" },
  { key: "smtpUser", dbKey: "mail.smtpUser", type: "string" },
  { key: "smtpPassword", dbKey: "mail.smtpPassword", type: "string", sensitive: true },
  { key: "mailFrom", dbKey: "mail.from", type: "string" },
  { key: "smtpSecureMode", dbKey: "mail.secure", type: "string" },

  { key: "paymentEnabled", dbKey: "payment.enabled", legacyKeys: ["paymentEnabled"], type: "boolean" },
  { key: "paymentWechatEnabled", dbKey: "payment.wechat.enabled", type: "boolean" },
  { key: "paymentAlipayEnabled", dbKey: "payment.alipay.enabled", type: "boolean" },
  { key: "paymentMerchantId", dbKey: "payment.merchantId", type: "string", sensitive: true },
  { key: "paymentAppId", dbKey: "payment.appId", type: "string" },
  { key: "paymentApiKey", dbKey: "payment.apiKey", type: "string", sensitive: true },
  { key: "paymentCertPath", dbKey: "payment.certPath", type: "string" },
  { key: "paymentNotifyUrl", dbKey: "payment.notifyUrl", type: "string" },
  { key: "paymentTestMode", dbKey: "payment.testMode", type: "boolean" },

  { key: "storageEnabled", dbKey: "storage.enabled", type: "boolean" },
  { key: "storageProvider", dbKey: "storage.provider", legacyKeys: ["storageProvider"], type: "string" },
  { key: "storageEndpoint", dbKey: "storage.endpoint", type: "string" },
  { key: "storageBucket", dbKey: "storage.bucket", type: "string" },
  { key: "storageRegion", dbKey: "storage.region", type: "string" },
  { key: "storageAccessKeyId", dbKey: "storage.accessKeyId", type: "string", sensitive: true },
  { key: "storageAccessKeySecret", dbKey: "storage.accessKeySecret", type: "string", sensitive: true },
  { key: "storageUploadPrefix", dbKey: "storage.uploadPrefix", type: "string" },

  { key: "smsEnabled", dbKey: "sms.enabled", type: "boolean" },
  { key: "smsProvider", dbKey: "sms.provider", type: "string" },
  { key: "smsAccessKeyId", dbKey: "sms.accessKeyId", type: "string", sensitive: true },
  { key: "smsAccessKeySecret", dbKey: "sms.accessKeySecret", type: "string", sensitive: true },
  { key: "smsSignName", dbKey: "sms.signName", type: "string" },
  { key: "smsTemplateId", dbKey: "sms.templateId", type: "string" },

  { key: "mapApiKey", dbKey: "map.apiKey", type: "string", sensitive: true },
  { key: "analyticsEnabled", dbKey: "analytics.enabled", type: "boolean" },
  { key: "analyticsProvider", dbKey: "analytics.provider", type: "string" },
  { key: "analyticsKey", dbKey: "analytics.key", type: "string", sensitive: true },
  { key: "webhookEnabled", dbKey: "webhook.enabled", type: "boolean" },
  { key: "webhookUrl", dbKey: "webhook.url", type: "string", sensitive: true },
  { key: "customApiConfig", dbKey: "custom.apiConfig", type: "string" },
];

export const SENSITIVE_KEYS = new Set(CONFIG_DEFS.filter((item) => item.sensitive).map((item) => item.key));

const ASSISTANT_ENABLE_KEY_MAP: Record<string, keyof Pick<
  AppConfigValues,
  | "aiAssistantTaxEnabled"
  | "aiAssistantLegalEnabled"
  | "aiAssistantMarketEnabled"
  | "aiAssistantDesignEnabled"
  | "aiAssistantSocialEnabled"
>> = {
  [AI_ASSISTANTS.tax]: "aiAssistantTaxEnabled",
  [AI_ASSISTANTS.legal]: "aiAssistantLegalEnabled",
  [AI_ASSISTANTS.market]: "aiAssistantMarketEnabled",
  [AI_ASSISTANTS.design]: "aiAssistantDesignEnabled",
  [AI_ASSISTANTS.social]: "aiAssistantSocialEnabled",
};

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.CONFIG_ENCRYPTION_KEY || process.env.ADMIN_SECRET || "link168-default-encryption-key-please-change-2025";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSensitive(value: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSensitive(encrypted: string): string {
  try {
    const [ivBase64, authTagBase64, encryptedBase64] = encrypted.split(":");
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) return "";
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

function maskSensitiveValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return `****${value.slice(-4)}`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function serializeValue(value: unknown, type: ConfigValueType): string {
  if (type === "boolean") return value === true ? "true" : "false";
  if (type === "number") return String(value ?? 0);
  if (type === "json") return JSON.stringify(value ?? []);
  return String(value ?? "");
}

function deserializeValue(raw: string, type: ConfigValueType): unknown {
  if (type === "boolean") return raw === "true";
  if (type === "number") {
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (type === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw;
}

function normalizeConfigValue<K extends AppConfigKey>(key: K, value: unknown): AppConfigValues[K] {
  switch (key) {
    case "aiProvider": {
      const allowed: AiProvider[] = ["openai", "deepseek", "qwen", "doubao", "zhipu", "openai-compatible"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.aiProvider;
      return (allowed.includes(normalized as AiProvider) ? normalized : DEFAULT_CONFIG.aiProvider) as AppConfigValues[K];
    }
    case "storageProvider": {
      const allowed: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.storageProvider;
      return (allowed.includes(normalized as StorageProvider) ? normalized : DEFAULT_CONFIG.storageProvider) as AppConfigValues[K];
    }
    case "smtpSecureMode": {
      const allowed: SmtpSecureMode[] = ["ssl", "tls", "none"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.smtpSecureMode;
      return (allowed.includes(normalized as SmtpSecureMode) ? normalized : DEFAULT_CONFIG.smtpSecureMode) as AppConfigValues[K];
    }
    case "aiTesterEmails":
      return (Array.isArray(value) ? value : DEFAULT_CONFIG.aiTesterEmails) as AppConfigValues[K];
    default:
      return value as AppConfigValues[K];
  }
}

export async function getConfig(): Promise<AppConfigValues> {
  const lookupKeys = CONFIG_DEFS.flatMap((def) => [def.dbKey, ...(def.legacyKeys || [])]);
  const records = await db.appConfig.findMany({
    where: { configKey: { in: lookupKeys } },
  });

  const map = new Map(records.map((record) => [record.configKey, record]));
  const result = { ...DEFAULT_CONFIG } as AppConfigValues;

  for (const def of CONFIG_DEFS) {
    const record = map.get(def.dbKey) ?? (def.legacyKeys ? def.legacyKeys.map((key) => map.get(key)).find(Boolean) : undefined);
    if (!record) continue;
    let raw = record.configValue;
    if (record.isSensitive && raw) {
      raw = decryptSensitive(raw);
    }
    const value = deserializeValue(raw, def.type);
    (result as Record<string, unknown>)[def.key] = normalizeConfigValue(def.key, value);
  }

  return result;
}

export async function getMaskedConfig(): Promise<Record<AppConfigKey, unknown>> {
  const config = await getConfig();
  const masked: Record<string, unknown> = { ...config };

  for (const def of CONFIG_DEFS) {
    if (!def.sensitive) continue;
    const rawValue = String(config[def.key] ?? "");
    masked[def.key] = rawValue ? maskSensitiveValue(rawValue) : "";
  }

  return masked;
}

export async function updateConfig(partial: Partial<AppConfigValues>): Promise<void> {
  const updates: { configKey: string; configValue: string; isSensitive: boolean }[] = [];

  for (const def of CONFIG_DEFS) {
    if (!(def.key in partial)) continue;

    const incomingValue = partial[def.key];
    const isSensitive = Boolean(def.sensitive);

    if (isSensitive) {
      const text = typeof incomingValue === "string" ? incomingValue.trim() : "";
      if (text.includes("****")) {
        throw new Error("敏感字段必须输入完整新值，不能保存脱敏值");
      }
      if (!text) {
        continue;
      }
      updates.push({
        configKey: def.dbKey,
        configValue: encryptSensitive(text),
        isSensitive: true,
      });
      continue;
    }

    const serialized = serializeValue(incomingValue, def.type);
    updates.push({
      configKey: def.dbKey,
      configValue: serialized,
      isSensitive: false,
    });
  }

  if (updates.length === 0) return;

  await db.$transaction(
    updates.map((item) =>
      db.appConfig.upsert({
        where: { configKey: item.configKey },
        create: {
          id: crypto.randomUUID(),
          configKey: item.configKey,
          configValue: item.configValue,
          isSensitive: item.isSensitive,
        },
        update: {
          configValue: item.configValue,
          isSensitive: item.isSensitive,
        },
      }),
    ),
  );
}

export function isAssistantEnabled(config: AppConfigValues, assistantLabel: string) {
  const configKey = ASSISTANT_ENABLE_KEY_MAP[assistantLabel];
  if (!configKey) return false;
  return config[configKey] === true;
}

export async function isAiTester(email: string): Promise<boolean> {
  const config = await getConfig();
  if (!config.aiEnabled) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return config.aiTesterEmails.some((item) => item.trim().toLowerCase() === normalizedEmail);
}

export async function getAiDailyUsage(userId: string, assistant: string): Promise<{ used: number; limit: number; remaining: number }> {
  const config = await getConfig();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await db.aiUsageLog.findUnique({
    where: { userId_assistant_usageDate: { userId, assistant, usageDate: today } },
  });

  const used = log?.callCount ?? 0;
  const limit = config.aiDailyLimitPerUser;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function getAiGlobalDailyUsage(): Promise<{ used: number; limit: number; remaining: number }> {
  const config = await getConfig();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aggregate = await db.aiUsageLog.aggregate({
    where: { usageDate: today },
    _sum: { callCount: true },
  });

  const used = aggregate._sum.callCount ?? 0;
  const limit = config.aiDailyLimitTotal;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementAiUsage(userId: string, assistant: string): Promise<boolean> {
  const config = await getConfig();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current = await db.aiUsageLog.findUnique({
    where: { userId_assistant_usageDate: { userId, assistant, usageDate: today } },
  });

  if (current && current.callCount >= config.aiDailyLimitPerUser) {
    return false;
  }

  await db.aiUsageLog.upsert({
    where: { userId_assistant_usageDate: { userId, assistant, usageDate: today } },
    create: { id: crypto.randomUUID(), userId, assistant, usageDate: today, callCount: 1 },
    update: { callCount: { increment: 1 } },
  });

  return true;
}
