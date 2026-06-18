import crypto from "crypto";
import { db } from "@/lib/db";

export type AppConfigValues = {
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiTesterEmails: string[];
  aiDailyLimitPerUser: number;
  emailEnabled: boolean;
  paymentEnabled: boolean;
  storageProvider: "local" | "s3" | "cloudinary";
};

export const DEFAULT_CONFIG: AppConfigValues = {
  aiEnabled: false,
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiApiKey: "",
  aiTesterEmails: [],
  aiDailyLimitPerUser: 50,
  emailEnabled: false,
  paymentEnabled: false,
  storageProvider: "local",
};

export const SENSITIVE_KEYS = new Set(["aiApiKey"]);

const CONFIG_KEYS: { key: keyof AppConfigValues; type: "boolean" | "string" | "number" | "json" }[] = [
  { key: "aiEnabled", type: "boolean" },
  { key: "aiBaseUrl", type: "string" },
  { key: "aiModel", type: "string" },
  { key: "aiApiKey", type: "string" },
  { key: "aiTesterEmails", type: "json" },
  { key: "aiDailyLimitPerUser", type: "number" },
  { key: "emailEnabled", type: "boolean" },
  { key: "paymentEnabled", type: "boolean" },
  { key: "storageProvider", type: "string" },
];

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

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****".concat(key.slice(-4));
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function serializeValue(value: unknown, type: string): string {
  if (type === "boolean") return value === true ? "true" : "false";
  if (type === "number") return String(value);
  if (type === "json") return JSON.stringify(value ?? []);
  return String(value ?? "");
}

function deserializeValue(raw: string, type: string): unknown {
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

export async function getConfig(): Promise<AppConfigValues> {
  const records = await db.appConfig.findMany({
    where: { configKey: { in: CONFIG_KEYS.map((c) => c.key) } },
  });

  const map = new Map(records.map((r) => [r.configKey, { value: r.configValue, sensitive: r.isSensitive }]));
  const result = { ...DEFAULT_CONFIG } as AppConfigValues;

  for (const def of CONFIG_KEYS) {
    const entry = map.get(def.key);
    if (!entry) continue;
    let raw = entry.value;
    if (entry.sensitive && raw) {
      raw = decryptSensitive(raw);
    }
    (result as Record<string, unknown>)[def.key] = deserializeValue(raw, def.type);
  }

  return result;
}

export async function getMaskedConfig(): Promise<Omit<AppConfigValues, "aiApiKey"> & { aiApiKeyMasked: string; hasAiApiKey: boolean }> {
  const config = await getConfig();
  const { aiApiKey, ...rest } = config;
  return {
    ...rest,
    aiApiKeyMasked: maskApiKey(aiApiKey),
    hasAiApiKey: aiApiKey.length > 0,
  };
}

export async function updateConfig(partial: Partial<AppConfigValues>): Promise<void> {
  const updates = [] as { configKey: string; configValue: string; isSensitive: boolean }[];

  for (const def of CONFIG_KEYS) {
    if (!(def.key in partial)) continue;
    const rawValue = partial[def.key];
    const isSensitive = SENSITIVE_KEYS.has(def.key as string);
    let serialized = serializeValue(rawValue, def.type);
    if (isSensitive && serialized) {
      if (serialized.includes("****")) continue;
      serialized = encryptSensitive(serialized);
    }
    updates.push({ configKey: def.key, configValue: serialized, isSensitive });
  }

  await db.$transaction(
    updates.map((u) =>
      db.appConfig.upsert({
        where: { configKey: u.configKey },
        create: { id: crypto.randomUUID(), configKey: u.configKey, configValue: u.configValue, isSensitive: u.isSensitive },
        update: { configValue: u.configValue, isSensitive: u.isSensitive },
      }),
    ),
  );
}

export async function isAiTester(email: string): Promise<boolean> {
  const config = await getConfig();
  if (!config.aiEnabled) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return config.aiTesterEmails.some((e) => e.trim().toLowerCase() === normalizedEmail);
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
