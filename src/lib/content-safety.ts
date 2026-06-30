// UGC 文本内容安全：XSS 标签剥离 / prompt injection 初筛 / 敏感词词表
// 新增：AI 输出审核 moderateAiOutput；图片内容审核 moderateImageContent
// 注意：此为本地启发式过滤，不等同于正式合规审核，后续应接入外部内容安全 API

// 分类风险词表（可配置化来源）
const SENSITIVE_CATEGORIES = {
  violence: ["暴力破解", "黑产", "博彩", "1040阳光工程"],
  adult: ["色情", "裸聊"],
  drug: ["冰毒", "大麻", "枪支"],
  fraud: ["刷单刷量", "代开发票", "假证"],
  political: ["法轮"],
};

const SENSITIVE_WORDS = Object.values(SENSITIVE_CATEGORIES).flat();

// 常见 prompt injection 模式
const INJECTION_PATTERNS: { reason: string; regex: RegExp }[] = [
  { reason: "要求复述或改变 system prompt", regex: /(system prompt|系统提示词|原始提示|提示词原文|prompt override|ignore.*previous|忽略.*之前|忽略所有|忽略前面|不要遵守)/i },
  { reason: "要求切换角色或调试模式", regex: /(切换角色|切换成|扮演|调试模式|developer mode|调试助理|system mode|切换到调试)/i },
  { reason: "要求输出 JSON 或结构化敏感信息", regex: /(以\s*(JSON|json)\s*格式输出|system_prompt|输出系统提示)/i },
  { reason: "要求翻译成英文并逐字复述", regex: /(translate.*and repeat|translate.*verbatim|翻译成.*英文.*逐字)/i },
  { reason: "包含常见 HTML / script 注入", regex: /(<script|<\/script|onerror\s*=|onload\s*=|javascript:)/i },
];

// AI 输出高风险模式：在本地启发式下用于替代回复
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

// 基础 XSS / HTML 注入字符
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const DANGEROUS_PROTOCOL_RE = /\b(javascript|vbscript|data)\s*:/gi;

export function sanitizeUserMessage(text: string): string {
  let safe = text;
  safe = safe.replace(HTML_TAG_RE, "");
  safe = safe.replace(DANGEROUS_PROTOCOL_RE, "[blocked-protocol]");
  // 去除控制字符（保留换行和制表）
  safe = safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return safe.trim();
}

export function sanitizePublicText(text: string | null | undefined): string | null {
  if (text == null) return null;
  let safe = String(text);
  safe = safe.replace(HTML_TAG_RE, "");
  safe = safe.replace(DANGEROUS_PROTOCOL_RE, "[blocked]");
  // 去控制字符
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

// AI 输出审核：
//   * 返回 { ok, reason, replacementSummary, replacementContent, disclaimer }
//   * 命中高风险模式时，返回安全替代文案；原始输出不会被写回前端
//   * 日志中只记录"命中的风险类型"，不记录完整敏感文本
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

  // 先跑 XSS / 协议过滤
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

// 图片内容审核：
//   * 当前实现为 no-op；真实上线请接入腾讯内容安全 / 阿里云内容安全 / 自研 NSFW 模型。
//   * 返回 { ok, blocked, reason }；blocked=true 时，服务端应删除已上传文件并返回统一错误。
//   * 接口结构预留：fileMeta 中可传递 fileSize / mime / magicBytes / fileName 等信息给外部 API。
export type ImageModerationResult = {
  ok: boolean;
  blocked: boolean;
  reason: string | null;
  provider?: string;
};

export type ImageModerationInput = {
  size: number; // 字节数
  mimeType: string;
  fileName?: string;
  // 可选：用于外部 API 的临时本地路径或公网可访问 URL
  localPath?: string;
  publicUrl?: string;
};

export function moderateImageContent(_input: ImageModerationInput): ImageModerationResult {
  // TODO(security): 接入真实图片内容安全 API。
  // 当前为 no-op：所有通过 MIME + magic bytes 校验的图片都放行。
  return {
    ok: true,
    blocked: false,
    reason: null,
    provider: "local-noop",
  };
}

