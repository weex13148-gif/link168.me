import { sanitizePhoneNumber, sanitizePublicUrl } from "@/lib/public-url-security";

export const AI_RECEPTION_TONES = ["friendly", "professional", "concise"] as const;
export type AiReceptionTone = (typeof AI_RECEPTION_TONES)[number];

export const AI_RECEPTION_QUICK_ACTION_TYPES = [
  "auto_reply",
  "send_message",
  "open_url",
  "copy_text",
  "call_phone",
] as const;

export type AiReceptionQuickActionType = (typeof AI_RECEPTION_QUICK_ACTION_TYPES)[number];

export type AiReceptionQuickAction = {
  id: string;
  label: string;
  type: AiReceptionQuickActionType;
  value: string;
  enabled: boolean;
  position: number;
};

export type AiReceptionConfigPatch = {
  enabled: boolean;
  assistantName: string;
  welcomeMessage: string;
  tone: AiReceptionTone;
  allowProductRecommendation: boolean;
  collectLead: boolean;
  allowReport: boolean;
  allowTransferToHuman: boolean;
  privacyNoticeText: string | null;
  quickActionsJson: string;
};

export type AiReceptionConfigRecord = AiReceptionConfigPatch & {
  providerMode?: string | null;
};

export type CustomerAiReceptionConfig = {
  enabled: boolean;
  assistantName: string;
  welcomeMessage: string;
  tone: AiReceptionTone;
  allowProductRecommendation: boolean;
  collectLead: boolean;
  allowReport: boolean;
  privacyNoticeText: string | null;
  quickActions: AiReceptionQuickAction[];
};

export type PublicAiReceptionConfig = CustomerAiReceptionConfig;

