const mockRequireJeepworkSuperAdmin = jest.fn();
const mockGetJeepworkSessionUser = jest.fn();
const mockGetConfig = jest.fn();
const mockGetMaskedConfig = jest.fn();
const mockUpdateConfig = jest.fn();
const mockGetExternalServiceReadiness = jest.fn();
const mockRecordExternalServiceTest = jest.fn();
const mockWriteAdminAuditLog = jest.fn();
const mockCreateTransport = jest.fn();
const mockVerifyMailTransport = jest.fn();
const mockSendMail = jest.fn();
const mockTestAlipayConfiguration = jest.fn();
const mockQueryAndReconcileAlipayOrder = jest.fn();
const mockReconcilePendingAlipayOrders = jest.fn();
const mockListAlipayDiagnostics = jest.fn();
const mockRecordAlipayDiagnostic = jest.fn();
const mockCreateOrder = jest.fn();
const mockUpdateOrderPaymentChannel = jest.fn();
const mockCreatePayment = jest.fn();
const mockFetch = jest.fn();

const mockDb = {
  appConfig: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  aiCreditAccount: {
    upsert: jest.fn(),
  },
};

jest.mock("@/lib/jeepwork-auth", () => ({
  requireJeepworkSuperAdmin: mockRequireJeepworkSuperAdmin,
  getJeepworkSessionUser: mockGetJeepworkSessionUser,
}));

jest.mock("@/lib/app-config", () => ({
  AI_ASSISTANTS: {
    tax: "tax",
    legal: "legal",
    market: "market",
    design: "design",
    social: "social",
  },
  SENSITIVE_KEYS: new Set([
    "aiApiKey",
    "smtpPassword",
    "paymentAlipayAppPrivateKey",
    "paymentAlipayPublicKey",
  ]),
  getAiDailyUsage: jest.fn(),
  getConfig: mockGetConfig,
  getMaskedConfig: mockGetMaskedConfig,
  isAiTester: jest.fn(),
  updateConfig: mockUpdateConfig,
}));

jest.mock("@/lib/external-service-readiness", () => {
  const actual = jest.requireActual("@/lib/external-service-readiness");
  return {
    ...actual,
    getExternalServiceReadiness: mockGetExternalServiceReadiness,
    recordExternalServiceTest: mockRecordExternalServiceTest,
  };
});

jest.mock("@/lib/admin-audit-log", () => ({
  AUDIT_ACTION: { UPDATE_SYSTEM_CONFIG: "UPDATE_SYSTEM_CONFIG" },
  writeAdminAuditLog: mockWriteAdminAuditLog,
}));

jest.mock("@/lib/ai/enterprise-bailian", () => ({
  getEnterpriseAiSettingsUrlValidationError: jest.fn(() => null),
  resolveEnterpriseBailianConfig: jest.fn((config) => ({
    appId: config.aiBailianAppId || "",
    apiKey: config.aiApiKey || "",
    baseUrl: config.aiBailianBaseUrl || "",
    dashscopeWorkspaceId: config.aiBailianWorkspaceId || "",
    timeoutMs: (config.aiRequestTimeout || 45) * 1000,
    configured: Boolean(config.aiBailianAppId && config.aiApiKey && config.aiBailianBaseUrl),
  })),
  validateEnterpriseAiSettingsPatch: jest.fn((value) => value),
}));

jest.mock("@/lib/db", () => ({ db: mockDb }));

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: mockCreateTransport,
  },
}));

jest.mock("@/lib/billing/alipay-query", () => ({
  testAlipayConfiguration: mockTestAlipayConfiguration,
}));

jest.mock("@/lib/billing/alipay-reconciliation", () => ({
  queryAndReconcileAlipayOrder: mockQueryAndReconcileAlipayOrder,
  reconcilePendingAlipayOrders: mockReconcilePendingAlipayOrders,
}));

jest.mock("@/lib/billing/payment-diagnostics", () => ({
  listAlipayDiagnostics: mockListAlipayDiagnostics,
  recordAlipayDiagnostic: mockRecordAlipayDiagnostic,
}));

jest.mock("@/lib/billing/orders", () => ({
  BillingPermissionError: class BillingPermissionError extends Error {
    code = "BILLING_PERMISSION";
    statusCode = 403;
  },
  createOrder: mockCreateOrder,
  updateOrderPaymentChannel: mockUpdateOrderPaymentChannel,
}));

jest.mock("@/lib/billing/payments", () => ({
  createPayment: mockCreatePayment,
}));

import { POST as postAiSettings } from "@/app/api/jeepwork/settings/ai/route";
import { POST as postApiSettings } from "@/app/api/jeepwork/settings/api/route";
import { POST as postPaymentSettings } from "@/app/api/jeepwork/settings/payment/route";

const originalFetch = globalThis.fetch;

function postRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function aiConfig() {
  return {
    aiEnabled: true,
    aiProvider: "bailian",
    aiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    aiApiKey: "sk-route-test-secret",
    aiModel: "qwen-plus",
    aiBailianAppId: "app-route-test",
    aiBailianBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
    aiBailianWorkspaceId: "workspace-route-test",
    aiRequestTimeout: 45,
  };
}

function mailConfig() {
  return {
    mailEnabled: true,
    smtpHost: "smtpdm.aliyun.com",
    smtpPort: 465,
    smtpUser: "mailer@example.com",
    smtpPassword: "smtp-route-test-secret",
    smtpSecureMode: "ssl",
    mailFrom: "Link168 <mailer@example.com>",
  };
}

