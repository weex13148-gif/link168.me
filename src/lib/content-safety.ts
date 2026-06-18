// UGC 文本内容安全：XSS 标签剥离 / prompt injection 初筛 / 敏感词词表
// 注意：此为本地启发式过滤，不等同于正式合规审核，后续应接入外部内容安全 API

const SENSITIVE_WORDS = [
  // 涉政/涉暴（示例，用模糊匹配降低误报）
  "暴力破解",
  "黑产",
  "博彩",
  "1040阳光工程",
  // 涉黄低俗（示例）
  "色情",
  "裸聊",
  // 毒品/禁品
  "冰毒",
  "大麻",
  "枪支",
  // 诈骗/诱导
  "刷单刷量",
  "代开发票",
  "假证",
  // 政治敏感（示例词）
  "法轮",
];

// 常见 prompt injection 模式
const INJECTION_PATTERNS: { reason: string; regex: RegExp }[] = [
  { reason: "要求复述或改变 system prompt", regex: /(system prompt|系统提示词|原始提示|提示词原文|prompt override|ignore.*previous|忽略.*之前|忽略所有|忽略前面|不要遵守)/i },
  { reason: "要求切换角色或调试模式", regex: /(切换角色|切换成|扮演|调试模式|developer mode|调试助理|system mode|切换到调试)/i },
  { reason: "要求输出 JSON 或结构化敏感信息", regex: /(以\s*(JSON|json)\s*格式输出|system_prompt|输出系统提示)/i },
  { reason: "要求翻译成英文并逐字复述", regex: /(translate.*and repeat|translate.*verbatim|翻译成.*英文.*逐字)/i },
  { reason: "包含常见 HTML / script 注入", regex: /(<script|<\/script|onerror\s*=|onload\s*=|javascript:)/i },
];

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
