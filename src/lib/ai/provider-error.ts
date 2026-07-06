// ============================================================================
// AI 统一错误码（Provider Error Registry）
// ----------------------------------------------------------------------------
// 统一所有 AI 调用入口的错误码，覆盖：
//   权益类：AI_ENTITLEMENT_REQUIRED / AI_MEMBERSHIP_EXPIRED / AI_QUOTA_EXHAUSTED
//   限流类：AI_RATE_LIMITED
//   Provider 类：AI_PROVIDER_TIMEOUT / AI_PROVIDER_UNAVAILABLE
//   安全类：AI_SAFETY_REJECTED
//   请求类：AI_REQUEST_INVALID
//
// 前端返回中文可理解信息；服务端日志保留内部错误类型，但不泄露密钥和完整堆栈。
//
// 本模块不修改 assertAiEntitlement 的权限语义，只做错误码映射与脱敏。
// ============================================================================

import type { ProviderErrorType } from "@/lib/ai/providers/types";

// ---------- 统一错误码 ----------

export type AiErrorCode =
  | "AI_ENTITLEMENT_REQUIRED"
  | "AI_MEMBERSHIP_EXPIRED"
  | "AI_QUOTA_EXHAUSTED"
  | "AI_RATE_LIMITED"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_SAFETY_REJECTED"
  | "AI_REQUEST_INVALID"
  | "AI_UNAUTHENTICATED"
  | "AI_RESTRICTED"
  | "AI_PROVIDER_FAILED";

// ---------- 错误码 → 中文消息 ----------

const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  AI_ENTITLEMENT_REQUIRED: "当前套餐不支持 AI 功能，请升级会员。",
  AI_MEMBERSHIP_EXPIRED: "会员已过期，请续费后继续使用 AI 功能。",
  AI_QUOTA_EXHAUSTED: "本月 AI 额度已用完，请升级套餐或购买额度包。",
  AI_RATE_LIMITED: "请求过于频繁，请稍后再试。",
  AI_PROVIDER_TIMEOUT: "AI 服务响应超时，请稍后重试。",
  AI_PROVIDER_UNAVAILABLE: "AI 服务暂时不可用，请稍后重试。",
  AI_SAFETY_REJECTED: "内容未通过安全审核，请调整后重试。",
  AI_REQUEST_INVALID: "请求参数无效，请检查后重试。",
  AI_UNAUTHENTICATED: "请先登录后再使用 AI 功能。",
  AI_RESTRICTED: "当前账号 AI 功能已被限制，请联系管理员。",
  AI_PROVIDER_FAILED: "AI 调用失败，请稍后重试。",
};

/**
 * 根据错误码获取中文用户消息。
 */
export function getAiErrorMessage(code: AiErrorCode): string {
  return AI_ERROR_MESSAGES[code] ?? "AI 调用失败，请稍后重试。";
}

// ---------- 错误码 → HTTP 状态 ----------

const AI_ERROR_HTTP_STATUS: Record<AiErrorCode, number> = {
  AI_ENTITLEMENT_REQUIRED: 403,
  AI_MEMBERSHIP_EXPIRED: 403,
  AI_QUOTA_EXHAUSTED: 402,
  AI_RATE_LIMITED: 429,
  AI_PROVIDER_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_SAFETY_REJECTED: 400,
  AI_REQUEST_INVALID: 400,
  AI_UNAUTHENTICATED: 401,
  AI_RESTRICTED: 403,
  AI_PROVIDER_FAILED: 502,
};

/**
 * 根据错误码获取 HTTP 状态码。
 */
export function getAiErrorHttpStatus(code: AiErrorCode): number {
  return AI_ERROR_HTTP_STATUS[code] ?? 500;
}

// ---------- Provider ErrorType → AiErrorCode 映射 ----------

/**
 * 将底层 Provider 的错误类型映射为统一的 AiErrorCode。
 *
 * 映射规则：
 * - TIMEOUT → AI_PROVIDER_TIMEOUT
 * - RATE_LIMIT → AI_RATE_LIMITED
 * - AUTH_ERROR → AI_PROVIDER_UNAVAILABLE（不向前端暴露鉴权细节）
 * - SERVER_ERROR / NETWORK_ERROR → AI_PROVIDER_UNAVAILABLE
 * - NOT_FOUND / EMPTY_RESPONSE / INVALID_JSON → AI_PROVIDER_FAILED
 * - UNKNOWN → AI_PROVIDER_FAILED
 */
export function mapProviderErrorToAiCode(providerError: ProviderErrorType): AiErrorCode {
  switch (providerError) {
    case "TIMEOUT":
      return "AI_PROVIDER_TIMEOUT";
    case "RATE_LIMIT":
      return "AI_RATE_LIMITED";
    case "AUTH_ERROR":
    case "SERVER_ERROR":
    case "NETWORK_ERROR":
      return "AI_PROVIDER_UNAVAILABLE";
    case "NOT_FOUND":
    case "EMPTY_RESPONSE":
    case "INVALID_JSON":
    case "UNKNOWN":
    default:
      return "AI_PROVIDER_FAILED";
  }
}

// ---------- 统一错误响应构造 ----------

export interface AiErrorResponse {
  success: false;
  code: AiErrorCode;
  message: string;
  traceId?: string;
  usageType?: string;
}

/**
 * 构造统一的 AI 错误响应体。
 *
 * @param code    统一错误码
 * @param traceId 链路追踪 ID（可选，传入则返回给客户端便于排障）
 * @param usageType 用量类型（可选）
 * @param customMessage 自定义消息（可选，覆盖默认中文消息）
 */
export function buildAiErrorResponse(args: {
  code: AiErrorCode;
  traceId?: string;
  usageType?: string;
  customMessage?: string;
}): AiErrorResponse {
  return {
    success: false,
    code: args.code,
    message: args.customMessage ?? getAiErrorMessage(args.code),
    ...(args.traceId ? { traceId: args.traceId } : {}),
    ...(args.usageType ? { usageType: args.usageType } : {}),
  };
}

// ---------- 脱敏：清理错误消息中的敏感信息 ----------

/**
 * 清理错误消息中可能包含的敏感信息。
 * - 移除 API Key 片段（sk-xxx / LTAIxxx 等）
 * - 移除 Bearer token
 * - 移除 Connection string 片段
 * - 截断到 300 字符
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "";
  let cleaned = message;
  // 移除 API Key 模式
  cleaned = cleaned.replace(/sk-[A-Za-z0-9]{8,}/g, "sk-***");
  cleaned = cleaned.replace(/LTAI[A-Za-z0-9]{8,}/g, "LTAI***");
  // 移除 Bearer token
  cleaned = cleaned.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
  // 移除 Connection string 片段
  cleaned = cleaned.replace(/postgres:\/\/[^\s]+/gi, "postgres://***");
  cleaned = cleaned.replace(/mongodb:\/\/[^\s]+/gi, "mongodb://***");
  // 截断
  if (cleaned.length > 300) {
    cleaned = cleaned.slice(0, 300) + "…";
  }
  return cleaned;
}

/**
 * 获取脱敏后的内部错误消息（用于服务端日志，不返回前端）。
 * 保留比前端更多的信息，但仍移除密钥。
 */
export function getSanitizedInternalMessage(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }
  if (typeof error === "string") {
    return sanitizeErrorMessage(error);
  }
  return "unknown error";
}
