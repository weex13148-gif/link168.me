// AI 用量遥测服务（内存存储）
// 用于收集和查询 AI 调用的详细统计数据（不包含敏感内容）
// 仅在服务端使用

import crypto from "crypto";

// ---------- 类型定义 ----------

export type CallStatus = "success" | "error" | "blocked";

export type BlockReason =
  | "whitelist_rejected"
  | "member_permission_rejected"
  | "input_audit_blocked"
  | "output_audit_blocked"
  | "rate_limited"
  | "other";

export type AiTelemetryRecord = {
  id: string;
  userId: string;
  assistant: string;
  model: string | null;
  provider: string | null;
  status: CallStatus;
  blockReason: BlockReason | null;
  httpStatus: number | null;
  errorCode: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost: number; // 估算成本（元）
  ipAddress: string | null;
  createdAt: Date;
};

// 错误分类
export type ErrorCategory = "401" | "404" | "429" | "5xx" | "other";

export type TelemetryStats = {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  blockedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalCost: number;
  byAssistant: Record<string, {
    calls: number;
    success: number;
    error: number;
    blocked: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    avgLatencyMs: number;
    cost: number;
  }>;
  byModel: Record<string, {
    calls: number;
    success: number;
    error: number;
    blocked: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    avgLatencyMs: number;
    cost: number;
  }>;
  byDate: Record<string, {
    calls: number;
    success: number;
    error: number;
    blocked: number;
    tokens: number;
    cost: number;
  }>;
  byHttpStatus: Record<string, number>;
  byBlockReason: Record<string, number>;
  errorClassification: Record<ErrorCategory, number>;
};

// ---------- 内存存储 ----------

const telemetryStore = new Map<string, AiTelemetryRecord>();
const userIndex = new Map<string, string[]>();
const assistantIndex = new Map<string, string[]>();
const dateIndex = new Map<string, string[]>();

// ---------- 辅助函数 ----------

function classifyError(status: number | null, errorCode: string | null): ErrorCategory {
  if (status === 401 || errorCode === "401") return "401";
  if (status === 404 || errorCode === "404") return "404";
  if (status === 429 || errorCode === "429" || errorCode === "RATE_LIMITED") return "429";
  if (status && status >= 500) return "5xx";
  return "other";
}

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function storeRecord(record: AiTelemetryRecord): void {
  telemetryStore.set(record.id, record);

  // user index
  const userList = userIndex.get(record.userId) ?? [];
  userList.push(record.id);
  userIndex.set(record.userId, userList);

  // assistant index
  const assistantList = assistantIndex.get(record.assistant) ?? [];
  assistantList.push(record.id);
  assistantIndex.set(record.assistant, assistantList);

  // date index
  const dateKey = getDateKey(record.createdAt);
  const dateList = dateIndex.get(dateKey) ?? [];
  dateList.push(record.id);
  dateIndex.set(dateKey, dateList);
}

// 估算成本（基于阿里云百炼 DeepSeek 模型定价）
// DeepSeek V3: input $0.27/1M tokens, output $1.1/1M tokens
// 换算为元/千tokens
const COST_PER_1M_INPUT_TOKENS = 2.0; // 元
const COST_PER_1M_OUTPUT_TOKENS = 8.0; // 元

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS +
         (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
}

// ---------- 核心 API ----------

/**
 * 记录一次 AI 调用（不包含敏感内容）
 */
export function recordAiCall(params: {
  userId: string;
  assistant: string;
  model?: string | null;
  provider?: string | null;
  status: CallStatus;
  blockReason?: BlockReason | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  ipAddress?: string | null;
}): string {
  const id = crypto.randomUUID();
  const inputTokens = params.inputTokens ?? 0;
  const outputTokens = params.outputTokens ?? 0;
  const latencyMs = params.latencyMs ?? 0;

  const record: AiTelemetryRecord = {
    id,
    userId: params.userId,
    assistant: params.assistant,
    model: params.model ?? null,
    provider: params.provider ?? null,
    status: params.status,
    blockReason: params.blockReason ?? null,
    httpStatus: params.httpStatus ?? null,
    errorCode: params.errorCode ?? null,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    estimatedCost: estimateCost(inputTokens, outputTokens),
    ipAddress: params.ipAddress ?? null,
    createdAt: new Date(),
  };

  storeRecord(record);

  return id;
}

/**
 * 获取指定时间范围内的统计数据
 */
