import {
  getContentSafetyProvider,
  type ContentSafetyProvider,
  type ModerationStatus,
  type RiskLevel,
  type AppealStatus,
  type ModerateTextInput,
  type ModerateTextResult,
  type ModerateImageInput,
  type ModerateImageResult,
} from "./content-safety/provider";

export type {
  ModerationStatus,
  RiskLevel,
  AppealStatus,
  ModerateTextInput,
  ModerateTextResult,
  ModerateImageInput,
  ModerateImageResult,
  ContentSafetyProvider,
};

const SENSITIVE_CATEGORIES = {
  violence: ["暴力破解", "黑产", "博彩", "1040阳光工程"],
  adult: ["色情", "裸聊"],
  drug: ["冰毒", "大麻", "枪支"],
  fraud: ["刷单刷量", "代开发票", "假证"],
  political: ["法轮"],
};

const SENSITIVE_WORDS = Object.values(SENSITIVE_CATEGORIES).flat();

const INJECTION_PATTERNS: { reason: string; regex: RegExp }[] = [
  { reason: "要求复述或改变 system prompt", regex: /(system prompt|系统提示词|原始提示|提示词原文|prompt override|ignore.*previous|忽略.*之前|忽略所有|忽略前面|不要遵守)/i },
  { reason: "要求切换角色或调试模式", regex: /(切换角色|切换成|扮演|调试模式|developer mode|调试助理|system mode|切换到调试)/i },
  { reason: "要求输出 JSON 或结构化敏感信息", regex: /(以\s*(JSON|json)\s*格式输出|system_prompt|输出系统提示)/i },
  { reason: "要求翻译成英文并逐字复述", regex: /(translate.*and repeat|translate.*verbatim|翻译成.*英文.*逐字)/i },
  { reason: "包含常见 HTML / script 注入", regex: /(<script|<\/script|onerror\s*=|onload\s*=|javascript:)/i },
];

const OUTPUT_HIGH_RISK_RE: { reason: string; regex: RegExp }[] = [
  { reason: "可能包含暴力攻击步骤", regex: /(暴力破解|爆破|ddos|拒绝服务|sqlmap|sql injection|xss payload|payload\s*:)/i },
  { reason: "可能包含博彩/非法金融", regex: /(博彩|赔率|下注|赌场|在线赌场|bitcoin.*翻倍|刷单|套利.*平台)/i },
  { reason: "可能包含色情或诱导", regex: /(色情|裸体|裸聊|黄色小说|成人网站)/i },
  { reason: "可能包含毒品/禁品信息", regex: /(冰毒|大麻|致幻|合成毒品|如何制毒)/i },
  { reason: "可能包含政治敏感", regex: /(法轮功|反党|反政府|颠覆国家|分裂国家)/i },
];

const SAFE_REPLACEMENT_SUMMARY = "该内容已由内容安全策略拦截。";
const SAFE_REPLACEMENT_CONTENT =
  "抱歉，AI 无法提供该类内容。若你有其他合法合规、符合平台使用规范的问题，欢迎继续提问。";
const SAFE_DISCLAIMER =
  "以上内容由 AI 生成，仅供参考，不替代专业意见。请勿用于非法用途或违反平台使用规范。";

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const DANGEROUS_PROTOCOL_RE = /\b(javascript|vbscript|data)\s*:/gi;

export interface ContentModerationRecord {
  id: string;
  contentType: "text" | "image";
  contentRef: string;
  status: ModerationStatus;
  riskLevel?: RiskLevel;
  hits?: string[];
  reason?: string;
  provider: string;
  reviewedAt?: string;
  reviewerId?: string;
  appealStatus: AppealStatus;
  appealedAt?: string;
  createdAt: string;
}

export function sanitizeUserMessage(text: string): string {
  let safe = text;
  safe = safe.replace(HTML_TAG_RE, "");
  safe = safe.replace(DANGEROUS_PROTOCOL_RE, "[blocked-protocol]");
  safe = safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return safe.trim();
}

export function sanitizePublicText(text: string | null | undefined): string | null {
  if (text == null) return null;
  let safe = String(text);
  safe = safe.replace(HTML_TAG_RE, "");
  safe = safe.replace(DANGEROUS_PROTOCOL_RE, "[blocked]");
  safe = safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return safe.trim() || null;
}

export function detectPromptInjection(text: string): { detected: boolean; reason: string | null } {
  if (!text) return { detected: false, reason: null };
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(text)) {
      return { detected: true, reason: pattern.reason };
    }
  }
  return { detected: false, reason: null };
}

export function hasSensitiveContent(text: string): { detected: boolean; matches: string[] } {
  if (!text) return { detected: false, matches: [] };
  const normalized = text.toLowerCase();
  const hits: string[] = [];
  for (const word of SENSITIVE_WORDS) {
    if (normalized.includes(word.toLowerCase())) {
      hits.push(word);
    }
  }
  return { detected: hits.length > 0, matches: hits };
}