export const DEFAULT_AI_RECEPTION_CONFIG: AiReceptionConfigPatch = Object.freeze({
  enabled: false,
  assistantName: "AI 助理",
  welcomeMessage: "你好！我是 AI 助理，有什么可以帮你？",
  tone: "friendly",
  allowProductRecommendation: true,
  collectLead: true,
  allowReport: true,
  allowTransferToHuman: false,
  privacyNoticeText: null,
  quickActionsJson: "[]",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string, maxLength: number, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error(`${label}格式不正确。`);
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (normalized.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符。`);
  return normalized;
}

function nullableText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label}格式不正确。`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符。`);
  return normalized;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeTone(value: unknown, fallback: AiReceptionTone): AiReceptionTone {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !AI_RECEPTION_TONES.includes(value as AiReceptionTone)) {
    throw new Error("语气风格不在允许范围内。");
  }
  return value as AiReceptionTone;
}

function normalizeAction(raw: unknown, index: number): AiReceptionQuickAction {
  if (!isRecord(raw)) throw new Error(`第 ${index + 1} 个快捷按钮格式不正确。`);

  const id = text(raw.id, "快捷按钮 ID", 80, `action-${index + 1}`);
  const label = text(raw.label, "快捷按钮名称", 20, "");
  if (!label) throw new Error("快捷按钮名称不能为空。");

  if (typeof raw.type !== "string" || !AI_RECEPTION_QUICK_ACTION_TYPES.includes(raw.type as AiReceptionQuickActionType)) {
    throw new Error("快捷按钮类型不在允许范围内。");
  }
  const type = raw.type as AiReceptionQuickActionType;

  const value = text(raw.value, "快捷按钮内容", 1000, "");
  if (!value) throw new Error("快捷按钮内容不能为空。");

  let safeValue = value;
  if (type === "open_url") {
    const sanitized = sanitizePublicUrl(value);
    if (!sanitized.safe || !sanitized.url) throw new Error("快捷按钮链接必须是安全的公网 HTTPS 地址。");
    const parsed = new URL(sanitized.url);
    if (parsed.protocol !== "https:") throw new Error("快捷按钮链接必须是安全的公网 HTTPS 地址。");
    safeValue = parsed.toString();
  }
  if (type === "call_phone") {
    const sanitized = sanitizePhoneNumber(value);
    if (!sanitized.safe || !sanitized.phone) throw new Error("快捷按钮电话号码格式不正确。");
    safeValue = sanitized.phone;
  }

  const positionNumber = Number(raw.position);
  const position = Number.isInteger(positionNumber) && positionNumber >= 0 ? positionNumber : index;

  return {
    id,
    label,
    type,
    value: safeValue,
    enabled: booleanValue(raw.enabled, true),
    position,
  };
}

function normalizeActionArray(value: unknown): AiReceptionQuickAction[] {
  if (!Array.isArray(value)) throw new Error("快捷按钮必须是数组。");
  if (value.length > 6) throw new Error("最多配置 6 个快捷按钮。");
  return value
    .map((item, index) => ({ item: normalizeAction(item, index), index }))
    .sort((a, b) => a.item.position - b.item.position || a.index - b.index)
    .map(({ item }, position) => ({ ...item, position }));
}

export function serializeAiReceptionQuickActions(actions: AiReceptionQuickAction[]): string {
  return JSON.stringify(normalizeActionArray(actions));
}

export function parseAiReceptionQuickActions(
  value: string | null | undefined,
  options: { publicOnly?: boolean } = {},
): AiReceptionQuickAction[] {
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  let actions: AiReceptionQuickAction[];
  try {
    actions = normalizeActionArray(parsed);
  } catch {
    return [];
  }
  return options.publicOnly ? actions.filter((action) => action.enabled) : actions;
}

export function normalizeAiReceptionConfig(input: unknown): AiReceptionConfigPatch {
  if (!isRecord(input)) return { ...DEFAULT_AI_RECEPTION_CONFIG };

  let actions: AiReceptionQuickAction[] = [];
  if (Array.isArray(input.quickActions)) {
    actions = normalizeActionArray(input.quickActions);
  } else if (typeof input.quickActionsJson === "string" && input.quickActionsJson.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.quickActionsJson);
    } catch {
      throw new Error("快捷按钮数据格式不正确。");
    }
    actions = normalizeActionArray(parsed);
  }

  return {
    enabled: booleanValue(input.enabled, DEFAULT_AI_RECEPTION_CONFIG.enabled),
    assistantName: text(input.assistantName, "助手名称", 30, DEFAULT_AI_RECEPTION_CONFIG.assistantName),
    welcomeMessage: text(input.welcomeMessage, "欢迎语", 200, DEFAULT_AI_RECEPTION_CONFIG.welcomeMessage),
    tone: normalizeTone(input.tone, DEFAULT_AI_RECEPTION_CONFIG.tone),
    allowProductRecommendation: booleanValue(
      input.allowProductRecommendation,
      DEFAULT_AI_RECEPTION_CONFIG.allowProductRecommendation,
    ),
    collectLead: booleanValue(input.collectLead, DEFAULT_AI_RECEPTION_CONFIG.collectLead),
    allowReport: booleanValue(input.allowReport, DEFAULT_AI_RECEPTION_CONFIG.allowReport),
    // 人工坐席与实时接管不属于当前 MVP，客户端不能开启该能力。
    allowTransferToHuman: false,
    privacyNoticeText: nullableText(input.privacyNoticeText, "隐私提示", 300),
    quickActionsJson: JSON.stringify(actions),
  };
}

export function toCustomerAiReceptionConfig(
  config: AiReceptionConfigRecord | null | undefined,
): CustomerAiReceptionConfig {
  const normalized = normalizeAiReceptionConfig(config);
  return {
    enabled: normalized.enabled,
    assistantName: normalized.assistantName,
    welcomeMessage: normalized.welcomeMessage,
    tone: normalized.tone,
    allowProductRecommendation: normalized.allowProductRecommendation,
    collectLead: normalized.collectLead,
    allowReport: normalized.allowReport,
    privacyNoticeText: normalized.privacyNoticeText,
    quickActions: parseAiReceptionQuickActions(normalized.quickActionsJson),
  };
}

export function toPublicAiReceptionConfig(config: AiReceptionConfigRecord): PublicAiReceptionConfig {
  const customer = toCustomerAiReceptionConfig(config);
  return {
    ...customer,
    quickActions: customer.quickActions.filter((action) => action.enabled),
  };
}
