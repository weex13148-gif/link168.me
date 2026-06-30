import "server-only";
import crypto from "crypto";

// Re-export all client-safe values from the values file
export {
  AI_ASSISTANTS,
  DEFAULT_CONFIG,
  SENSITIVE_KEYS,
  ASSISTANT_ENABLE_KEY_MAP,
  CONFIG_DEFS,
  normalizeConfigValue,
  maskSensitiveValue,
  serializeValue,
  deserializeValue,
} from "./app-config-values";

export type {
  AiAssistantKey,
  AiProvider,
  StorageProvider,
  SmtpSecureMode,
  AppConfigValues,
  ConfigDef,
  ConfigValueType,
  AppConfigKey,
} from "./app-config-values";

import { db } from "@/lib/db";
import {
  type AppConfigValues,
  type AiAssistantKey,
  type AppConfigKey,
  type ConfigDef,
  CONFIG_DEFS,
  DEFAULT_CONFIG,
  normalizeConfigValue,
  maskSensitiveValue,
  serializeValue,
  deserializeValue,
  ASSISTANT_ENABLE_KEY_MAP,
} from "./app-config-values";

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
