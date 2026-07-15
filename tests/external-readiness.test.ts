import fs from "fs";
import path from "path";
import { DEFAULT_CONFIG, type AppConfigValues } from "@/lib/app-config-values";
import { db } from "@/lib/db";
import {
  buildExternalServiceReadiness,
  createExternalServiceFingerprint,
  recordExternalServiceTest,
  type ExternalServiceEvidenceMap,
} from "@/lib/external-service-readiness";
import { resolveStatus } from "@/components/admin/AdminKit";

jest.mock("@/lib/db", () => ({
  db: {
    appConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockAppConfig = db.appConfig as unknown as {
  findMany: jest.Mock;
  upsert: jest.Mock;
};

function configuredServices(): AppConfigValues {
  return {
    ...DEFAULT_CONFIG,
    aiEnabled: true,
    aiProvider: "bailian",
    aiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    aiApiKey: "bailian-secret-token",
    aiModel: "qwen-plus",
    aiBailianAppId: "bailian-app",
    mailEnabled: true,
    smtpHost: "smtpdm.aliyun.com",
    smtpUser: "mailer@example.com",
    smtpPassword: "smtp-secret",
    mailFrom: "Link168 <mailer@example.com>",
    paymentEnabled: true,
    paymentAlipayEnabled: true,
    paymentAlipayAppId: "alipay-app",
    paymentAlipayAppPrivateKey: "private-key-secret",
    paymentAlipayPublicKey: "public-key-value",
    paymentAlipayNotifyUrl: "https://example.com/api/payments/alipay/notify",
    storageEnabled: true,
    storageProvider: "aliyun-oss",
    storageEndpoint: "https://oss-cn-hangzhou.aliyuncs.com",
    storageBucket: "link168-test",
    storageAccessKeyId: "storage-key-id",
    storageAccessKeySecret: "storage-key-secret",
  };
}

function passedEvidence(config: AppConfigValues): ExternalServiceEvidenceMap {
  return {
    bailian: {
      result: "passed",
      configurationFingerprint: createExternalServiceFingerprint("bailian", config),
      checkedAt: "2026-07-15T08:00:00.000Z",
      message: "百炼真实连接通过",
    },
    mail: {
      result: "passed",
      configurationFingerprint: createExternalServiceFingerprint("mail", config),
      checkedAt: "2026-07-15T08:01:00.000Z",
      message: "测试邮件发送通过",
    },
    alipay: {
      result: "passed",
      configurationFingerprint: createExternalServiceFingerprint("alipay", config),
      checkedAt: "2026-07-15T08:02:00.000Z",
      message: "支付宝真实查单并验签通过",
    },
    object_storage: {
      result: "passed",
      configurationFingerprint: createExternalServiceFingerprint("object_storage", config),
      checkedAt: "2026-07-15T08:03:00.000Z",
      message: "对象存储读写删除通过",
    },
  };
}

describe("external service readiness", () => {
  beforeEach(() => jest.clearAllMocks());

  test("disabled or incomplete services are not_configured", () => {
    const readiness = buildExternalServiceReadiness(DEFAULT_CONFIG, {});
    expect(Object.values(readiness).map((item) => item.status)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured",
      "not_configured",
    ]);
  });

  test("configured services without a real test are never green", () => {
    const readiness = buildExternalServiceReadiness(configuredServices(), {});
    for (const item of Object.values(readiness)) {
      expect(item.status).toBe("configured_but_failed");
      expect(item.label).toContain("尚未完成真实");
    }
  });

  test("only matching passed evidence becomes configured_and_passed", () => {
    const config = configuredServices();
    const readiness = buildExternalServiceReadiness(config, passedEvidence(config));
    expect(Object.values(readiness).every((item) => item.status === "configured_and_passed")).toBe(true);
  });

  test("a configuration change invalidates earlier passed evidence", () => {
    const config = configuredServices();
    const evidence = passedEvidence(config);
    const changed = { ...config, smtpHost: "smtp2.example.com" };
    const readiness = buildExternalServiceReadiness(changed, evidence);
    expect(readiness.mail.status).toBe("configured_but_failed");
    expect(readiness.mail.label).toContain("配置已变更");
    expect(readiness.bailian.status).toBe("configured_and_passed");
  });

  test("local file storage does not count as configured object storage", () => {
    const config = { ...configuredServices(), storageProvider: "local" as const };
    const readiness = buildExternalServiceReadiness(config, passedEvidence(config));
    expect(readiness.object_storage.status).toBe("not_configured");
  });

  test("fingerprints and persisted failures never expose credentials", async () => {
    const config = configuredServices();
    const fingerprint = createExternalServiceFingerprint("mail", config);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain(config.smtpPassword);

    mockAppConfig.upsert.mockResolvedValue({});
    await recordExternalServiceTest("mail", config, {
      passed: false,
      message: "Bearer bearer-secret password=smtp-secret sk-provider-secret",
      checkedAt: new Date("2026-07-15T09:00:00.000Z"),
    });

    const payload = mockAppConfig.upsert.mock.calls[0][0];
    const stored = JSON.stringify(payload);
    expect(stored).not.toContain("bearer-secret");
    expect(stored).not.toContain("smtp-secret");
    expect(stored).not.toContain("sk-provider-secret");
    expect(payload.create.isSensitive).toBe(false);
  });

  test("only configured_and_passed maps to a green readiness badge", () => {
    expect(resolveStatus("configured_and_passed").tone).toBe("success");
    expect(resolveStatus("not_configured").tone).not.toBe("success");
    expect(resolveStatus("configured_but_failed").tone).not.toBe("success");
  });

  test("readiness routes are super-admin protected and fake test success is removed", () => {
    const root = path.join(__dirname, "..");
    const summary = fs.readFileSync(path.join(root, "src/app/api/jeepwork/summary/route.ts"), "utf8");
    const settings = fs.readFileSync(path.join(root, "src/app/api/jeepwork/settings/api/route.ts"), "utf8");
    expect(summary).toContain("requireJeepworkSuperAdmin");
    expect(settings).toContain("requireJeepworkSuperAdmin");
    expect(settings).not.toMatch(/case "test-(?:ai-connection|storage|payment)": return NextResponse\.json\(\{ success: true/);
  });
});
