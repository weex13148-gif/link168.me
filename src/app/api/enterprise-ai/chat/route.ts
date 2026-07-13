import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAiDailyUsage,
  getAiGlobalDailyUsage,
  incrementAiUsage,
  isAssistantEnabled,
} from "@/lib/app-config";
import { getAssistantDefinition, AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { rateLimit } from "@/lib/rate-limit";
import {
  detectPromptInjection,
  sanitizeUserMessage,
  hasSensitiveContent,
  moderateAiOutput,
} from "@/lib/content-safety";
import { checkUserAiRestricted } from "@/lib/ai/permissions";
import { assertAiEntitlement, buildAiUsageMetadata } from "@/lib/ai/entitlement-guard";
import { logAiRiskEvent } from "@/lib/ai/risk-log";
import {
  callBailianApplication,
  isBailianApplicationConfigured,
} from "@/lib/ai/providers/bailian-application";
import {
  getEnterpriseBailianAccess,
} from "@/lib/ai/enterprise-bailian";
import {
  consumeEnterpriseQuota,
  confirmEnterpriseQuota,
  refundEnterpriseQuota,
} from "@/lib/ai/enterprise-quota";
import { createAiTraceContext, setTraceIdOnNextResponse, logAiTraceInfo } from "@/lib/observability/ai-trace";
import { recordAiMetrics, recordSafetyRejection } from "@/lib/observability/ai-metrics";
import { mapProviderErrorToAiCode, type AiErrorCode } from "@/lib/ai/provider-error";
import { statusCodeToErrorType } from "@/lib/ai/providers/types";

export const runtime = "nodejs";

type ChatPayload = {
  assistant?: unknown;
  message?: unknown;
  history?: unknown;
  sessionId?: unknown;
  workspaceId?: unknown;
};

type ChatHistoryItem = { role: "user" | "assistant"; content: string };

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { role?: unknown; content?: unknown };
      if ((obj.role === "user" || obj.role === "assistant") && typeof obj.content === "string") {
        return { role: obj.role, content: obj.content };
      }
      return null;
    })
    .filter(Boolean) as ChatHistoryItem[];
}

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

