import crypto from "node:crypto";
import { getConfig } from "@/lib/app-config";
import type { AppConfigValues } from "@/lib/app-config-values";
import { db } from "@/lib/db";

export const EXTERNAL_SERVICE_IDS = [
  "bailian",
  "mail",
  "alipay",
  "object_storage",
] as const;

export type ExternalServiceId = (typeof EXTERNAL_SERVICE_IDS)[number];
export type ExternalServiceReadinessStatus =
  | "configured_and_passed"
  | "not_configured"
  | "configured_but_failed";

export type ExternalServiceEvidence = {
  result: "passed" | "failed";
  configurationFingerprint: string;
  checkedAt: string;
  message?: string;
};

export type ExternalServiceEvidenceMap = Partial<
  Record<ExternalServiceId, ExternalServiceEvidence>
>;

export type ExternalServiceReadiness = {
  status: ExternalServiceReadinessStatus;
  label: string;
  lastTestedAt: string | null;
};

export type ExternalServiceReadinessMap = Record<
  ExternalServiceId,
  ExternalServiceReadiness
>;

const EVIDENCE_KEY_PREFIX = "external.readiness.";

function evidenceKey(service: ExternalServiceId) {
  return `${EVIDENCE_KEY_PREFIX}${service}`;
}

function configurationParts(service: ExternalServiceId, config: AppConfigValues) {
  switch (service) {
    case "bailian":
      return [
        config.aiEnabled,
        config.aiProvider,
        config.aiBaseUrl,
        config.aiApiKey,
        config.aiModel,
        config.aiBailianAppId,
        config.aiBailianBaseUrl,
        config.aiBailianWorkspaceId,
      ];
    case "mail":
      return [
        config.mailEnabled,
        config.smtpHost,
        config.smtpPort,
        config.smtpUser,
        config.smtpPassword,
        config.mailFrom,
        config.smtpSecureMode,
      ];
    case "alipay":
      return [
        config.paymentEnabled,
        config.paymentAlipayEnabled,
        config.paymentAlipayAppId,
        config.paymentAlipayAppPrivateKey,
        config.paymentAlipayPublicKey,
        config.paymentAlipaySellerId,
        config.paymentAlipayNotifyUrl,
        config.paymentTestMode,
      ];
    case "object_storage":
      return [
        config.storageEnabled,
        config.storageProvider,
        config.storageEndpoint,
        config.storageBucket,
        config.storageRegion,
        config.storageAccessKeyId,
        config.storageAccessKeySecret,
        config.storageUploadPrefix,
      ];
  }
}

function isConfigured(service: ExternalServiceId, config: AppConfigValues) {
  switch (service) {
    case "bailian":
      return Boolean(
        config.aiEnabled
        && config.aiProvider === "bailian"
        && config.aiBaseUrl
        && config.aiApiKey
        && config.aiModel
        && config.aiBailianAppId,
      );
    case "mail":
      return Boolean(
        config.mailEnabled
        && config.smtpHost
        && config.smtpUser
        && config.smtpPassword
        && config.mailFrom,
      );
    case "alipay":
      return Boolean(
        config.paymentEnabled
        && config.paymentAlipayEnabled
        && config.paymentAlipayAppId
        && config.paymentAlipayAppPrivateKey
        && config.paymentAlipayPublicKey
        && config.paymentAlipayNotifyUrl,
      );
    case "object_storage":
      return Boolean(
        config.storageEnabled
        && config.storageProvider !== "local"
        && config.storageEndpoint
        && config.storageBucket
        && config.storageAccessKeyId
        && config.storageAccessKeySecret,
      );
  }
}

export function createExternalServiceFingerprint(
  service: ExternalServiceId,
  config: AppConfigValues,
) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(configurationParts(service, config)))
    .digest("hex");
}

export function sanitizeExternalServiceMessage(message: string) {
  return message
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer ****")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-****")
    .replace(/((?:api[ _-]?key|password|secret|token)\s*[=:]\s*)[^\s,;]+/gi, "$1****")
    .replace(/[A-Za-z0-9_-]{48,}/g, "****")
    .slice(0, 240);
}

