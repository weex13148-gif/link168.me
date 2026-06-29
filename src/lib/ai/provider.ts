import { getConfig } from "@/lib/app-config";
import type { AiAssistantDefinition } from "@/lib/ai/assistants";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export type ProviderChatResult = {
  ok: boolean;
  rawContent: string;
  error?: string;
  status?: number;
};

function envValue(key: string): string | undefined {
  const upper = process.env[key];
  if (upper?.trim()) return upper.trim();
  const lower = process.env[key.toLowerCase()];
  return lower?.trim() || undefined;
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

function normalizeProviderBaseUrl(value: string) {
  try {
    const url = new URL(value);
    const allowHttp = process.env.NODE_ENV !== "production";
    if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) return "";
    if (!url.hostname || url.username || url.password || isBlockedHostname(url.hostname)) return "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export async function getProviderConfig(assistant: AiAssistantDefinition): Promise<ProviderConfig> {
  const config = await getConfig();
  const apiKey = config.aiApiKey.trim() || envValue("AI_API_KEY") || envValue("OPENAI_API_KEY") || "";
  const rawBaseUrl =
    config.aiBaseUrl.trim() ||
    envValue("AI_BASE_URL") ||
    envValue("OPENAI_BASE_URL") ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";

  return {
    provider: config.aiProvider.trim() || envValue("AI_PROVIDER") || "qwen",
    baseUrl: normalizeProviderBaseUrl(rawBaseUrl),
    model: config.aiModel.trim() || envValue("AI_MODEL") || "qwen-plus",
    apiKey,
    temperature: assistant.defaultTemperature,
    maxTokens: assistant.defaultMaxTokens,
    timeoutMs: 60_000,
  };
}

export function isProviderConfigured(config: ProviderConfig): boolean {
  return Boolean(config.apiKey && config.baseUrl && config.model);
}

function extractStructuredOutput(raw: string): {
  summary: string;
  suggestions: string[];
  content: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      summary: "模型未返回有效内容，请稍后重试。",
      suggestions: [],
      content: "未收到有效回复。",
    };
  }

  let target = trimmed;
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    target = codeBlockMatch[1].trim();
  } else {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) target = trimmed.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(target) as Record<string, unknown>;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 200)
        : "AI 已生成回复，请查看详细内容。";
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .map((item) => (typeof item === "string" ? item.trim().slice(0, 300) : ""))
          .filter(Boolean)
          .slice(0, 10)
      : [];
    const content =
      typeof parsed.content === "string" && parsed.content.trim()
        ? parsed.content.trim().slice(0, 20_000)
        : trimmed.slice(0, 20_000);
    return { summary, suggestions, content };
  } catch {
    const firstLine = trimmed.split("\n").find((line) => line.trim()) || trimmed;
    return {
      summary: firstLine.slice(0, 200),
      suggestions: [],
      content: trimmed.slice(0, 20_000),
    };
  }
}

export async function chatWithProvider(
  config: ProviderConfig,
  messages: ChatMessage[],
  assistant: AiAssistantDefinition,
): Promise<ProviderChatResult> {
  if (!isProviderConfigured(config)) {
    return {
      ok: false,
      rawContent: "",
      error: "AI 配置未完成或 Base URL 不安全，请由超级管理员检查配置。",
      status: 503,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: Number.isFinite(config.temperature) ? config.temperature : 0.6,
        max_tokens: Number.isFinite(config.maxTokens) ? config.maxTokens : 1024,
        stream: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return {
        ok: false,
        rawContent: "",
        error: `AI 服务暂时不可用（HTTP ${response.status}）。`,
        status: response.status >= 400 && response.status < 500 ? 502 : response.status,
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      return { ok: false, rawContent: "", error: "AI 未返回有效内容。", status: 502 };
    }

    return { ok: true, rawContent: content.slice(0, 30_000) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      rawContent: "",
      error: aborted ? "AI 请求超时，请稍后重试。" : "AI 服务连接失败，请稍后重试。",
      status: 502,
    };
  } finally {
    clearTimeout(timer);
  }
}

export type StructuredAssistantReply = {
  summary: string;
  suggestions: string[];
  content: string;
  raw: string;
  disclaimer: string;
  assistantTitle: string;
};

export async function callAssistant(
  assistant: AiAssistantDefinition,
  userMessage: string,
  history: ChatMessage[],
): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
  reply?: StructuredAssistantReply;
  providerMeta?: { provider: string; model: string };
}> {
  const config = await getProviderConfig(assistant);
  const systemPrompt = [
    assistant.systemPrompt,
    "",
    "【输出格式要求】",
    assistant.outputFormat,
    "",
    "【风险提示】",
    assistant.riskNotice,
  ].join("\n");

  const trimmedHistory = history
    .slice(-20)
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({ ...message, content: message.content.slice(0, 4_000) }));

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: userMessage.slice(0, assistant.maxMessageLength) },
  ];

  const providerResult = await chatWithProvider(config, messages, assistant);
  if (!providerResult.ok) {
    return {
      ok: false,
      error: providerResult.error || "AI 服务暂时不可用。",
      status: providerResult.status ?? 502,
    };
  }

  const structured = extractStructuredOutput(providerResult.rawContent);
  return {
    ok: true,
    reply: {
      summary: structured.summary,
      suggestions: structured.suggestions,
      content: structured.content,
      raw: providerResult.rawContent,
      disclaimer: assistant.disclaimer,
      assistantTitle: assistant.title,
    },
    providerMeta: { provider: config.provider, model: config.model },
  };
}
