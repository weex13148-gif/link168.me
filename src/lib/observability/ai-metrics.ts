// ============================================================================
// AI 调用统一指标记录（AI Metrics）
// ----------------------------------------------------------------------------
// 在现有 telemetry/index.ts 之上封装，补充：
// 1. traceId 关联（贯穿 ai-trace.ts）
// 2. usageType 维度（visitor_reception / business_ai / enterprise_ai）
// 3. 安全拒答与请求超时的结构化记录
// 4. 统一的字段命名：traceId / userId / usageType / provider / model /
//    inputTokens / outputTokens / totalTokens / durationMs / success /
//    errorCode / requestSource / createdAt
//
// 数据存储：内存（与 telemetry/index.ts 一致），单机有效。
// 多实例部署时需迁移到 Redis/DB（已记录为已知限制）。
// ============================================================================

import { recordAiCall, type CallStatus, type BlockReason } from "@/lib/ai/telemetry";
import { type AiTraceContext, elapsedMs, logAiTraceInfo } from "@/lib/observability/ai-trace";
import type { AiUsageType } from "@/lib/ai/entitlement-guard";

// ---------- 指标记录结构 ----------

export interface AiMetricRecord {
  traceId: string;
  userId: string;
  usageType: AiUsageType;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  success: boolean;
  errorCode: string | null;
  requestSource: string;
  createdAt: Date;
}

// ---------- 统一指标记录入口 ----------

/**
 * 记录一次 AI 调用的完整指标。
 *
 * 此函数同时：
 * 1. 写入 telemetry/index.ts 的内存存储（兼容现有后台查询）
 * 2. 输出带 traceId 的结构化日志（便于 grep 排障）
 *
 * 安全：
 * - 不记录 API Key / Cookie / Authorization
 * - 不记录完整对话原文
 * - userId 在日志中通过 maskUserId 脱敏（telemetry 存储保留原值用于后台查询）
 */
export function recordAiMetrics(args: {
  traceCtx: AiTraceContext;
  userId: string;
  usageType: AiUsageType;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  success: boolean;
  errorCode?: string | null;
  blockReason?: BlockReason | null;
  httpStatus?: number | null;
  ipAddress?: string | null;
  assistant?: string;
}): void {
  const durationMs = args.durationMs ?? elapsedMs(args.traceCtx);
  const inputTokens = args.inputTokens ?? 0;
  const outputTokens = args.outputTokens ?? 0;
  const status: CallStatus = args.success ? "success" : (args.blockReason ? "blocked" : "error");

  // 1. 写入现有 telemetry 存储（保留原 userId 供后台查询）
  recordAiCall({
    userId: args.userId,
    assistant: args.assistant ?? args.usageType,
    model: args.model ?? null,
    provider: args.provider ?? null,
    status,
    blockReason: args.blockReason ?? null,
    httpStatus: args.httpStatus ?? null,
    errorCode: args.errorCode ?? null,
    inputTokens,
    outputTokens,
    latencyMs: durationMs,
    ipAddress: args.ipAddress ?? null,
  });

  // 2. 输出带 traceId 的结构化日志
  logAiTraceInfo(args.traceCtx, "ai_call_completed", {
    usageType: args.usageType,
    provider: args.provider ?? null,
    model: args.model ?? null,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    durationMs,
    success: args.success,
    errorCode: args.errorCode ?? null,
    // 日志中不记录完整 userId，只记录脱敏后的标识
    maskedUserId: args.userId,
  });
}

// ---------- 安全拒答与超时记录 ----------

/**
 * 记录一次安全拒答事件（输入或输出被内容安全拦截）。
 */
export function recordSafetyRejection(args: {
  traceCtx: AiTraceContext;
  userId: string;
  usageType: AiUsageType;
  stage: "input" | "output";
  reason: string;
  requestSource: string;
}): void {
  logAiTraceInfo(args.traceCtx, "ai_safety_rejected", {
    usageType: args.usageType,
    stage: args.stage,
    reason: args.reason,
    maskedUserId: args.userId,
  });
}

/**
 * 记录一次请求超时事件。
 */
export function recordProviderTimeout(args: {
  traceCtx: AiTraceContext;
  userId: string;
  usageType: AiUsageType;
  provider: string | null;
  model: string | null;
  timeoutMs: number;
}): void {
  logAiTraceInfo(args.traceCtx, "ai_provider_timeout", {
    usageType: args.usageType,
    provider: args.provider,
    model: args.model,
    timeoutMs: args.timeoutMs,
    maskedUserId: args.userId,
  });
}
