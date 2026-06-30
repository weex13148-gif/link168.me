// 统一 AI Provider：封装 chat completions 调用，兼容 OpenAI 兼容接口（阿里云百炼、通义千问、DeepSeek、豆包、智谱等）
// 配置读取优先级：AppConfig(DB) > process.env > DEFAULT_CONFIG
// 仅在服务端使用，前端不得直接引用（避免泄露 API Key）。

import { getConfig } from "@/lib/app-config";
import type { AiAssistantDefinition } from "@/lib/ai/assistants";
import { BailianProvider } from "@/lib/ai/providers/bailian";
import { callBailianApplication } from "@/lib/ai/providers/bailian-application";
import type { AiProviderResult } from "@/lib/ai/providers/types";

// Re-export for convenience
export type { AiProviderResult } from "@/lib/ai/providers/types";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderConfig = {
  provider: string; // "openai-compatible" | "qwen" | "deepseek" | ... (当前全部走 OpenAI 兼容)
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  // 百炼应用接口专用字段
  bailianAppId: string;
  bailianWorkspaceId: string;
};

export type ProviderChatResult = {
  ok: boolean;
  rawContent: string; // 模型原始返回（可能是 JSON 字符串，也可能是纯文本）
  error?: string;
  status?: number;
};

// 从 env 读取（兜底逻辑）：优先大写，其次小写
function envValue(key: string): string | undefined {
  const up = process.env[key];
  if (up && up.trim()) return up.trim();
  const low = process.env[key.toLowerCase()];
  if (low && low.trim()) return low.trim();
  return undefined;
}

export async function getProviderConfig(assistant: AiAssistantDefinition): Promise<ProviderConfig> {
  const config = await getConfig();

  const dbApiKey = typeof config.aiApiKey === "string" ? config.aiApiKey.trim() : "";
  const dbBaseUrl = typeof config.aiBaseUrl === "string" ? config.aiBaseUrl.trim() : "";
  const dbModel = typeof config.aiModel === "string" ? config.aiModel.trim() : "";
  const dbProvider = typeof config.aiProvider === "string" ? config.aiProvider.trim() : "";
  const dbBailianAppId = typeof config.aiBailianAppId === "string" ? config.aiBailianAppId.trim() : "";
  const dbBailianWorkspaceId = typeof config.aiBailianWorkspaceId === "string" ? config.aiBailianWorkspaceId.trim() : "";

  const apiKey = dbApiKey || envValue("AI_API_KEY") || envValue("OPENAI_API_KEY") || "";
  const baseUrl =
    dbBaseUrl ||
    envValue("AI_BASE_URL") ||
    envValue("OPENAI_BASE_URL") ||
    "https://dashscope.aliyuncs.com/api/v1";
  const model = dbModel || envValue("AI_MODEL") || "qwen-plus";
  const provider = dbProvider || envValue("AI_PROVIDER") || "qwen";
  const bailianAppId = dbBailianAppId || envValue("BAILIAN_APP_ID") || "";
  const bailianWorkspaceId = dbBailianWorkspaceId || envValue("BAILIAN_WORKSPACE_ID") || "";

  // 读取新配置字段（服务端使用）
  const requestTimeout = typeof config.aiRequestTimeout === "number" && config.aiRequestTimeout > 0 ? config.aiRequestTimeout : 45;
  const maxOutputTokens = typeof config.aiMaxOutputTokens === "number" && config.aiMaxOutputTokens > 0 ? config.aiMaxOutputTokens : 1500;
  const temperature = typeof config.aiTemperature === "number" && config.aiTemperature >= 0 ? config.aiTemperature : 0.3;

  // 去掉 URL 尾部斜杠
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  return {
    provider,
    baseUrl: normalizedBase,
    model,
    apiKey,
    temperature,
    maxTokens: maxOutputTokens,
    timeoutMs: requestTimeout * 1000,
    bailianAppId,
    bailianWorkspaceId,
  };
}

export function isProviderConfigured(config: ProviderConfig): boolean {
  return Boolean(config.apiKey) && Boolean(config.baseUrl) && Boolean(config.model);
}

