/**
 * AI 收口测试：幂等、额度模型、失败补偿、数据隔离
 *
 * 测试范围：
 * 1. 重复请求不重复扣费（幂等）
 * 2. Provider 失败退款
 * 3. 输出审核失败退款
 * 4. 写库失败退款
 * 5. refund_pending 状态
 * 6. 个人 AI 不读取 Workspace 数据
 * 7. Credits 不重复消费
 */

import crypto from "crypto";

// ---------- Mocks ----------
const mockDb: Record<string, any> = {
  profile: { findUnique: jest.fn() },
  aiConversation: { findFirst: jest.fn(), create: jest.fn() },
  aiMessage: { findMany: jest.fn(), create: jest.fn() },
  aiCreditAccount: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
  aiCreditLedger: { findUnique: jest.fn(), create: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
  freezeRecord: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), updateMany: jest.fn() },
  lead: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  // 兼容其他测试需要的模型，避免 jest.mock 缓存冲突
  workspace: { findUnique: jest.fn() },
  workspaceMember: { findUnique: jest.fn() },
  enterpriseQuotaPool: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  enterpriseQuotaConsumption: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), aggregate: jest.fn() },
  order: { findFirst: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  membershipSubscription: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
  orderLog: { create: jest.fn() },
  link: { count: jest.fn() },
  knowledgeDocument: { count: jest.fn() },
  knowledgeDoc: { count: jest.fn() },
  product: { count: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn((fn: any): any => fn(mockDb)),
};

jest.mock("@/lib/db", () => ({ db: mockDb }));

const mockEntitlements = {
  getUserEntitlements: jest.fn().mockResolvedValue({
    planCode: "member_basic",
    features: { aiEnabled: true },
    limits: { aiChatsPerMonth: { max: 300, used: 0, remaining: 300 } },
    hasActiveMembership: true,
    isLegacyActive: false,
    isGracePeriod: false,
  }),
};

jest.mock("@/lib/billing/entitlements", () => mockEntitlements);

const mockConfig = {
  getConfig: jest.fn().mockResolvedValue({
    aiEnabled: true,
    aiPublicEnabled: true,
    bailianApiKey: "test-key",
    bailianAppId: "test-app",
    bailianBaseUrl: "http://localhost",
    bailianTimeoutMs: 30000,
    bailianDashscopeWorkspaceId: "test-workspace",
  }),
};

jest.mock("@/lib/app-config", () => mockConfig);

const mockAuth = {
  canShowPublicProfile: jest.fn().mockReturnValue({ ok: true }),
  getActiveRestrictions: jest.fn().mockResolvedValue([]),
};

jest.mock("@/lib/auth", () => mockAuth);

const mockSafety = {
  detectPromptInjection: jest.fn().mockReturnValue({ detected: false }),
  hasSensitiveContent: jest.fn().mockReturnValue({ detected: false }),
  moderateAiOutput: jest.fn().mockImplementation((summary, content) => ({
    blocked: false,
    summary: summary || "摘要",
    content: content || "",
    disclaimer: "免责声明",
  })),
  sanitizeUserMessage: jest.fn().mockImplementation((m) => m),
  sanitizePublicText: jest.fn().mockImplementation((t) => t),
};

jest.mock("@/lib/content-safety", () => mockSafety);

const mockBailian = {
  callBailianApplication: jest.fn(),
  isBailianApplicationConfigured: jest.fn().mockReturnValue(true),
};

jest.mock("@/lib/ai/providers/bailian-application", () => mockBailian);

const mockEnterpriseBailian = {
  resolveEnterpriseBailianConfig: jest.fn().mockReturnValue({
    appId: "test-app",
    apiKey: "test-key",
    baseUrl: "http://localhost",
    timeoutMs: 30000,
    dashscopeWorkspaceId: "test-workspace",
  }),
};

jest.mock("@/lib/ai/enterprise-bailian", () => mockEnterpriseBailian);

const mockUrlSecurity = {
  sanitizePublicUrl: jest.fn().mockReturnValue({ safe: true, url: "https://example.com" }),
};

jest.mock("@/lib/public-url-security", () => mockUrlSecurity);

const mockCompliance = {
  addAiDisclaimer: jest.fn().mockImplementation((t) => t),
};

jest.mock("@/lib/ai/compliance", () => mockCompliance);

const mockPrivacy = {
  buildPrivacyNoticeFromConfig: jest.fn().mockReturnValue({
    collectLead: false,
    allowReport: false,
    allowTransferToHuman: false,
    privacyNoticeText: "",
  }),
};

jest.mock("@/lib/ai/privacy", () => mockPrivacy);

const mockTrace = {
  createAiTraceContext: jest.fn().mockReturnValue({ traceId: "trace-test" }),
  logAiTraceInfo: jest.fn(),
  setTraceIdOnNextResponse: jest.fn(),
};

jest.mock("@/lib/observability/ai-trace", () => mockTrace);

const mockMetrics = {
  recordAiMetrics: jest.fn(),
  recordSafetyRejection: jest.fn(),
};

jest.mock("@/lib/observability/ai-metrics", () => mockMetrics);

const mockProviderError = {
  mapProviderErrorToAiCode: jest.fn().mockReturnValue("AI_PROVIDER_FAILED"),
};

jest.mock("@/lib/ai/provider-error", () => mockProviderError);

// ---------- Import under test ----------
import { runCommercialAgent } from "@/lib/ai/commercial-agent";
import { consumeCredit, refundCredit } from "@/lib/ai/permissions";
import { validateIdempotencyKey, bindIdempotencyKey } from "@/lib/ai/credits";

describe("AI Closeout Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupProfile(overrides?: any) {
    return {
      id: crypto.randomUUID(),
      username: "testuser",
      isPublic: true,
      displayName: "Test User",
      bio: "Test bio",
      user: {
        id: crypto.randomUUID(),
        emailVerified: true,
        aiServiceConfig: {
          enabled: true,
          assistantName: "Test Assistant",
          tone: "friendly",
          collectLead: true,
          allowReport: true,
          allowTransferToHuman: true,
        },
        products: [],
        knowledgeDocs: [],
      },
      links: [],
      ...overrides,
    };
  }

  function setupCreditAccount(balance = 100) {
    const accountId = crypto.randomUUID();
    return {
      id: accountId,
      userId: "user-test",
      balance,
      version: 1,
    };
  }

  describe("1. Idempotency", () => {
    test("缺少 requestId 返回 400", async () => {
      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.code).toBe("MISSING_IDEMPOTENCY_KEY");
    });

    test("同一 requestId 重复请求不重复扣费", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "stable-request-id-123";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: true,
        reply: "你好！",
        requestId: "prov-req-1",
        usage: { modelId: "test-model", inputTokens: 10, outputTokens: 5 },
      });

      // First request
      const result1 = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });
      expect(result1.success).toBe(true);

      // Second request with same idempotency key should reuse
      mockDb.aiCreditLedger.findUnique.mockResolvedValue({
        id: crypto.randomUUID(),
        balanceAfter: 99,
        entryType: "consume",
      });

      const result2 = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });
      expect(result2.success).toBe(true);

      // Ledger create should only happen once (first request)
      // Second request hits idempotency and returns early
      const ledgerCreateCalls = mockDb.aiCreditLedger.create.mock.calls.length;
      expect(ledgerCreateCalls).toBe(1);
    });
  });

  describe("2. Unified Credit Model", () => {
    test("个人 AI 只使用 consumeCredit 一套模型，不重复消费", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-credit-model";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: true,
        reply: "你好！",
        requestId: "prov-req-1",
        usage: { modelId: "test-model", inputTokens: 10, outputTokens: 5 },
      });

      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      expect(result.success).toBe(true);
      // consumeCredit creates exactly one ledger entry with entryType "consume"
      const consumeEntries = mockDb.aiCreditLedger.create.mock.calls.filter(
        (c: any) => c[0].data.entryType === "consume"
      );
      expect(consumeEntries.length).toBe(1);
    });
  });

  describe("3. Provider Failure Compensation", () => {
    test("Provider 失败时自动退款", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-provider-fail";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: false,
        status: 502,
        reply: null,
        error: "Provider timeout",
      });

      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("AI_PROVIDER_FAILED");
      // Should create a refund ledger entry
      const refundEntries = mockDb.aiCreditLedger.create.mock.calls.filter(
        (c: any) => c[0].data.entryType === "refund"
      );
      expect(refundEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Output Moderation Failure Compensation", () => {
    test("输出审核失败时自动退款", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-moderation-fail";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: true,
        reply: "bad content",
        requestId: "prov-req-1",
        usage: { modelId: "test-model", inputTokens: 10, outputTokens: 5 },
      });
      mockSafety.moderateAiOutput.mockReturnValue({
        blocked: true,
        summary: "",
        content: "",
        disclaimer: "",
        reason: "违规内容",
      });

      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("AI_SAFETY_REJECTED");
      const refundEntries = mockDb.aiCreditLedger.create.mock.calls.filter(
        (c: any) => c[0].data.entryType === "refund"
      );
      expect(refundEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("5. DB Write Failure Compensation", () => {
    test("写库失败时自动退款", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-db-fail";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockRejectedValueOnce(new Error("DB connection lost"));
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: true,
        reply: "你好！",
        requestId: "prov-req-1",
        usage: { modelId: "test-model", inputTokens: 10, outputTokens: 5 },
      });
      mockSafety.moderateAiOutput.mockReturnValue({
        blocked: false,
        summary: "摘要",
        content: "你好！",
        disclaimer: "免责声明",
      });

      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("DB_WRITE_FAILED");
      const refundEntries = mockDb.aiCreditLedger.create.mock.calls.filter(
        (c: any) => c[0].data.entryType === "refund"
      );
      expect(refundEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Refund Pending", () => {
    test("退款失败时返回 REFUND_PENDING 并记录风险日志", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-refund-pending";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      // First call: consume check -> null, consume create -> ok
      // Second call: refund check -> null, refund create -> fail
      let ledgerCallCount = 0;
      mockDb.aiCreditLedger.findUnique.mockImplementation(() => {
        return Promise.resolve(null);
      });
      mockDb.aiCreditLedger.create.mockImplementation(() => {
        ledgerCallCount++;
        if (ledgerCallCount >= 2) {
          return Promise.reject(new Error("DB write failed"));
        }
        return Promise.resolve({ id: crypto.randomUUID() });
      });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: false,
        status: 502,
        reply: null,
        error: "Provider timeout",
      });

      const { logAiRiskEvent } = await import("@/lib/ai/risk-log");
      const riskSpy = jest.spyOn(await import("@/lib/ai/risk-log"), "logAiRiskEvent").mockResolvedValue("risk-id");

      const result = await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("REFUND_PENDING");
      expect(result.status).toBe(502);
      // Risk event should be logged
      expect(riskSpy).toHaveBeenCalled();
      const riskCall = riskSpy.mock.calls.find((c: any) => c[0].eventType === "refund_failed");
      expect(riskCall).toBeDefined();

      riskSpy.mockRestore();
    });
  });

  describe("7. Enterprise Data Isolation", () => {
    test("个人公开主页 AI 查询产品时必须限定个人归属", async () => {
      const profile = setupProfile();
      const conversation = { id: crypto.randomUUID(), profileId: profile.id, visitorSessionId: "sess-1", status: "active" };
      const account = setupCreditAccount(100);
      const requestId = "req-isolation";

      mockDb.profile.findUnique.mockResolvedValue(profile);
      mockDb.aiConversation.findFirst.mockResolvedValue(conversation);
      mockDb.aiMessage.findMany.mockResolvedValue([]);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 });
      mockDb.aiCreditAccount.findUniqueOrThrow.mockResolvedValue({ balance: 99 });
      mockDb.aiMessage.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockBailian.callBailianApplication.mockResolvedValue({
        ok: true,
        reply: "你好！",
        requestId: "prov-req-1",
        usage: { modelId: "test-model", inputTokens: 10, outputTokens: 5 },
      });

      await runCommercialAgent("customer-service", {
        username: "testuser",
        message: "hello",
        requestId,
      });

      const profileQuery = mockDb.profile.findUnique.mock.calls[0][0];
      // Ensure products and knowledgeDocs are queried through profile.user relation
      // which automatically scopes to the personal user and excludes workspace data
      expect(profileQuery.include.user.select.products).toBeDefined();
      expect(profileQuery.include.user.select.knowledgeDocs).toBeDefined();
    });
  });

  describe("8. Idempotency Key Binding", () => {
    test("bindIdempotencyKey 绑定用户、主页和会话上下文", () => {
      const key = bindIdempotencyKey("user-1", "client-key", { profileId: "profile-1", conversationId: "conv-1" });
      expect(key).toBe("user-1:profile-1:conv-1:client-key");
    });

    test("validateIdempotencyKey 拒绝无效输入", () => {
      expect(validateIdempotencyKey(null)).toBeNull();
      expect(validateIdempotencyKey("")).toBeNull();
      expect(validateIdempotencyKey("   ")).toBeNull();
      expect(validateIdempotencyKey(123 as any)).toBeNull();
      expect(validateIdempotencyKey("a".repeat(129))).toBeNull();
      expect(validateIdempotencyKey("valid-key")).toBe("valid-key");
    });
  });

  describe("9. consumeCredit / refundCredit idempotency", () => {
    test("consumeCredit 使用外部 idempotencyKey 并绑定用户上下文", async () => {
      const userId = "user-test";
      const account = setupCreditAccount(100);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue(null);
      mockDb.aiCreditLedger.create.mockResolvedValue({ id: crypto.randomUUID() });
      mockDb.aiCreditAccount.update.mockResolvedValue({ balance: 99 });

      const result = await consumeCredit(
        userId,
        1,
        "test",
        "ref-1",
        {},
        "client-key",
      );

      expect(result.success).toBe(true);
      const ledgerCall = mockDb.aiCreditLedger.create.mock.calls[0][0];
      expect(ledgerCall.data.idempotencyKey).toContain("user-test");
      expect(ledgerCall.data.idempotencyKey).toContain("client-key");
    });

    test("refundCredit 幂等：重复退款只执行一次", async () => {
      const userId = "user-test";
      const account = setupCreditAccount(99);
      mockDb.aiCreditAccount.findUnique.mockResolvedValue(account);
      mockDb.aiCreditLedger.findUnique.mockResolvedValue({
        id: "ledger-1",
        balanceAfter: 100,
        entryType: "refund",
      });

      const result = await refundCredit(
        userId,
        1,
        "test",
        "ref-1",
        "test refund",
        "client-key",
      );

      expect(result.success).toBe(true);
      expect(result.alreadyApplied).toBe(true);
      expect(mockDb.aiCreditAccount.update).not.toHaveBeenCalled();
    });
  });
});