export function getTelemetryStats(options?: {
  days?: number;
  assistant?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}): TelemetryStats {
  const days = options?.days ?? 7;
  const now = new Date();
  const startDate = options?.startDate ?? new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate ?? now;

  let records = Array.from(telemetryStore.values()).filter((r) => {
    if (r.createdAt < startDate || r.createdAt > endDate) return false;
    if (options?.assistant && r.assistant !== options.assistant) return false;
    if (options?.userId && r.userId !== options.userId) return false;
    return true;
  });

  // 排序：最新的在前
  records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // 计算统计
  const stats: TelemetryStats = {
    totalCalls: records.length,
    successCalls: 0,
    errorCalls: 0,
    blockedCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    totalCost: 0,
    byAssistant: {},
    byModel: {},
    byDate: {},
    byHttpStatus: {},
    byBlockReason: {},
    errorClassification: { "401": 0, "404": 0, "429": 0, "5xx": 0, "other": 0 },
  };

  let totalLatency = 0;

  for (const r of records) {
    if (r.status === "success") stats.successCalls++;
    else if (r.status === "error") stats.errorCalls++;
    else if (r.status === "blocked") stats.blockedCalls++;

    stats.totalInputTokens += r.inputTokens;
    stats.totalOutputTokens += r.outputTokens;
    stats.totalTokens += r.totalTokens;
    stats.totalCost += r.estimatedCost;
    totalLatency += r.latencyMs;

    // by assistant
    if (!stats.byAssistant[r.assistant]) {
      stats.byAssistant[r.assistant] = {
        calls: 0, success: 0, error: 0, blocked: 0,
        inputTokens: 0, outputTokens: 0, totalTokens: 0,
        avgLatencyMs: 0, cost: 0,
      };
    }
    const a = stats.byAssistant[r.assistant];
    a.calls++;
    if (r.status === "success") a.success++;
    else if (r.status === "error") a.error++;
    else if (r.status === "blocked") a.blocked++;
    a.inputTokens += r.inputTokens;
    a.outputTokens += r.outputTokens;
    a.totalTokens += r.totalTokens;
    a.cost += r.estimatedCost;

    // by model
    if (r.model) {
      if (!stats.byModel[r.model]) {
        stats.byModel[r.model] = {
          calls: 0, success: 0, error: 0, blocked: 0,
          inputTokens: 0, outputTokens: 0, totalTokens: 0,
          avgLatencyMs: 0, cost: 0,
        };
      }
      const m = stats.byModel[r.model];
      m.calls++;
      if (r.status === "success") m.success++;
      else if (r.status === "error") m.error++;
      else if (r.status === "blocked") m.blocked++;
      m.inputTokens += r.inputTokens;
      m.outputTokens += r.outputTokens;
      m.totalTokens += r.totalTokens;
      m.cost += r.estimatedCost;
    }

    // by date
    const dateKey = getDateKey(r.createdAt);
    if (!stats.byDate[dateKey]) {
      stats.byDate[dateKey] = { calls: 0, success: 0, error: 0, blocked: 0, tokens: 0, cost: 0 };
    }
    const d = stats.byDate[dateKey];
    d.calls++;
    if (r.status === "success") d.success++;
    else if (r.status === "error") d.error++;
    else if (r.status === "blocked") d.blocked++;
    d.tokens += r.totalTokens;
    d.cost += r.estimatedCost;

    // by http status
    if (r.httpStatus) {
      const key = String(r.httpStatus);
      stats.byHttpStatus[key] = (stats.byHttpStatus[key] ?? 0) + 1;
    }

    // by block reason
    if (r.blockReason) {
      stats.byBlockReason[r.blockReason] = (stats.byBlockReason[r.blockReason] ?? 0) + 1;
    }

    // error classification
    const errCat = classifyError(r.httpStatus, r.errorCode);
    stats.errorClassification[errCat]++;
  }

  // 计算平均延迟
  if (records.length > 0) {
    stats.avgLatencyMs = Math.round(totalLatency / records.length);
  }

  // 计算各维度的平均延迟
  for (const key of Object.keys(stats.byAssistant)) {
    const a = stats.byAssistant[key];
    a.avgLatencyMs = a.calls > 0 ? Math.round(totalLatency / a.calls) : 0;
  }
  for (const key of Object.keys(stats.byModel)) {
    const m = stats.byModel[key];
    m.avgLatencyMs = m.calls > 0 ? Math.round(totalLatency / m.calls) : 0;
  }

  return stats;
}

/**
 * 获取最近调用记录（用于调试，不包含敏感内容）
 */
export function getRecentTelemetryRecords(options?: {
  limit?: number;
  assistant?: string;
  status?: CallStatus;
}): AiTelemetryRecord[] {
  const limit = options?.limit ?? 100;
  let records = Array.from(telemetryStore.values());

  if (options?.assistant) {
    records = records.filter((r) => r.assistant === options.assistant);
  }
  if (options?.status) {
    records = records.filter((r) => r.status === options.status);
  }

  records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return records.slice(0, limit);
}

/**
 * 按用户统计
 */
export function getUserTelemetryStats(options?: {
  days?: number;
  limit?: number;
}): Array<{
  userId: string;
  calls: number;
  success: number;
  error: number;
  blocked: number;
  tokens: number;
  cost: number;
}> {
  const days = options?.days ?? 7;
  const limit = options?.limit ?? 100;
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const userStats = new Map<string, {
    calls: number;
    success: number;
    error: number;
    blocked: number;
    tokens: number;
    cost: number;
  }>();

  for (const record of telemetryStore.values()) {
    if (record.createdAt < startDate) continue;

    const existing = userStats.get(record.userId) ?? {
      calls: 0, success: 0, error: 0, blocked: 0, tokens: 0, cost: 0,
    };

    existing.calls++;
    if (record.status === "success") existing.success++;
    else if (record.status === "error") existing.error++;
    else if (record.status === "blocked") existing.blocked++;
    existing.tokens += record.totalTokens;
    existing.cost += record.estimatedCost;

    userStats.set(record.userId, existing);
  }

  return Array.from(userStats.entries())
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, limit);
}