describe("real external-service test routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireJeepworkSuperAdmin.mockResolvedValue(null);
    mockGetJeepworkSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
    });
    mockRecordExternalServiceTest.mockResolvedValue(undefined);
    mockCreateTransport.mockReturnValue({
      verify: mockVerifyMailTransport,
      sendMail: mockSendMail,
    });
    mockVerifyMailTransport.mockResolvedValue(true);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  test("AI test requires super-admin authorization before any provider call", async () => {
    mockRequireJeepworkSuperAdmin.mockResolvedValueOnce(
      Response.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 }),
    );

    const response = await postAiSettings(
      postRequest("/api/jeepwork/settings/ai", { action: "test-ai-connection" }),
    );

    expect(response.status).toBe(403);
    expect(mockGetConfig).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("AI test records a pass only after a real Bailian application response", async () => {
    const config = aiConfig();
    mockGetConfig.mockResolvedValue(config);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      request_id: "bailian-app-test",
      output: { text: "连接测试成功", session_id: "session-test" },
      usage: { model_id: "qwen-plus", input_tokens: 2, output_tokens: 5, total_tokens: 7 },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const response = await postAiSettings(
      postRequest("/api/jeepwork/settings/ai", { action: "test-ai-connection" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        success: true,
        requestId: "bailian-app-test",
        totalTokens: 7,
      },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/api/v1/apps/app-route-test/completion",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-route-test-secret",
          "X-DashScope-WorkSpace": "workspace-route-test",
        }),
        body: expect.stringContaining('"prompt":"请只回复：连接测试成功"'),
      }),
    );
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "bailian",
      config,
      expect.objectContaining({ passed: true }),
    );
  });

  test("AI test rejects a 200 application response without a usable reply", async () => {
    const config = aiConfig();
    mockGetConfig.mockResolvedValue(config);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      request_id: "empty-application-reply",
      output: {},
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const response = await postAiSettings(
      postRequest("/api/jeepwork/settings/ai", { action: "test-ai-connection" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.success).toBe(false);
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "bailian",
      config,
      expect.objectContaining({ passed: false }),
    );
    expect(mockRecordExternalServiceTest).not.toHaveBeenCalledWith(
      "bailian",
      config,
      expect.objectContaining({ passed: true }),
    );
  });

  test("mail test records a pass only after verification and recipient acceptance", async () => {
    const config = mailConfig();
    mockGetConfig.mockResolvedValue(config);
    mockSendMail.mockResolvedValue({
      accepted: ["owner@example.com"],
      rejected: [],
      messageId: "mail-test-id",
    });

    const response = await postApiSettings(
      postRequest("/api/jeepwork/settings/api", {
        action: "test-mail",
        email: "OWNER@example.com",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockVerifyMailTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" }),
    );
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "mail",
      config,
      expect.objectContaining({ passed: true }),
    );
  });

  test("mail test records a failure when SMTP does not accept the recipient", async () => {
    const config = mailConfig();
    mockGetConfig.mockResolvedValue(config);
    mockSendMail.mockResolvedValue({
      accepted: [],
      rejected: ["owner@example.com"],
    });

    const response = await postApiSettings(
      postRequest("/api/jeepwork/settings/api", {
        action: "test-mail",
        email: "owner@example.com",
      }),
    );

    expect(response.status).toBe(502);
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "mail",
      config,
      expect.objectContaining({ passed: false }),
    );
    expect(mockRecordExternalServiceTest).not.toHaveBeenCalledWith(
      "mail",
      config,
      expect.objectContaining({ passed: true }),
    );
  });

  test("Alipay key validation stays local and never creates green readiness evidence", async () => {
    mockTestAlipayConfiguration.mockResolvedValue({
      success: true,
      appId: "alipay-app-id",
      privateKeyFingerprint: "private-fingerprint",
      alipayPublicKeyFingerprint: "public-fingerprint",
      notifyUrl: "https://link168.me/api/payments/alipay/notify",
      testMode: false,
    });

    const response = await postPaymentSettings(
      postRequest("/api/jeepwork/settings/payment", { action: "test-keys" }),
    );

    expect(response.status).toBe(200);
    expect(mockRecordAlipayDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ type: "KEY_TEST", success: true }),
    );
    expect(mockRecordExternalServiceTest).not.toHaveBeenCalled();
  });

  test("Alipay readiness passes only after a real query response is verified", async () => {
    const config = { paymentEnabled: true, paymentAlipayEnabled: true };
    mockGetConfig.mockResolvedValue(config);
    mockQueryAndReconcileAlipayOrder.mockResolvedValue({
      success: true,
      found: true,
      providerTested: true,
      providerVerified: true,
      orderNo: "L168_TEST_ORDER",
      providerStatus: "WAIT_BUYER_PAY",
    });

    const response = await postPaymentSettings(
      postRequest("/api/jeepwork/settings/payment", {
        action: "query-order",
        orderNo: "L168_TEST_ORDER",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "alipay",
      config,
      expect.objectContaining({ passed: true }),
    );
  });

  test("Alipay query without verified provider evidence cannot become green", async () => {
    const config = { paymentEnabled: true, paymentAlipayEnabled: true };
    mockGetConfig.mockResolvedValue(config);
    mockQueryAndReconcileAlipayOrder.mockResolvedValue({
      success: true,
      found: false,
      providerTested: true,
      providerVerified: false,
      orderNo: "L168_MISSING_ORDER",
      error: "TRADE_NOT_EXIST",
    });

    const response = await postPaymentSettings(
      postRequest("/api/jeepwork/settings/payment", {
        action: "query-order",
        orderNo: "L168_MISSING_ORDER",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockRecordExternalServiceTest).toHaveBeenCalledWith(
      "alipay",
      config,
      expect.objectContaining({ passed: false }),
    );
    expect(mockRecordExternalServiceTest).not.toHaveBeenCalledWith(
      "alipay",
      config,
      expect.objectContaining({ passed: true }),
    );
  });
});