export type ModerateAiOutputResult = {
  ok: boolean;
  blocked: boolean;
  reason: string | null;
  summary: string;
  content: string;
  disclaimer: string;
};

export function moderateAiOutput(rawSummary: string | null | undefined, rawContent: string | null | undefined): ModerateAiOutputResult {
  const summary = typeof rawSummary === "string" ? rawSummary : "";
  const content = typeof rawContent === "string" ? rawContent : "";
  const combined = `${summary}\n${content}`;

  const safeSummary = sanitizePublicText(summary) || "";
  const safeContent = sanitizePublicText(content) || "";

  let blocked = false;
  let reason: string | null = null;

  for (const pattern of OUTPUT_HIGH_RISK_RE) {
    if (pattern.regex.test(combined)) {
      blocked = true;
      reason = pattern.reason;
      break;
    }
  }

  if (blocked) {
    return {
      ok: true,
      blocked: true,
      reason,
      summary: SAFE_REPLACEMENT_SUMMARY,
      content: SAFE_REPLACEMENT_CONTENT,
      disclaimer: SAFE_DISCLAIMER,
    };
  }

  return {
    ok: true,
    blocked: false,
    reason: null,
    summary: safeSummary,
    content: safeContent,
    disclaimer: SAFE_DISCLAIMER,
  };
}

export type TextModerationResult = {
  ok: boolean;
  status: ModerationStatus;
  riskLevel?: RiskLevel;
  reason?: string;
  hits?: string[];
  provider: string;
};

export async function moderateTextContent(input: ModerateTextInput): Promise<TextModerationResult> {
  const provider = getContentSafetyProvider();

  try {
    const result = await provider.moderateText(input);

    if (!result.ok) {
      return {
        ok: false,
        status: "pending_manual_review",
        reason: result.reason || "内容审核服务异常，转人工复核",
        provider: provider.name,
      };
    }

    if (result.passed) {
      return {
        ok: true,
        status: "approved",
        riskLevel: result.riskLevel || "low",
        hits: result.hits,
        reason: result.reason,
        provider: provider.name,
      };
    }

    if (result.riskLevel === "high") {
      return {
        ok: true,
        status: "rejected",
        riskLevel: "high",
        reason: result.reason || "内容不符合规范",
        hits: result.hits,
        provider: provider.name,
      };
    }

    return {
      ok: true,
      status: "pending_manual_review",
      riskLevel: result.riskLevel || "medium",
      reason: result.reason || "需人工复核",
      hits: result.hits,
      provider: provider.name,
    };
  } catch (err) {
    return {
      ok: false,
      status: "pending_manual_review",
      reason: err instanceof Error ? err.message : "内容审核异常，转人工复核",
      provider: provider.name,
    };
  }
}

export type ImageModerationResult = {
  ok: boolean;
  status: ModerationStatus;
  riskLevel?: RiskLevel;
  reason?: string;
  label?: string;
  provider: string;
};

export type ImageModerationInput = {
  size: number;
  mimeType: string;
  fileName?: string;
  localPath?: string;
  publicUrl?: string;
};

export async function moderateImageContent(input: ImageModerationInput): Promise<ImageModerationResult> {
  const provider = getContentSafetyProvider();

  try {
    const result = await provider.moderateImage({
      url: input.publicUrl,
      localPath: input.localPath,
      mimeType: input.mimeType,
      size: input.size,
      fileName: input.fileName,
    });

    if (!result.ok) {
      return {
        ok: false,
        status: "pending_manual_review",
        reason: result.reason || "图片审核服务异常，转人工复核",
        provider: provider.name,
      };
    }

    if (result.passed) {
      return {
        ok: true,
        status: "approved",
        riskLevel: result.riskLevel || "low",
        label: result.label,
        reason: result.reason,
        provider: provider.name,
      };
    }

    if (result.riskLevel === "high" && result.label && result.label !== "pending_manual_review") {
      return {
        ok: true,
        status: "rejected",
        riskLevel: "high",
        reason: result.reason || "图片内容不符合规范",
        label: result.label,
        provider: provider.name,
      };
    }

    return {
      ok: true,
      status: "pending_manual_review",
      riskLevel: result.riskLevel || "medium",
      reason: result.reason || "需人工复核",
      label: result.label,
      provider: provider.name,
    };
  } catch (err) {
    return {
      ok: false,
      status: "pending_manual_review",
      reason: err instanceof Error ? err.message : "图片审核异常，转人工复核",
      provider: provider.name,
    };
  }
}

export function isContentApproved(status: ModerationStatus): boolean {
  return status === "approved";
}

export function isContentRejected(status: ModerationStatus): boolean {
  return status === "rejected";
}

export function isContentPendingReview(status: ModerationStatus): boolean {
  return status === "pending" || status === "pending_manual_review";
}

export function canDisplayLegacyMedia(hasModerationRecord: boolean, status?: ModerationStatus): boolean {
  if (!hasModerationRecord) {
    return true;
  }
  return status === "approved";
}
