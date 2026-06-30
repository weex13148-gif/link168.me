// Alibaba Bailian（百炼）Provider 适配器
// 百炼 API 兼容 OpenAI Chat Completions 接口格式
// 文档：https://help.aliyun.com/zh/model-studio/

import type { ChatMessage } from "@/lib/ai/provider";
import type {
  AiProviderResult,
  IAiProvider,
  ProviderConfig,
  ProviderError,
} from "./types";
import { statusCodeToErrorType, extractRequestId } from "./types";

// 社媒运营助理的内部标识（与 assistants.ts 中的 AI_ASSISTANT_TITLES.social 对应）
const SOCIAL_MEDIA_ASSISTANT_KEY = "social_media_assistant";

/**
 * 百炼 API 响应格式（OpenAI 兼容）
 */
interface BailianChatResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  request_id?: string;
}

/**
 * 百炼 Provider
 * 第一轮只允许社媒运营助理(social_media_assistant)调用
 */
export class BailianProvider implements IAiProvider {
  private readonly name = "bailian";
  // 第一轮允许调用百炼的助手列表
  private readonly allowedAssistants: string[] = [
    "社媒运营助理",
    "social_media_assistant",
    "social",
  ];

  /**
   * 检查是否支持指定助手
   */
  public supportsAssistant(assistantTitle: string): boolean {
    const normalized = assistantTitle.toLowerCase().trim();
    return this.allowedAssistants.some(
      (allowed) => allowed.toLowerCase() === normalized
    );
  }

  /**
   * 获取 Provider 名称
   */
  public getName(): string {
    return this.name;
  }

  /**
   * 调用百炼 AI 模型
   */
  public async chat(
    config: ProviderConfig,
    messages: ChatMessage[]
  ): Promise<{ ok: true; data: AiProviderResult } | { ok: false; error: ProviderError }> {
    const startTime = Date.now();

    // 验证配置
    if (!config.apiKey || !config.baseUrl || !config.model) {
      return {
        ok: false,
        error: {
          type: "AUTH_ERROR",
          message: "百炼配置不完整：缺少 API Key / Base URL / Model",
        },
      };
    }

    const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
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
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: Number.isFinite(config.temperature) ? config.temperature : 0.7,
          max_tokens: Number.isFinite(config.maxTokens) ? config.maxTokens : 1024,
          stream: false,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      // 处理 HTTP 错误状态码
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const errorType = statusCodeToErrorType(response.status);
        let requestId: string | undefined;

        // 尝试从错误响应中解析 requestId
        try {
          const errorData = JSON.parse(errorText) as Record<string, unknown>;
          requestId = extractRequestId(errorData);
        } catch {
          // 忽略解析错误
        }

        return {
          ok: false,
          error: {
            type: errorType,
            message: this.formatErrorMessage(errorType, errorText, response.status),
            statusCode: response.status,
            requestId,
          },
        };
      }

      // 解析响应
      const data = await response.json().catch(() => null) as BailianChatResponse | null;

      // 检查空响应
      if (!data) {
        return {
          ok: false,
          error: {
            type: "EMPTY_RESPONSE",
            message: "百炼返回空响应",
          },
        };
      }

      // 检查 API 错误
      if (data.error) {
        return {
          ok: false,
          error: {
            type: statusCodeToErrorType(400),
            message: data.error.message || "百炼返回错误",
            requestId: data.request_id || data.id,
          },
        };
      }

      // 提取回复内容
      const content = data.choices?.[0]?.message?.content?.trim() ?? "";

      if (!content) {
        return {
          ok: false,
          error: {
            type: "EMPTY_RESPONSE",
            message: "百炼未返回有效内容",
            requestId: data.request_id || data.id,
          },
        };
      }

      // 提取 token 使用量
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const totalTokens = data.usage?.total_tokens ?? inputTokens + outputTokens;

      return {
        ok: true,
        data: {
          text: content,
          model: data.model || config.model,
          inputTokens,
          outputTokens,
          totalTokens,
          latencyMs,
          requestId: data.request_id || data.id,
        },
      };
    } catch (error) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error) {
        // 超时错误
        if (error.name === "AbortError" || error.message.includes("aborted")) {
          return {
            ok: false,
            error: {
              type: "TIMEOUT",
              message: `百炼请求超时（${config.timeoutMs}ms）`,
            },
          };
        }

        // 网络错误
        return {
          ok: false,
          error: {
            type: "NETWORK_ERROR",
            message: `百炼网络错误：${error.message}`,
          },
        };
      }

      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: `百炼调用失败：${String(error)}`,
        },
      };
    }
  }

  /**
   * 格式化错误消息
   */
  private formatErrorMessage(
    type: ProviderError["type"],
    rawText: string,
    status: number
  ): string {
    let detail = rawText.slice(0, 200);

    // 尝试解析 JSON 获取更详细的错误信息
    try {
      const parsed = JSON.parse(rawText) as { error?: { message?: string; code?: string } };
      if (parsed.error?.message) {
        detail = parsed.error.message;
      }
    } catch {
      // 解析失败，使用原始文本
    }

    switch (type) {
      case "AUTH_ERROR":
        return `百炼认证失败（${status}）：API Key 无效或已过期。请检查配置。`;
      case "NOT_FOUND":
        return `百炼模型不存在（${status}）：请检查模型名称是否正确。详情：${detail}`;
      case "RATE_LIMIT":
        return `百炼请求限流（${status}）：请稍后重试。详情：${detail}`;
      case "SERVER_ERROR":
        return `百炼服务器错误（${status}）：${detail}`;
      default:
        return `百炼返回错误（${status}）：${detail}`;
    }
  }
}
