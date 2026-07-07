// ============================================================================
// AI 调用链路追踪（AI Trace）
// ----------------------------------------------------------------------------
// 为每次 AI 调用生成唯一 traceId，贯穿：
//   入口路由 → 权益守卫 → 内容安全 → Provider → Telemetry → 审计日志
//
// 设计：
// - traceId 为 32 位 hex（crypto.randomBytes(16).toString("hex")），无连字符
// - 兼容现有 messageId / requestId / idempotencyKey，不替换它们
// - traceId 通过响应头 X-AI-Trace-Id 返回给客户端，便于排障
// - 日志输出统一前缀 [ai-trace:traceId]，便于 grep
//
// 安全：
// - 不记录 API Key / Cookie / Authorization
// - 不记录完整对话原文，只记录脱敏摘要（前 80 字符 + 哈希）
// ============================================================================
import crypto from "crypto";

// ---------- traceId 生成 ----------

/**
 * 生成 32 位 hex traceId。
 * 格式：[0-9a-f]{32}
 */
export function createAiTraceId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ---------- traceId 传播 ----------

/**
 * 从请求头读取上游传入的 traceId（如有）。
 * 用于跨服务调用时保持链路一致。
 * 若上游未传或格式非法，返回 null（由调用方生成新的）。
 */
export function readIncomingTraceId(headers: Headers): string | null {
  const incoming = headers.get("x-ai-trace-id");
  if (!incoming) return null;
  // 严格校验：32 位 hex，防止注入
  if (!/^[0-9a-f]{32}$/i.test(incoming)) return null;
  return incoming.toLowerCase();
}

/**
 * 将 traceId 写入响应头，便于客户端排障。
 */
export function writeTraceIdHeader(response: Response, traceId: string): void {
  response.headers.set("x-ai-trace-id", traceId);
}

/**
 * 将 traceId 写入 NextResponse（Next.js Route Handler 专用）。
 */
export function setTraceIdOnNextResponse(
  response: { headers: { set: (name: string, value: string) => void } },
  traceId: string,
): void {
  response.headers.set("x-ai-trace-id", traceId);
}

// ---------- 脱敏 ----------

/**
 * 对敏感文本生成脱敏摘要。
 * 规则：
 * - 截断到前 80 字符
 * - 附加 SHA-256 前 8 位作为指纹
 * - 空值返回 null
 */
export function maskSensitiveText(text: string | null | undefined): string | null {
  if (!text) return null;
  const truncated = text.length > 80 ? text.slice(0, 80) + "…" : text;
  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
  return `${truncated} [hash:${hash}]`;
}

/**
 * 对用户 ID 做轻度脱敏（保留前 4 后 4，中间用 * 填充）。
 * 用于日志中可识别但不可还原的标识。
 */
export function maskUserId(userId: string | null | undefined): string {
  if (!userId) return "anonymous";
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 4)}…${userId.slice(-4)}`;
}

// ---------- trace 上下文（单次请求内同步传递） ----------

export interface AiTraceContext {
  traceId: string;
  /** 匿名访客会话标识（visitor_reception 场景） */
  visitorSessionId?: string;
  /** 请求来源（路由路径或来源标识） */
  requestSource: string;
  /** 请求开始时间（用于计算 durationMs） */
  startedAt: number;
}

/**
 * 创建一次 AI 调用的 trace 上下文。
 * 通常在路由入口调用，贯穿整个请求生命周期。
 */
export function createAiTraceContext(args: {
  traceId?: string;
  headers?: Headers;
  requestSource: string;
  visitorSessionId?: string;
}): AiTraceContext {
  const traceId = args.traceId ?? (args.headers ? readIncomingTraceId(args.headers) : null) ?? createAiTraceId();
  return {
    traceId,
    visitorSessionId: args.visitorSessionId,
    requestSource: args.requestSource,
    startedAt: Date.now(),
  };
}

/**
 * 计算 trace 上下文已持续时间（毫秒）。
 */
export function elapsedMs(ctx: AiTraceContext): number {
  return Date.now() - ctx.startedAt;
}

// ---------- 日志输出 ----------

/**
 * 输出带 traceId 前缀的 info 日志。
 * 不记录敏感原文，只记录结构化字段。
 */
export function logAiTraceInfo(
  ctx: AiTraceContext,
  event: string,
  fields?: Record<string, string | number | boolean | null>,
): void {
  const base = {
    t: ctx.traceId,
    event,
    source: ctx.requestSource,
    elapsedMs: elapsedMs(ctx),
  };
  console.info(JSON.stringify({ ...base, ...fields }));
}

/**
 * 输出带 traceId 前缀的 error 日志。
 * 自动脱敏 message 字段（如果包含敏感内容）。
 */
export function logAiTraceError(
  ctx: AiTraceContext,
  event: string,
  error: { code?: string; message?: string; httpStatus?: number },
): void {
  const base = {
    t: ctx.traceId,
    event,
    source: ctx.requestSource,
    elapsedMs: elapsedMs(ctx),
    level: "error",
    errorCode: error.code ?? "UNKNOWN",
    httpStatus: error.httpStatus ?? null,
    // 脱敏：错误消息可能包含 provider 内部信息，截断到 200 字符
    message: error.message ? (error.message.length > 200 ? error.message.slice(0, 200) + "…" : error.message) : null,
  };
  console.error(JSON.stringify(base));
}
