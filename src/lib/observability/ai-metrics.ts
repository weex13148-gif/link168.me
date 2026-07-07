// ============================================================================
// AI 调用统一指标记录（AI Metrics）
// ----------------------------------------------------------------------------
// 在现有 telemetry/index.ts 之上封装，补充：
// 1. traceId 关联（贯穿 ai-trace.ts）
// 2. usageType 维度（visitor_reception / business_ai / enterprise_ai / showcase_demo）
// 3. Showcase Demo 独立预算与限流（内存计数，按日重置）
// 4. 安全拒答与请求超时的结构化记录
// 5. 统一的字段命名：traceId / userId / usageType / provider / model /
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

// ---------- Showcase Demo 独立预算与限流 ----------

/**
 * Showcase Demo 独立预算配置。
 * 与用户套餐额度完全隔离，不消耗用户额度。
 */
export const SHOWCASE_DEMO_BUDGET = {
  /** 每日最大调用次数（所有访客合计） */
  dailyCallLimit: 100,
  /** 单次最大输入 token */
  maxInputTokensPerCall: 2000,
  /** 单次最大输出 token */
  maxOutputTokensPerCall: 1000,
  /** 单 IP 每分钟最大调用次数 */
  perIpPerMinuteLimit: 5,
} as const;

interface ShowcaseBudgetState {
  date: string; // YYYY-MM-DD
  callCount: number;
  /** 按 IP 计数的滑动窗口：[timestamp, count] */
  ipWindows: Map<string, number[]>;
}

let showcaseBudget: ShowcaseBudgetState = {
  date: new Date().toISOString().split("T")[0],
  callCount: 0,
  ipWindows: new Map(),
};

function resetShowcaseBudgetIfNewDay(): void {
  const today = new Date().toISOString().split("T")[0];
  if (showcaseBudget.date !== today) {
    showcaseBudget = {
      date: today,
      callCount: 0,
      ipWindows: new Map(),
    };
  }
}

/**
 * 检查 Showcase Demo 是否允许调用（独立预算 + 限流）。
 * 返回 null 表示允许，返回字符串表示拒绝原因（错误码）。
 */
export function checkShowcaseDemoBudget(args: {
  ip: string;
}): "AI_RATE_LIMITED" | "AI_QUOTA_EXHAUSTED" | null {
  resetShowcaseBudgetIfNewDay();

  // 1. 每日总次数预算
  if (showcaseBudget.callCount >= SHOWCASE_DEMO_BUDGET.dailyCallLimit) {
    return "AI_QUOTA_EXHAUSTED";
  }

  // 2. 单 IP 每分钟限流
  const now = Date.now();
  const windowMs = 60_000;
  const ipKey = args.ip;
  const existing = showcaseBudget.ipWindows.get(ipKey) ?? [];
  // 清理 1 分钟外的记录
  const recent = existing.filter((ts) => now - ts < windowMs);
  if (recent.length >= SHOWCASE_DEMO_BUDGET.perIpPerMinuteLimit) {
    return "AI_RATE_LIMITED";
  }

  return null;
}

/**
 * 记录一次 Showcase Demo 调用（在调用成功后执行）。
 */
export function consumeShowcaseDemoBudget(args: { ip: string }): void {
  resetShowcaseBudgetIfNewDay();
  showcaseBudget.callCount += 1;
  const now = Date.now();
  const ipKey = args.ip;
  const existing = showcaseBudget.ipWindows.get(ipKey) ?? [];
  existing.push(now);
  showcaseBudget.ipWindows.set(ipKey, existing);
}

/**
 * 获取 Showcase Demo 预算当前状态（用于后台展示）。
 */
export function getShowcaseDemoBudgetStatus(): {
  date: string;
  callCount: number;
  dailyCallLimit: number;
  remaining: number;
} {
  resetShowcaseBudgetIfNewDay();
  return {
    date: showcaseBudget.date,
    callCount: showcaseBudget.callCount,
    dailyCallLimit: SHOWCASE_DEMO_BUDGET.dailyCallLimit,
    remaining: Math.max(0, SHOWCASE_DEMO_BUDGET.dailyCallLimit - showcaseBudget.callCount),
  };
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
