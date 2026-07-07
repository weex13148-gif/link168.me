// 统一 AI 安全调用链（Gateway）
// 链路：用户输入 → 输入审核 → 权限/额度检查 → AI冻结检查 → 调用模型 → 输出审核 → 日志留痕 → 返回
// 仅在服务端使用。

import { callAssistant, getProviderConfig, isProviderConfigured, type StructuredAssistantReply } from "@/lib/ai/provider";
import type { AiAssistantDefinition } from "@/lib/ai/assistants";
import { detectPromptInjection, sanitizeUserMessage, hasSensitiveContent, moderateAiOutput, type ModerateAiOutputResult } from "@/lib/content-safety";
import { getAiQuota, checkUserAiRestricted } from "@/lib/ai/permissions";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { logAiRiskEvent, type AiRiskEventType, type AiRiskLevel } from "@/lib/ai/risk-log";
import { refundCredit } from "@/lib/ai/permissions";
import crypto from "crypto";
import { addAiDisclaimer, AI_DISCLAIMER, AI_GENERATED_MARKER } from "@/lib/ai/compliance";

// ---------- 输入审核结果 ----------
export type InputAuditResult = {
  ok: boolean;
  blocked: boolean;
  reason: string | null;
  sanitizedMessage: string | null;
  riskLevel: AiRiskLevel | null;
};

// ---------- 统一 Gateway 核心类型 ----------
export type AiGatewayOptions = {
  userId: string;
  assistant: AiAssistantDefinition;
  userMessage: string;
  history: { role: "user" | "assistant"; content: string }[];
  ipAddress?: string;
  // 内部使用credit系统（workbench），false时用每日限额系统（enterprise）
  useCreditSystem?: boolean;
  idempotencyKey?: string;
};

export type AiGatewayResult = {
  ok: boolean;
  error?: string;
  status?: number;
  reply?: string;
  structured?: {
    summary: string;
    suggestions: string[];
    content: string;
    disclaimer: string;
    assistantTitle: string;
  };
  providerMeta?: { provider: string; model: string };
  messageId?: string;
  conversationId?: string;
  blocked?: boolean;       // 是否被审核拦截
  blockReason?: string;    // 拦截原因（不暴露给前端）
  riskEventId?: string;   // 关联风险事件ID（若有）
  quota?: {
    planUsage: { used: number; limit: number; remaining: number; percent: number | null };
    dailyUsage: { used: number; limit: number; remaining: number };
    creditBalance: number;
  };
  creditSource?: "plan" | "credit";
  creditCost?: number;
};

// ---------- 输入安全审核 ----------
export async function auditInput(
  message: string,
  assistant: AiAssistantDefinition,
): Promise<InputAuditResult> {
  if (!message || !message.trim()) {
    return { ok: false, blocked: true, reason: "消息不能为空", sanitizedMessage: null, riskLevel: null };
  }

  // 1. Prompt injection 检测
  const injection = detectPromptInjection(message);
  if (injection.detected) {
    return {
      ok: false,
      blocked: true,
      reason: `检测到提示词注入风险：${injection.reason}。请重新组织问题。`,
      sanitizedMessage: null,
      riskLevel: "high",
    };
  }

  // 2. 敏感内容检测
  const sensitive = hasSensitiveContent(message);
  if (sensitive.detected) {
    return {
      ok: false,
      blocked: true,
      reason: `消息内容包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。`,
      sanitizedMessage: null,
      riskLevel: "medium",
    };
  }

  // 3. 长度检查
  if (message.length > assistant.maxMessageLength) {
    return {
      ok: false,
      blocked: true,
      reason: `消息不能超过 ${assistant.maxMessageLength} 字。`,
      sanitizedMessage: null,
      riskLevel: "low",
    };
  }

  // 4. 清理后返回
  const sanitized = sanitizeUserMessage(message);
  return { ok: true, blocked: false, reason: null, sanitizedMessage: sanitized, riskLevel: null };
}

