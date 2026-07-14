// AI 风险事件记录服务
// 注意：当前使用内存存储 + console 日志作为临时方案。
// 待数据库模型 AiRiskEvent 建立后，切换到持久化存储。
// 仅在服务端使用。

import crypto from "crypto";

// ---------- 类型定义 ----------
export type AiRiskEventType =
  | "input_blocked"          // 输入审核拦截
  | "output_blocked"         // 输出审核拦截
  | "user_ai_restricted"      // 用户AI权限被冻结
  | "model_error"             // 模型调用异常
  | "report_received"         // 收到用户举报
  | "report_confirmed"        // 举报经审核确认
  | "report_dismissed"        // 举报经审核驳回
  | "manual_review"           // 管理员主动标记
  | "quota_confirm_error";    // 额度确认失败

export type AiRiskLevel = "low" | "medium" | "high" | "critical";

export type AiRiskEventStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type AiRiskEvent = {
  id: string;
  userId: string;
  eventType: AiRiskEventType;
  assistant: string;
  riskLevel: AiRiskLevel;
  status: AiRiskEventStatus;
  userMessage: string | null;
  aiResponse: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  reportedByUserId: string | null;   // 举报人（若是举报事件）
  reviewedByUserId: string | null;   // 审核人
  reviewedAt: Date | null;
  reviewNote: string | null;
  actionTaken: string | null;        // 处置动作（如 suspend_ai / warn_user 等）
  createdAt: Date;
};

// ---------- 内存存储（临时方案）----------
// Map: eventId -> event
const inMemoryStore = new Map<string, AiRiskEvent>();
// Index: userId -> eventId[]
const userIndex = new Map<string, string[]>();

// ---------- 辅助函数 ----------
function storeEvent(event: AiRiskEvent): void {
  inMemoryStore.set(event.id, event);
  const list = userIndex.get(event.userId) ?? [];
  list.push(event.id);
  userIndex.set(event.userId, list);
}

// ---------- 核心 API ----------

/**
 * 记录一条 AI 风险事件。
 * 返回事件 ID，供后续关联使用。
 */
export async function logAiRiskEvent(params: {
  userId: string;
  eventType: AiRiskEventType;
  assistant: string;
  riskLevel: AiRiskLevel;
  userMessage?: string | null;
  aiResponse?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const id = crypto.randomUUID();
  const event: AiRiskEvent = {
    id,
    userId: params.userId,
    eventType: params.eventType,
    assistant: params.assistant,
    riskLevel: params.riskLevel,
    status: "open",
    userMessage: params.userMessage ?? null,
    aiResponse: params.aiResponse ?? null,
    ipAddress: params.ipAddress ?? null,
    metadata: params.metadata ?? {},
    reportedByUserId: null,
    reviewedByUserId: null,
    reviewedAt: null,
    reviewNote: null,
    actionTaken: null,
    createdAt: new Date(),
  };

  storeEvent(event);

  // 持久化到控制台（供 K8s / ELK 等日志收集）
  // eslint-disable-next-line no-console
  console.warn(
    `[ai-risk] event_id=${id} type=${params.eventType} level=${params.riskLevel} ` +
    `user=${params.userId} assistant=${params.assistant} ` +
    `reason=${JSON.stringify(params.metadata)}`,
  );

  return id;
}

/**
 * 根据事件 ID 获取风险事件详情。
 */
export async function getAiRiskEventById(eventId: string): Promise<AiRiskEvent | null> {
  return inMemoryStore.get(eventId) ?? null;
}

/**
 * 获取指定用户的所有风险事件（倒序，最新的在前）。
 */
export async function getAiRiskEventsByUser(
  userId: string,
  options?: { limit?: number; status?: AiRiskEventStatus },
): Promise<AiRiskEvent[]> {
  const eventIds = userIndex.get(userId) ?? [];
  const limit = options?.limit ?? 50;

  const events = eventIds
    .map((id) => inMemoryStore.get(id))
    .filter((e): e is AiRiskEvent => e !== undefined)
    .filter((e) => !options?.status || e.status === options.status)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return events;
}

/**
 * 超级管理员：查询全站风险事件列表。
 */
export async function listAiRiskEvents(options?: {
  limit?: number;
  offset?: number;
  status?: AiRiskEventStatus;
  riskLevel?: AiRiskLevel;
  eventType?: AiRiskEventType;
}): Promise<{ events: AiRiskEvent[]; total: number }> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  let events = Array.from(inMemoryStore.values());

  if (options?.status) events = events.filter((e) => e.status === options.status);
  if (options?.riskLevel) events = events.filter((e) => e.riskLevel === options.riskLevel);
  if (options?.eventType) events = events.filter((e) => e.eventType === options.eventType);

  events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = events.length;
  const paged = events.slice(offset, offset + limit);

  return { events: paged, total };
}

/**
 * 管理员审核风险事件：确认 / 驳回 / 处置。
 */
export async function reviewAiRiskEvent(params: {
  eventId: string;
  reviewedByUserId: string;
  action: "confirm" | "dismiss" | "suspend_user" | "suspend_ai" | "warn_user";
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const event = inMemoryStore.get(params.eventId);
  if (!event) return { success: false, error: "事件不存在" };

  const actionMap: Record<string, string> = {
    confirm: "已确认",
    dismiss: "已驳回",
    suspend_user: "已暂停用户账号",
    suspend_ai: "已暂停用户AI权限",
    warn_user: "已发送警告",
  };

  event.status = params.action === "dismiss" ? "dismissed" : "resolved";
  event.reviewedByUserId = params.reviewedByUserId;
  event.reviewedAt = new Date();
  event.reviewNote = params.note ?? null;
  event.actionTaken = actionMap[params.action] ?? params.action;

  inMemoryStore.set(event.id, event);

  // eslint-disable-next-line no-console
  console.warn(
    `[ai-risk] reviewed event_id=${event.id} action=${params.action} by=${params.reviewedByUserId}`,
  );

  return { success: true };
}

/**
 * 用户举报 AI 回复。
 * 创建一个新的风险事件（type=report_received）。
 */
export async function reportAiResponse(params: {
  reporterUserId: string;
  assistant: string;
  userMessage: string;
  aiResponse: string;
  reason: string;
  ipAddress?: string | null;
}): Promise<{ eventId: string; success: boolean }> {
  const id = await logAiRiskEvent({
    userId: params.reporterUserId,
    eventType: "report_received",
    assistant: params.assistant,
    riskLevel: "medium",
    userMessage: params.userMessage,
    aiResponse: params.aiResponse,
    ipAddress: params.ipAddress ?? null,
    metadata: { userReportedReason: params.reason },
  });

  return { eventId: id, success: true };
}

/**
 * 获取用户收到的风险事件统计（用于治理面板）。
 */
export async function getAiRiskStats(): Promise<{
  total: number;
  byStatus: Record<AiRiskEventStatus, number>;
  byLevel: Record<AiRiskLevel, number>;
  byType: Record<AiRiskEventType, number>;
}> {
  const events = Array.from(inMemoryStore.values());

  const byStatus = events.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<AiRiskEventStatus, number>,
  );

  const byLevel = events.reduce(
    (acc, e) => {
      acc[e.riskLevel] = (acc[e.riskLevel] ?? 0) + 1;
      return acc;
    },
    {} as Record<AiRiskLevel, number>,
  );

  const byType = events.reduce(
    (acc, e) => {
      acc[e.eventType] = (acc[e.eventType] ?? 0) + 1;
      return acc;
    },
    {} as Record<AiRiskEventType, number>,
  );

  return { total: events.length, byStatus, byLevel, byType };
}
