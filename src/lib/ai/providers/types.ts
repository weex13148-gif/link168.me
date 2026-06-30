// 统一 AI Provider 接口类型定义
// 所有 Provider 适配器必须实现以下接口

import type { ChatMessage } from "@/lib/ai/provider";

/**
 * 统一 AI Provider 调用结果
 * 包含 text（模型原始回复文本）和详细元数据
 */
export type AiProviderResult = {
  text: string;           // 模型原始回复文本
  model: string;          // 实际调用的模型名称
  inputTokens: number;    // 输入 token 数
  outputTokens: number;   // 输出 token 数
  totalTokens: number;    // 总 token 数
  latencyMs: number;      // 请求耗时（毫秒）
  requestId?: string;     // 请求 ID（用于排查）
};

/**
 * Provider 错误类型
 */
export type ProviderErrorType =
  | "TIMEOUT"           // 请求超时
  | "AUTH_ERROR"        // 401 认证错误
  | "NOT_FOUND"         // 404 模型不存在
  | "RATE_LIMIT"        // 429 限流
  | "SERVER_ERROR"       // 5xx 服务器错误
  | "EMPTY_RESPONSE"    // 空响应
  | "INVALID_JSON"      // 非法 JSON
  | "NETWORK_ERROR"     // 网络错误
  | "UNKNOWN";          // 未知错误

/**
 * Provider 错误详情
 */
export type ProviderError = {
  type: ProviderErrorType;
  message: string;
  statusCode?: number;
  requestId?: string;
};

/**
 * Provider 配置
 */
export type ProviderConfig = {
  provider: string;      // Provider 标识
  baseUrl: string;       // API endpoint
  apiKey: string;        // API Key
  model: string;         // 模型名称
  temperature: number;   // 温度参数
  maxTokens: number;     // 最大 token 数
  timeoutMs: number;    // 超时毫秒数
};

/**
 * AI Provider 适配器接口
 */
export interface IAiProvider {
  /**
   * 调用 AI 模型
   * @param config Provider 配置
   * @param messages 聊天消息列表
   * @returns AIProviderResult 或 ProviderError
   */
  chat(
    config: ProviderConfig,
    messages: ChatMessage[]
  ): Promise<{ ok: true; data: AiProviderResult } | { ok: false; error: ProviderError }>;

  /**
   * 获取 Provider 名称
   */
  getName(): string;

  /**
   * 检查是否支持指定助手
   * @param assistantTitle 助手标题
   * @returns 是否支持
   */
  supportsAssistant(assistantTitle: string): boolean;
}

/**
 * 解析 HTTP 状态码为 ProviderErrorType
 */
export function statusCodeToErrorType(status: number): ProviderErrorType {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

/**
 * 从错误响应中提取 requestId
 */
export function extractRequestId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  // 百炼和 OpenAI 兼容格式
  if (typeof obj.request_id === "string") return obj.request_id;
  if (typeof obj.id === "string") return obj.id;
  return undefined;
}