// ---------- 统一 Gateway 主体 ----------
export async function aiGateway(options: AiGatewayOptions): Promise<AiGatewayResult> {
  const {
    userId,
    assistant,
    userMessage,
    history,
    ipAddress,
    useCreditSystem = true,
    idempotencyKey,
  } = options;

  const messageId = crypto.randomUUID();
  const finalIdempotencyKey = idempotencyKey || `ai_chat:${messageId}`;

  // ===== 第一步：输入安全审核 =====
  const inputAudit = await auditInput(userMessage, assistant);
  if (inputAudit.blocked) {
    // 记录输入拦截风险事件
    const riskEventId = await logAiRiskEvent({
      userId,
      eventType: "input_blocked",
      assistant: assistant.title,
      riskLevel: inputAudit.riskLevel || "low",
      userMessage,
      ipAddress,
      metadata: { reason: inputAudit.reason, injection: inputAudit.reason?.includes("注入") ?? false },
    });

    return {
      ok: false,
      error: inputAudit.reason || "输入内容不符合安全要求。",
      status: 400,
      blocked: true,
      blockReason: inputAudit.reason || undefined,
      riskEventId,
    };
  }

  const sanitizedMessage = inputAudit.sanitizedMessage!;

  // ===== 第二步：AI 全局开关 & 单个助手开关 =====
  const config = await getConfig();
  if (!config.aiEnabled) {
    return {
      ok: false,
      error: "AI 服务尚未启用，请联系管理员。",
      status: 503,
      blocked: true,
    };
  }

  if (!isAssistantEnabled(config, assistant.displayTitle)) {
    return {
      ok: false,
      error: "该 AI 助手尚未启用，请联系管理员配置后再试。",
      status: 403,
      blocked: true,
    };
  }

  // ===== 第三步：用户 AI 冻结/封禁检查（复用 FreezeRecord）=====
  const aiRestricted = await checkUserAiRestricted(userId);
  if (aiRestricted.restricted) {
    const riskEventId = await logAiRiskEvent({
      userId,
      eventType: "user_ai_restricted",
      assistant: assistant.title,
      riskLevel: "high",
      userMessage,
      ipAddress,
      metadata: {
        restrictionType: aiRestricted.type,
        reason: aiRestricted.reason,
        expiredAt: aiRestricted.expiresAt?.toISOString() ?? null,
      },
    });

    return {
      ok: false,
      error: "当前账号 AI 功能已被限制，请联系管理员。",
      status: 403,
      blocked: true,
      blockReason: aiRestricted.reason || undefined,
      riskEventId,
    };
  }

  // ===== 第四步：权限与额度检查 =====
  if (useCreditSystem) {
    // Workbench 体系：套餐额度 + Credit
    const quota = await getAiQuota(userId);
    if (!quota.canCall) {
      return {
        ok: false,
        error: quota.reason || "您没有使用 AI 助手的权限，请升级会员。",
        status: 403,
        blocked: false,
        quota: {
          planUsage: quota.planUsage,
          dailyUsage: quota.dailyUsage,
          creditBalance: quota.creditBalance,
        },
      };
    }
  }
  // Enterprise 体系（useCreditSystem=false）的每日限额在上层检查，此处不处理

  // ===== 第五步：Provider 配置检查 =====
  const providerConfig = await getProviderConfig(assistant);
  if (!isProviderConfigured(providerConfig)) {
    return {
      ok: false,
      error: "AI 服务尚未配置（缺少 API Key / Base URL / Model），请联系管理员。",
      status: 500,
      blocked: true,
    };
  }

  // ===== 第六步：调用模型 =====
  let rawReply: StructuredAssistantReply | undefined;
  let providerMeta: { provider: string; model: string } | undefined;

  try {
    const result = await callAssistant(assistant, sanitizedMessage, history);

    if (!result.ok || !result.reply) {
      // 记录模型调用失败
      const riskEventId = await logAiRiskEvent({
        userId,
        eventType: "model_error",
        assistant: assistant.title,
        riskLevel: "medium",
        userMessage,
        ipAddress,
        metadata: {
          error: result.error || "unknown",
          status: result.status,
          provider: providerConfig.provider,
          model: providerConfig.model,
        },
      });

      return {
        ok: false,
        error: result.error || "AI 服务暂时不可用。",
        status: result.status ?? 502,
        blocked: false,
        riskEventId,
        providerMeta: result.providerMeta,
      };
    }

    rawReply = result.reply;
    providerMeta = result.providerMeta;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const riskEventId = await logAiRiskEvent({
      userId,
      eventType: "model_error",
      assistant: assistant.title,
      riskLevel: "high",
      userMessage,
      ipAddress,
      metadata: { error: errorMsg, timeout: errorMsg.includes("aborted") },
    });

    return {
      ok: false,
      error: `AI 服务调用失败：${errorMsg}`,
      status: 502,
      blocked: false,
      riskEventId,
    };
  }

  // ===== 第七步：输出安全审核 =====
  const moderated = moderateAiOutput(rawReply.summary, rawReply.content);

  if (moderated.blocked) {
    // 记录输出审核拦截
    const riskEventId = await logAiRiskEvent({
      userId,
      eventType: "output_blocked",
      assistant: assistant.title,
      riskLevel: "high",
      userMessage,
      ipAddress,
      metadata: {
        reason: moderated.reason,
        provider: providerConfig.provider,
        model: providerConfig.model,
      },
    });

    return {
      ok: false,
      error: "该问题无法提供有效回答，请换一种方式提问。",
      status: 400,
      blocked: true,
      blockReason: moderated.reason || undefined,
      riskEventId,
    };
  }

  // ===== 第八步：AI 内容标识 =====
  // 每条回复强制追加"内容由人工智能生成，仅供参考"标识 + 免责声明

  const suggestionsText = rawReply.suggestions.length
    ? `建议：\n${rawReply.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}`
    : "";

  const coreContent = [
    `【摘要】${moderated.summary}`,
    "",
    suggestionsText,
    suggestionsText ? "" : null,
    moderated.content,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  const fullReplyText = addAiDisclaimer(coreContent);

  return {
    ok: true,
    reply: fullReplyText,
    structured: {
      summary: moderated.summary,
      suggestions: rawReply.suggestions,
      content: moderated.content,
      disclaimer: moderated.disclaimer,
      assistantTitle: rawReply.assistantTitle,
    },
    messageId,
    providerMeta,
    blocked: false,
  };
}