function buildPrompt(args: {
  assistantTitle: string;
  assistantPrompt: string;
  outputFormat: string;
  riskNotice: string;
  userMessage: string;
  history: ChatHistoryItem[];
}) {
  const historyText = args.history.length
    ? args.history
        .slice(-10)
        .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
        .join("\n")
    : "";

  return [
    "You are answering for Link168 Enterprise AI.",
    `Assistant: ${args.assistantTitle}`,
    "",
    args.assistantPrompt,
    "",
    "[Output format]",
    args.outputFormat,
    "",
    "[Risk notice]",
    args.riskNotice,
    historyText ? "" : null,
    historyText ? "[Recent conversation]" : null,
    historyText || null,
    "",
    "[User message]",
    args.userMessage,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

function buildSafeError(message: string, fallback: string) {
  return message ? message : fallback;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const traceCtx = createAiTraceContext({ headers: request.headers, requestSource: "enterprise-ai:chat" });
  logAiTraceInfo(traceCtx, "ai_request_received", { ip: typeof ip !== "undefined" ? ip : "unknown" });
  const rl = await rateLimit(request, "enterprise-ai:chat", 20, 60 * 1000);
  if (!rl.passed) {
    const resp = NextResponse.json(
      {
        success: false,
        error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。`,
        code: "AI_RATE_LIMITED" as AiErrorCode,
        traceId: traceCtx.traceId,
      },
      { status: 429 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const { user, response: authResponse } = await requireUser(request);
  if (authResponse || !user) {
    if (authResponse) return authResponse;
    const resp = NextResponse.json(
      { success: false, error: "请先登录。", traceId: traceCtx.traceId },
      { status: 401 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }
  const userId = user.id;
  const userEmail = user.email;

  // ===== 统一 AI 权益守卫（enterprise_ai）=====
  const guard = await assertAiEntitlement(userId, "enterprise_ai");
  if (!guard.ok) {
    if (guard.code === "AI_RESTRICTED") {
      await logAiRiskEvent({
        userId,
        eventType: "user_ai_restricted",
        assistant: "",
        riskLevel: "high",
        userMessage: null,
        ipAddress: ip,
        metadata: { restrictionType: guard.restriction?.type, reason: guard.restriction?.reason, traceId: traceCtx.traceId },
      });
    }
    recordAiMetrics({
      traceCtx,
      userId: user.id,
      usageType: "enterprise_ai",
      success: false,
      errorCode: guard.code,
      httpStatus: guard.status,
      ipAddress: ip,
    });
    const resp = NextResponse.json(
      {
        ok: false,
        code: guard.code,
        message: guard.message,
        success: false,
        error: guard.message,
        usageType: guard.usageType,
        traceId: traceCtx.traceId,
      },
      { status: guard.status },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const aiRestricted = await checkUserAiRestricted(userId);
  if (aiRestricted.restricted) {
    await logAiRiskEvent({
      userId,
      eventType: "user_ai_restricted",
      assistant: "",
      riskLevel: "high",
      userMessage: null,
      ipAddress: ip,
      metadata: { restrictionType: aiRestricted.type, reason: aiRestricted.reason, traceId: traceCtx.traceId },
    });
    const resp = NextResponse.json(
      { success: false, error: "当前账户已被限制使用 AI，请联系管理员。", traceId: traceCtx.traceId },
      { status: 403 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const enterpriseAccess = await getEnterpriseBailianAccess(userId, userEmail);
  if (!enterpriseAccess.access.allowed) {
    const resp = NextResponse.json(
      { success: false, error: enterpriseAccess.access.reason || "当前账户没有企业 AI 权限。", traceId: traceCtx.traceId },
      { status: 403 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const { config, resolved } = enterpriseAccess;
  if (!config.aiEnabled) {
    const resp = NextResponse.json(
      { success: false, error: "AI 服务尚未开启。", traceId: traceCtx.traceId },
      { status: 403 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    const resp = NextResponse.json(
      { success: false, error: "请求格式不正确。", traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const rawAssistant = normalizeString(body.assistant);
  const message = normalizeString(body.message);
  const sessionId = normalizeString(body.sessionId);
  const history = normalizeHistory(body.history);
  const workspaceId = normalizeString(body.workspaceId);

  // 企业 AI 必须提供明确的 Workspace 上下文，不自动选择 workspaceMemberships[0]
  if (!workspaceId) {
    const resp = NextResponse.json(
      {
        success: false,
        error: "请提供企业 Workspace 上下文。",
        code: "ENTERPRISE_WORKSPACE_REQUIRED",
        traceId: traceCtx.traceId,
      },
      { status: 403 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  if (!message) {
    const resp = NextResponse.json(
      { success: false, error: "请输入问题。", traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  let assistantTitle = "Enterprise AI";
  let assistantPrompt = "You are the Link168 enterprise AI assistant. Keep answers concise, accurate, and actionable.";
  let outputFormat = "Answer directly in Chinese.";
  let riskNotice = "For legal, tax, contract, or high-risk operational advice, tell the user to verify with a qualified human.";
  let assistantMaxLength = 6000;

  if (rawAssistant) {
    const assistantDef = getAssistantDefinition(rawAssistant);
    if (!assistantDef) {
      const resp = NextResponse.json(
        {
          success: false,
          error: `未知 AI 助理。可用助理：${AI_ASSISTANT_LIST.map((item) => item.title).join("、")}`,
          traceId: traceCtx.traceId,
        },
        { status: 400 },
      );
      setTraceIdOnNextResponse(resp, traceCtx.traceId);
      return resp;
    }

    assistantTitle = assistantDef.displayTitle;
    assistantPrompt = assistantDef.systemPrompt;
    outputFormat = assistantDef.outputFormat;
    riskNotice = assistantDef.riskNotice;
    assistantMaxLength = assistantDef.maxMessageLength;

    if (!isAssistantEnabled(config, assistantDef.displayTitle)) {
      const resp = NextResponse.json(
        { success: false, error: "该 AI 助理尚未开启，请联系管理员。", traceId: traceCtx.traceId },
        { status: 403 },
      );
      setTraceIdOnNextResponse(resp, traceCtx.traceId);
      return resp;
    }
  }

  if (message.length > assistantMaxLength) {
    const resp = NextResponse.json(
      { success: false, error: `消息不能超过 ${assistantMaxLength} 个字符。`, traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const injection = detectPromptInjection(message);
  if (injection.detected) {
    await logAiRiskEvent({
      userId,
      eventType: "input_blocked",
      assistant: assistantTitle,
      riskLevel: "high",
      userMessage: message,
      ipAddress: ip,
      metadata: { reason: injection.reason, traceId: traceCtx.traceId },
    });
    recordSafetyRejection({
      traceCtx,
      userId,
      usageType: "enterprise_ai",
      stage: "input",
      reason: injection.reason ?? "prompt_injection",
      requestSource: "enterprise-ai:chat",
    });
    const resp = NextResponse.json(
      { success: false, error: `检测到提示词注入风险：${injection.reason}`, traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const sensitive = hasSensitiveContent(message);
  if (sensitive.detected) {
    await logAiRiskEvent({
      userId,
      eventType: "input_blocked",
      assistant: assistantTitle,
      riskLevel: "medium",
      userMessage: message,
      ipAddress: ip,
      metadata: { matchedWords: sensitive.matches, traceId: traceCtx.traceId },
    });
    recordSafetyRejection({
      traceCtx,
      userId,
      usageType: "enterprise_ai",
      stage: "input",
      reason: sensitive.matches.join(","),
      requestSource: "enterprise-ai:chat",
    });
    const resp = NextResponse.json(
      { success: false, error: `消息包含受限内容（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后重试。`, traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const sanitizedMessage = sanitizeUserMessage(message);
  const prompt = buildPrompt({
    assistantTitle,
    assistantPrompt,
    outputFormat,
    riskNotice,
    userMessage: sanitizedMessage,
    history: sessionId ? [] : history,
  });

  const providerConfig = {
    appId: resolved.appId,
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl,
    workspaceId: resolved.workspaceId,
    timeoutMs: resolved.timeoutMs,
  };

  if (!isBailianApplicationConfigured(providerConfig)) {
    const resp = NextResponse.json(
      { success: false, error: "AI 服务尚未完成配置。", traceId: traceCtx.traceId },
      { status: 500 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const perUserUsage = await getAiDailyUsage(userId, assistantTitle);
  if (perUserUsage.remaining <= 0) {
    const resp = NextResponse.json(
      {
        success: false,
        error: `今日调用次数已用完（${perUserUsage.used}/${perUserUsage.limit}），请明天再试。`,
        usage: perUserUsage,
        traceId: traceCtx.traceId,
      },
      { status: 429 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const globalUsage = await getAiGlobalDailyUsage();
  if (globalUsage.remaining <= 0) {
    const resp = NextResponse.json(
      {
        success: false,
        error: "平台今日 AI 总额度已用完，请明天再试。",
        usage: globalUsage,
        traceId: traceCtx.traceId,
      },
      { status: 429 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // ===== 企业 AI 只扣企业共享额度，不扣个人 AI Credits =====
  const enterpriseQuotaOperationId = `enterprise-ai:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const quotaMetadata = buildAiUsageMetadata({
    usageType: "enterprise_ai",
    assistant: assistantTitle,
    provider: "bailian-app",
    sessionId: sessionId || undefined,
  });

  const quotaResult = await consumeEnterpriseQuota({
    workspaceId,
    userId,
    amount: 1,
    operationId: enterpriseQuotaOperationId,
    reason: `${assistantTitle} 对话消费`,
    metadata: quotaMetadata,
  });

  if (!quotaResult.success) {
    const httpStatus =
      quotaResult.code === "INSUFFICIENT_QUOTA" ? 402 :
      quotaResult.code === "MEMBER_NOT_FOUND" || quotaResult.code === "MEMBER_NOT_ACTIVE" || quotaResult.code === "WORKSPACE_INACTIVE" || quotaResult.code === "PLAN_NOT_ALLOWED" || quotaResult.code === "PLAN_EXPIRED" ? 403 :
      quotaResult.code === "INVALID_AMOUNT" || quotaResult.code === "IDEMPOTENCY_CONFLICT" || quotaResult.code === "OPERATION_ID_EXISTS" ? 409 :
      500;
    const resp = NextResponse.json(
      {
        success: false,
        error: quotaResult.message || "企业额度不足。",
        code: quotaResult.code,
        traceId: traceCtx.traceId,
      },
      { status: httpStatus },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const callStart = Date.now();
  let result: Awaited<ReturnType<typeof callBailianApplication>>;
  try {
    result = await callBailianApplication(providerConfig, prompt, sessionId || undefined);
  } catch (error) {
    await refundEnterpriseQuota(workspaceId, enterpriseQuotaOperationId);
    const mappedAiCode = mapProviderErrorToAiCode(statusCodeToErrorType(502));
    recordAiMetrics({
      traceCtx,
      userId,
      usageType: "enterprise_ai",
      provider: "bailian-app",
      success: false,
      errorCode: mappedAiCode,
      httpStatus: 502,
    });
    console.error("[enterprise-ai] 百炼请求异常:", error);
    const resp = NextResponse.json(
      {
        success: false,
        error: "AI 服务请求失败，企业额度已自动退回。",
        code: mappedAiCode,
        traceId: traceCtx.traceId,
      },
      { status: 502 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }
  const latencyMs = Date.now() - callStart;

  if (!result.ok) {
    await refundEnterpriseQuota(workspaceId, enterpriseQuotaOperationId);
    const mappedAiCode = mapProviderErrorToAiCode(statusCodeToErrorType(result.status));
    await logAiRiskEvent({
      userId,
      eventType: "model_error",
      assistant: assistantTitle,
      riskLevel: "medium",
      userMessage: sanitizedMessage,
      ipAddress: ip,
      metadata: {
        error: result.error,
        status: result.status,
        requestId: result.requestId || "",
        enterpriseQuotaOperationId,
        traceId: traceCtx.traceId,
      },
    });

    recordAiMetrics({
      traceCtx,
      userId,
      usageType: "enterprise_ai",
      provider: "bailian-app",
      success: false,
      errorCode: mappedAiCode,
      httpStatus: result.status,
    });

    console.info(JSON.stringify({
      event: "enterprise_ai_chat",
      status: "error",
      requestId: result.requestId || "",
      userId,
      provider: "bailian-app",
      statusCode: result.status,
      latencyMs,
      usage: null,
      enterpriseQuotaOperationId,
      quotaRefunded: true,
    }));

    const resp = NextResponse.json(
      {
        success: false,
        error: `${buildSafeError(result.error, "百炼服务暂时不可用。")} 企业额度已自动退回。`,
        sessionId: sessionId || undefined,
        requestId: result.requestId || "",
        code: mappedAiCode,
        traceId: traceCtx.traceId,
      },
      { status: result.status ?? 502 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const usageRecorded = await incrementAiUsage(userId, assistantTitle);
  if (!usageRecorded) {
    await refundEnterpriseQuota(workspaceId, enterpriseQuotaOperationId);
    const resp = NextResponse.json(
      {
        success: false,
        error: "今日调用次数已用完，企业额度已自动退回。",
        traceId: traceCtx.traceId,
      },
      { status: 429 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const moderated = moderateAiOutput(result.reply, result.reply);
  if (moderated.blocked) {
    await refundEnterpriseQuota(workspaceId, enterpriseQuotaOperationId);
    await logAiRiskEvent({
      userId,
      eventType: "output_blocked",
      assistant: assistantTitle,
      riskLevel: "high",
      userMessage: sanitizedMessage,
      aiResponse: result.reply,
      ipAddress: ip,
      metadata: {
        reason: moderated.reason,
        requestId: result.requestId || "",
        enterpriseQuotaOperationId,
        traceId: traceCtx.traceId,
      },
    });

    recordSafetyRejection({
      traceCtx,
      userId,
      usageType: "enterprise_ai",
      stage: "output",
      reason: moderated.reason ?? "output_audit_blocked",
      requestSource: "enterprise-ai:chat",
    });

    console.info(JSON.stringify({
      event: "enterprise_ai_chat",
      status: "blocked",
      requestId: result.requestId || "",
      userId,
      provider: "bailian-app",
      statusCode: 400,
      latencyMs,
      usage: result.usage,
      enterpriseQuotaOperationId,
      quotaRefunded: true,
    }));

    const resp = NextResponse.json(
      {
        success: false,
        error: "当前回答未通过安全审核，企业额度已自动退回。请调整问题后重试。",
        requestId: result.requestId || "",
        traceId: traceCtx.traceId,
      },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // 百炼调用成功且输出通过审核 → 确认企业额度消费
  await confirmEnterpriseQuota(workspaceId, enterpriseQuotaOperationId);

  const finalUsage = await getAiDailyUsage(userId, assistantTitle);
  recordAiMetrics({
    traceCtx,
    userId,
    usageType: "enterprise_ai",
    provider: "bailian-app",
    model: providerConfig.appId,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    durationMs: latencyMs,
    success: true,
  });

  console.info(JSON.stringify({
    event: "enterprise_ai_chat",
    status: "success",
    requestId: result.requestId || "",
    userId,
    provider: "bailian-app",
    statusCode: 200,
    latencyMs,
    usage: result.usage,
    enterpriseQuotaOperationId,
    workspaceId,
  }));

  const resp = NextResponse.json({
    success: true,
    reply: result.reply,
    sessionId: result.sessionId || sessionId || "",
    requestId: result.requestId || "",
    usage: finalUsage,
    quota: {
      cost: 1,
      remaining: quotaResult.remainingQuota,
      operationId: enterpriseQuotaOperationId,
    },
    providerMeta: {
      provider: "bailian-app",
      model: providerConfig.appId,
    },
    traceId: traceCtx.traceId,
  });
  setTraceIdOnNextResponse(resp, traceCtx.traceId);
  return resp;
}
