import {
  DEFAULT_AI_RECEPTION_CONFIG,
  normalizeAiReceptionConfig,
  parseAiReceptionQuickActions,
  serializeAiReceptionQuickActions,
  toPublicAiReceptionConfig,
  type AiReceptionQuickAction,
} from "@/lib/ai/reception-config";

describe("AI reception customer configuration boundary", () => {
  test("customer configuration only accepts business-facing fields", () => {
    const normalized = normalizeAiReceptionConfig({
      enabled: true,
      assistantName: "阿宝顾问",
      welcomeMessage: "你好，我来帮你了解业务。",
      tone: "professional",
      allowProductRecommendation: false,
      collectLead: true,
      allowReport: false,
      allowTransferToHuman: true,
      privacyNoticeText: "请勿发送敏感信息。",
      providerMode: "internal-provider",
      aiProvider: "internal-provider",
      aiModel: "internal-model",
      aiCredential: "redacted-value",
      aiApplicationId: "internal-app",
      aiEndpoint: "https://example.com/internal",
    });

    expect(normalized).toEqual({
      enabled: true,
      assistantName: "阿宝顾问",
      welcomeMessage: "你好，我来帮你了解业务。",
      tone: "professional",
      allowProductRecommendation: false,
      collectLead: true,
      allowReport: false,
      allowTransferToHuman: true,
      privacyNoticeText: "请勿发送敏感信息。",
      quickActionsJson: "[]",
    });
    expect(normalized).not.toHaveProperty("providerMode");
    expect(normalized).not.toHaveProperty("aiProvider");
    expect(normalized).not.toHaveProperty("aiModel");
    expect(normalized).not.toHaveProperty("aiCredential");
    expect(normalized).not.toHaveProperty("aiApplicationId");
    expect(normalized).not.toHaveProperty("aiEndpoint");
  });

  test("missing customer configuration resolves to a disabled safe default", () => {
    expect(normalizeAiReceptionConfig(null)).toEqual(DEFAULT_AI_RECEPTION_CONFIG);
    expect(DEFAULT_AI_RECEPTION_CONFIG.enabled).toBe(false);
    expect(DEFAULT_AI_RECEPTION_CONFIG.quickActionsJson).toBe("[]");
  });

  test("invalid tone and excessive text are rejected", () => {
    expect(() => normalizeAiReceptionConfig({ tone: "provider-controlled" })).toThrow("语气风格");
    expect(() => normalizeAiReceptionConfig({ assistantName: "a".repeat(31) })).toThrow("助手名称");
    expect(() => normalizeAiReceptionConfig({ welcomeMessage: "a".repeat(201) })).toThrow("欢迎语");
    expect(() => normalizeAiReceptionConfig({ privacyNoticeText: "a".repeat(301) })).toThrow("隐私提示");
  });

  test("quick actions are sorted and disabled actions are hidden from public output", () => {
    const actions: AiReceptionQuickAction[] = [
      { id: "second", label: "查看价格", type: "auto_reply", value: "价格以当前页面为准。", enabled: true, position: 2 },
      { id: "hidden", label: "隐藏按钮", type: "auto_reply", value: "不会公开", enabled: false, position: 1 },
      { id: "first", label: "了解服务", type: "send_message", value: "请介绍你的服务", enabled: true, position: 0 },
    ];

    const serialized = serializeAiReceptionQuickActions(actions);
    const all = parseAiReceptionQuickActions(serialized);
    const publicActions = parseAiReceptionQuickActions(serialized, { publicOnly: true });

    expect(all.map((action) => action.id)).toEqual(["first", "hidden", "second"]);
    expect(publicActions.map((action) => action.id)).toEqual(["first", "second"]);
  });

  test("quick actions allow five explicit action types and reject unsafe values", () => {
    const valid: AiReceptionQuickAction[] = [
      { id: "1", label: "自动回复", type: "auto_reply", value: "这是预设回复", enabled: true, position: 0 },
      { id: "2", label: "问 AI", type: "send_message", value: "请介绍产品", enabled: true, position: 1 },
      { id: "3", label: "打开官网", type: "open_url", value: "https://link168.me", enabled: true, position: 2 },
      { id: "4", label: "复制微信", type: "copy_text", value: "contact-id", enabled: true, position: 3 },
      { id: "5", label: "电话咨询", type: "call_phone", value: "+8613800138000", enabled: true, position: 4 },
    ];

    expect(parseAiReceptionQuickActions(serializeAiReceptionQuickActions(valid))).toHaveLength(5);
    expect(() => serializeAiReceptionQuickActions([
      { id: "bad", label: "非安全链接", type: "open_url", value: "http://example.com", enabled: true, position: 0 },
    ])).toThrow("公网 HTTPS");
    expect(() => serializeAiReceptionQuickActions([
      { id: "bad", label: "内网", type: "open_url", value: "https://127.0.0.1/internal", enabled: true, position: 0 },
    ])).toThrow("公网 HTTPS");
    expect(() => serializeAiReceptionQuickActions([
      { id: "bad", label: "电话", type: "call_phone", value: "not-a-phone", enabled: true, position: 0 },
    ])).toThrow("电话号码");
  });

  test("more than six quick actions are rejected", () => {
    const actions: AiReceptionQuickAction[] = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      label: `按钮${index}`,
      type: "auto_reply",
      value: "回复",
      enabled: true,
      position: index,
    }));

    expect(() => serializeAiReceptionQuickActions(actions)).toThrow("最多配置 6 个");
  });

  test("public DTO exposes only customer presentation fields", () => {
    const dto = toPublicAiReceptionConfig({
      enabled: true,
      assistantName: "阿宝顾问",
      welcomeMessage: "你好",
      tone: "friendly",
      allowProductRecommendation: true,
      collectLead: true,
      allowReport: true,
      allowTransferToHuman: false,
      privacyNoticeText: null,
      providerMode: "internal-provider",
      quickActionsJson: JSON.stringify([
        { id: "1", label: "价格", type: "auto_reply", value: "价格以页面为准", enabled: true, position: 0 },
      ]),
    });

    expect(dto).toEqual({
      enabled: true,
      assistantName: "阿宝顾问",
      welcomeMessage: "你好",
      tone: "friendly",
      allowProductRecommendation: true,
      collectLead: true,
      allowReport: true,
      privacyNoticeText: null,
      quickActions: [
        { id: "1", label: "价格", type: "auto_reply", value: "价格以页面为准", enabled: true, position: 0 },
      ],
    });
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/internal-provider|internal-model|credential|endpoint|workspace|token/i);
    expect(dto).not.toHaveProperty("providerMode");
    expect(dto).not.toHaveProperty("allowTransferToHuman");
  });
});