// 从模型原始文本中抽取 JSON，兼容：
// - 直接返回 JSON 字符串
// - ```json ... ``` 代码块
// - {...} 开头/结尾的 JSON 片段
// - 非 JSON 文本：回退为 { summary, suggestions: [], content }
function extractStructuredOutput(raw: string): {
  summary: string;
  suggestions: string[];
  content: string;
} {
  const trimmed = (raw || "").trim();

  if (!trimmed) {
    return {
      summary: "模型未返回有效内容，请稍后重试。",
      suggestions: [],
      content: "（未收到有效回复。如多次失败，请检查模型或 API Key 配置。）",
    };
  }

  // 1. 尝试直接解析
  let target: string = trimmed;

  // 2. 去掉 ```json ... ``` 代码块
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    target = codeBlockMatch[1].trim();
  } else {
    // 3. 取首个 { ... } 片段
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      target = trimmed.slice(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    const parsed = JSON.parse(target) as { [key: string]: unknown };
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "（AI 未生成 summary，以下为原始回复的简要摘要。）";
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];
    const content =
      typeof parsed.content === "string" && parsed.content.trim()
        ? parsed.content.trim()
        : trimmed;

    return {
      summary,
      suggestions,
      content,
    };
  } catch {
    // 4. JSON 解析失败：回退为纯文本结构
    const firstLine = trimmed.split("\n").find((line) => line.trim()) || trimmed.slice(0, 60);
    return {
      summary: firstLine.slice(0, 80),
      suggestions: [],
      content: trimmed,
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
      error: "AI 配置未完成：缺少 API Key / Base URL / Model。请在超级管理员的 AI 配置页面补充。",
      status: 400,
    };
  }

  const endpoint = `${config.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
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

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        rawContent: "",
        error: `AI 服务返回错误（${response.status}）：${text.slice(0, 200)}`,
        status: response.status,
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return {
        ok: false,
        rawContent: "",
        error: data?.error?.message || "AI 未返回有效内容。",
        status: 502,
      };
    }

    return { ok: true, rawContent: content };
  } catch (error) {
    clearTimeout(timer);
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      rawContent: "",
      error: `调用 AI 服务失败：${message}`,
      status: 502,
    };
  }
}

/**
 * 使用百炼 Provider 调用 AI（第一轮仅限社媒运营助理）
 * 返回统一结构 AiProviderResult
 */
const bailianProvider = new BailianProvider();

export async function chatWithBailian(
  config: ProviderConfig,
  messages: ChatMessage[],
  assistant: AiAssistantDefinition,
): Promise<{ ok: true; data: AiProviderResult } | { ok: false; error: string; status: number }> {
  // 第一轮权限检查：只允许社媒运营助理调用百炼
  if (!bailianProvider.supportsAssistant(assistant.title)) {
    return {
      ok: false,
      error: `当前助手「${assistant.title}」暂不支持百炼 AI。`,
      status: 403,
    };
  }

  if (!isProviderConfigured(config)) {
    return {
      ok: false,
      error: "AI 配置未完成：缺少 API Key / Base URL / Model。请在超级管理员的 AI 配置页面补充。",
      status: 400,
    };
  }

  const result = await bailianProvider.chat(config, messages);

  if (!result.ok) {
    // 将 ProviderError 转换为 ProviderChatResult 格式
    const statusMap: Record<string, number> = {
      TIMEOUT: 408,
      AUTH_ERROR: 401,
      NOT_FOUND: 404,
      RATE_LIMIT: 429,
      SERVER_ERROR: 502,
      EMPTY_RESPONSE: 502,
      INVALID_JSON: 502,
      NETWORK_ERROR: 502,
      UNKNOWN: 500,
    };
    return {
      ok: false,
      error: result.error.message,
      status: statusMap[result.error.type] ?? 500,
    };
  }

  return result;
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
  bailianResult?: AiProviderResult;
}> {
  const config = await getProviderConfig(assistant);

  // 第一阶段：检查是否允许该助手使用百炼
  if (!bailianProvider.supportsAssistant(assistant.title)) {
    return {
      ok: false,
      error: `当前助手「${assistant.title}」暂不支持百炼 AI，请联系管理员。`,
      status: 403,
    };
  }

  // 百炼应用接口：必须有 App ID + API Key 才走正式链路
  const useAppInterface = Boolean(config.bailianAppId) && Boolean(config.apiKey);

  if (!useAppInterface) {
    // 禁止自动回退模型直连 — 明确告知未配置
    if (!config.bailianAppId) {
      return { ok: false, error: "百炼应用 App ID 未配置，请在超级管理员后台配置百炼参数。", status: 400 };
    }
    if (!config.apiKey) {
      return { ok: false, error: "百炼 API Key 未配置，请在超级管理员后台配置百炼参数。", status: 400 };
    }
    return { ok: false, error: "AI 服务未配置，请在超级管理员后台补充配置。", status: 400 };
  }

  // 正式链路：百炼应用接口
  const systemPrompt = [
    assistant.systemPrompt,
    "",
    "【输出格式要求】",
    assistant.outputFormat,
    "",
    "【风险提示】",
    assistant.riskNotice,
  ].join("\n");

  const trimmedHistory = (history || []).slice(-20);
  const conversation: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory.filter((m) => m && typeof m.role === "string" && typeof m.content === "string"),
    { role: "user", content: userMessage },
  ];

  // 将 messages 格式化为单个 prompt 字符串
  const prompt = conversation
    .map((m) => `${m.role === "system" ? "系统" : m.role === "assistant" ? "助手" : "用户"}：${m.content}`)
    .join("\n");

  const appResult = await callBailianApplication(
    {
      appId: config.bailianAppId,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      workspaceId: config.bailianWorkspaceId || undefined,
    },
    prompt,
  );

  if (!appResult.ok) {
    return {
      ok: false,
      error: appResult.error,
      status: appResult.status,
    };
  }

  const structured = extractStructuredOutput(appResult.reply);

  return {
    ok: true,
    reply: {
      summary: structured.summary,
      suggestions: structured.suggestions,
      content: structured.content,
      raw: appResult.reply,
      disclaimer: assistant.disclaimer,
      assistantTitle: assistant.title,
    },
    providerMeta: { provider: "bailian-application", model: appResult.usage?.modelId ?? config.model },
    bailianResult: {
      text: appResult.reply,
      model: appResult.usage?.modelId ?? config.model,
      inputTokens: appResult.usage?.inputTokens ?? 0,
      outputTokens: appResult.usage?.outputTokens ?? 0,
      totalTokens: appResult.usage?.totalTokens ?? 0,
      latencyMs: 0,
      requestId: appResult.requestId,
    },
  };
}
