/**
 * 多代理工作流 - LLM 服务层
 * 封装真实 AI 调用，支持配置检测与 Mock 回退
 * 独立实现，不依赖 Next.js 服务端模块（避免 server-only 限制）
 */

import type { ILlmService } from "./types";

/** 聊天消息 */
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Provider 配置 */
type ProviderConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

/** LLM 调用结果 */
export type LlmChatResult =
  | { ok: true; text: string; tokens?: number }
  | { ok: false; error: string };

/** 从环境变量读取配置值 */
function envValue(key: string): string | undefined {
  const up = process.env[key];
  if (up && up.trim()) return up.trim();
  const low = process.env[key.toLowerCase()];
  if (low && low.trim()) return low.trim();
  return undefined;
}

/** 从环境变量构建 Provider 配置 */
function getConfigFromEnv(): ProviderConfig {
  return {
    provider: envValue("AI_PROVIDER") || "qwen",
    baseUrl: (envValue("AI_BASE_URL") || "https://dashscope.aliyuncs.com/api/v1").replace(/\/+$/, ""),
    model: envValue("AI_MODEL") || "qwen-plus",
    apiKey: envValue("AI_API_KEY") || envValue("OPENAI_API_KEY") || "",
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 45000,
  };
}

/** 检查配置是否完整 */
function isConfigured(config: ProviderConfig): boolean {
  return Boolean(config.apiKey) && Boolean(config.baseUrl) && Boolean(config.model);
}

/** LLM 服务实现 */
export class LlmService implements ILlmService {
  private config: ProviderConfig | null = null;
  mockMode: boolean = true;

  /** 初始化：尝试读取 AI 配置 */
  async init(): Promise<void> {
    // 优先尝试通过项目内部配置读取（仅在 Next.js 服务端环境中有效）
    try {
      // 动态导入避免在脚本环境中触发 server-only 错误
      const providerModule = await import("@/lib/ai/provider");
      if (providerModule.getProviderConfig && providerModule.isProviderConfigured) {
        // 构造一个最小化的虚拟助手定义以满足类型要求
        const dummyAssistant = {
          title: "社媒运营助理" as const,
          displayTitle: "工作流代理",
          category: "系统",
          role: "多代理工作流执行",
          capabilities: [] as string[],
          systemPrompt: "",
          outputFormat: "",
          riskNotice: "",
          disclaimer: "",
          maxMessageLength: 8000,
          defaultTemperature: 0.3,
          defaultMaxTokens: 2000,
        };
        const cfg = await providerModule.getProviderConfig(dummyAssistant);
        if (providerModule.isProviderConfigured(cfg)) {
          this.config = {
            provider: cfg.provider,
            baseUrl: cfg.baseUrl.replace(/\/+$/, ""),
            model: cfg.model,
            apiKey: cfg.apiKey,
            temperature: cfg.temperature,
            maxTokens: cfg.maxTokens,
            timeoutMs: cfg.timeoutMs,
          };
          this.mockMode = false;
          return;
        }
      }
    } catch {
      // 不在 Next.js 环境中，回退到环境变量
    }

    // 回退：从环境变量读取
    const envConfig = getConfigFromEnv();
    if (isConfigured(envConfig)) {
      this.config = envConfig;
      this.mockMode = false;
    }
  }

  /** 调用 LLM */
  async chat(messages: ChatMessage[]): Promise<LlmChatResult> {
    if (this.mockMode || !this.config) {
      return { ok: false, error: "LLM 未配置，处于模拟模式" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            stream: false,
          }),
          signal: controller.signal,
          cache: "no-store",
        }
      );

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return {
          ok: false,
          error: `AI 服务错误(${response.status}): ${text.slice(0, 200)}`,
        };
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!content) {
        return { ok: false, error: "AI 未返回有效内容" };
      }

      return {
        ok: true,
        text: content,
        tokens: data.usage?.total_tokens,
      };
    } catch (error) {
      clearTimeout(timer);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `调用失败: ${message}` };
    }
  }
}

/** 创建默认 LLM 服务 */
export async function createLlmService(): Promise<LlmService> {
  const service = new LlmService();
  await service.init();
  return service;
}