function readinessFor(
  service: ExternalServiceId,
  config: AppConfigValues,
  evidence: ExternalServiceEvidence | undefined,
): ExternalServiceReadiness {
  if (!isConfigured(service, config)) {
    return { status: "not_configured", label: "未配置", lastTestedAt: null };
  }

  if (!evidence) {
    return {
      status: "configured_but_failed",
      label: "已配置，尚未完成真实连通测试",
      lastTestedAt: null,
    };
  }

  const currentFingerprint = createExternalServiceFingerprint(service, config);
  if (evidence.configurationFingerprint !== currentFingerprint) {
    return {
      status: "configured_but_failed",
      label: "配置已变更，需要重新进行真实连通测试",
      lastTestedAt: evidence.checkedAt,
    };
  }

  if (evidence.result === "passed") {
    return {
      status: "configured_and_passed",
      label: "已配置，真实连通测试通过",
      lastTestedAt: evidence.checkedAt,
    };
  }

  return {
    status: "configured_but_failed",
    label: evidence.message
      ? `真实连通测试失败：${sanitizeExternalServiceMessage(evidence.message)}`
      : "真实连通测试失败，请检查配置后重试",
    lastTestedAt: evidence.checkedAt,
  };
}

export function buildExternalServiceReadiness(
  config: AppConfigValues,
  evidence: ExternalServiceEvidenceMap,
): ExternalServiceReadinessMap {
  return {
    bailian: readinessFor("bailian", config, evidence.bailian),
    mail: readinessFor("mail", config, evidence.mail),
    alipay: readinessFor("alipay", config, evidence.alipay),
    object_storage: readinessFor("object_storage", config, evidence.object_storage),
  };
}

function parseEvidence(value: string): ExternalServiceEvidence | null {
  try {
    const parsed = JSON.parse(value) as Partial<ExternalServiceEvidence>;
    if (
      (parsed.result === "passed" || parsed.result === "failed")
      && typeof parsed.configurationFingerprint === "string"
      && /^[a-f0-9]{64}$/.test(parsed.configurationFingerprint)
      && typeof parsed.checkedAt === "string"
    ) {
      return {
        result: parsed.result,
        configurationFingerprint: parsed.configurationFingerprint,
        checkedAt: parsed.checkedAt,
        message: typeof parsed.message === "string"
          ? sanitizeExternalServiceMessage(parsed.message)
          : undefined,
      };
    }
  } catch {
    // Invalid historical evidence is treated as missing evidence.
  }
  return null;
}

export async function loadExternalServiceEvidence(): Promise<ExternalServiceEvidenceMap> {
  const rows = await db.appConfig.findMany({
    where: { configKey: { in: EXTERNAL_SERVICE_IDS.map(evidenceKey) } },
    select: { configKey: true, configValue: true },
  });
  const evidence: ExternalServiceEvidenceMap = {};
  for (const row of rows) {
    const service = row.configKey.slice(EVIDENCE_KEY_PREFIX.length) as ExternalServiceId;
    if (!EXTERNAL_SERVICE_IDS.includes(service)) continue;
    const parsed = parseEvidence(row.configValue);
    if (parsed) evidence[service] = parsed;
  }
  return evidence;
}

export async function getExternalServiceReadiness(
  suppliedConfig?: AppConfigValues,
): Promise<ExternalServiceReadinessMap> {
  const [config, evidence] = await Promise.all([
    suppliedConfig ? Promise.resolve(suppliedConfig) : getConfig(),
    loadExternalServiceEvidence(),
  ]);
  return buildExternalServiceReadiness(config, evidence);
}

export async function recordExternalServiceTest(
  service: ExternalServiceId,
  config: AppConfigValues,
  result: { passed: boolean; message?: string; checkedAt?: Date },
) {
  const evidence: ExternalServiceEvidence = {
    result: result.passed ? "passed" : "failed",
    configurationFingerprint: createExternalServiceFingerprint(service, config),
    checkedAt: (result.checkedAt ?? new Date()).toISOString(),
    message: result.message ? sanitizeExternalServiceMessage(result.message) : undefined,
  };
  const configKey = evidenceKey(service);
  const configValue = JSON.stringify(evidence);
  await db.appConfig.upsert({
    where: { configKey },
    create: {
      id: crypto.randomUUID(),
      configKey,
      configValue,
      isSensitive: false,
    },
    update: { configValue, isSensitive: false },
  });
}
