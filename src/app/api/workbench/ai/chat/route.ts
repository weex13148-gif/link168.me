import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { getAssistantDefinition, AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { callAssistant, getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";
import { rateLimit } from "@/lib/rate-limit";
import { detectPromptInjection, sanitizeUserMessage, hasSensitiveContent, moderateAiOutput } from "@/lib/content-safety";
import { getAiQuota, consumeCredit, refundConsumedCredit, checkUserAiRestricted } from "@/lib/ai/permissions";
import { assertAiEntitlement, buildAiUsageMetadata } from "@/lib/ai/entitlement-guard";
import { createConversation, addMessage, getConversation } from "@/lib/ai/conversations";
import { logAiRiskEvent } from "@/lib/ai/risk-log";
import { createAiTraceContext, setTraceIdOnNextResponse, logAiTraceInfo } from "@/lib/observability/ai-trace";
import { recordAiMetrics, recordSafetyRejection } from "@/lib/observability/ai-metrics";
import { mapProviderErrorToAiCode, getAiErrorMessage, type AiErrorCode } from "@/lib/ai/provider-error";
import { AI_BASIC_TASK_CREDIT_COST, validateIdempotencyKey } from "@/lib/ai/credits";

export const runtime = "nodejs";

// 每条 AI 回复强制追加的标识（监管要求）
const AI_GENERATED_MARKER = "【内容由人工智能生成】";

type ChatPayload = {
  assistant?: unknown;
  message?: unknown;
  conversationId?: unknown;
  history?: unknown;
  requestId?: unknown;
};

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  // ===== AI 调用链路追踪：生成 traceId，贯穿整个请求 =====
  const traceCtx = createAiTraceContext({ headers: request.headers, requestSource: "workbench-ai:chat" });
  logAiTraceInfo(traceCtx, "ai_request_received", { ip });

  const rl = await rateLimit(request, "workbench-ai:chat", 20, 60 * 1000);
  if (!rl.passed) {
    const resp = NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。`, code: "AI_RATE_LIMITED" as AiErrorCode, traceId: traceCtx.traceId },
      { status: 429 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const { user, response: authResponse } = await requireDashboardUser(request);
  if (authResponse || !user) {
    return authResponse ?? NextResponse.json({ success: false, error: "未登录。" }, { status: 401 });
  }

  // ===== 统一 AI 权益守卫（business_ai）=====
  // 所有真实 AI 调用必须先通过此守卫，确保免费用户、过期会员、未知套餐、
  // AI 冻结用户无法绕过服务端校验直接调用 API。
  const guard = await assertAiEntitlement(user.id, "business_ai");
  if (!guard.ok) {
    const aiRestricted = guard.restriction?.restricted ? guard.restriction : await checkUserAiRestricted(user.id);
    if (aiRestricted.restricted) {
      await logAiRiskEvent({
        userId: user.id,
        eventType: "user_ai_restricted",
        assistant: "",
        riskLevel: "high",
        userMessage: null,
        ipAddress: ip,
        metadata: { restrictionType: aiRestricted.type, reason: aiRestricted.reason },
      });
    }
    // 返回统一错误结构 + 兼容 UI 所需的 quota 字段
    const quota = await getAiQuota(user.id);
    const resp = NextResponse.json(
      {
        ok: false,
        code: guard.code,
        message: guard.message,
        // 兼容旧 UI（success/error/upgradeRequired/quota）
        success: false,
        error: guard.message,
        upgradeRequired: guard.code === "AI_ENTITLEMENT_REQUIRED" || guard.code === "AI_MEMBERSHIP_EXPIRED",
        usageType: guard.usageType,
        traceId: traceCtx.traceId,
        quota: {
          planCode: quota.planCode,
          isActiveMember: quota.isActiveMember,
          planUsage: quota.planUsage,
          dailyUsage: quota.dailyUsage,
          creditBalance: quota.creditBalance,
        },
      },
      { status: guard.status },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    recordAiMetrics({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      success: false,
      errorCode: guard.code,
      httpStatus: guard.status,
      ipAddress: ip,
      assistant: "unknown",
    });
    return resp;
  }

  // 兼容旧 UI：仍查询 quota 用于响应
  const quota = await getAiQuota(user.id);

  const config = await getConfig();
  if (!config.aiEnabled) {
    return NextResponse.json(
      { success: false, error: "AI 服务尚未启用，请联系管理员。" },
      { status: 503 },
    );
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const rawAssistant = typeof body.assistant === "string" ? body.assistant : "";
  const message = typeof body.message === "string" ? body.message : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const historyRaw = Array.isArray(body.history) ? (body.history as unknown[]) : [];

  // ===== 幂等键校验 =====
  const clientIdempotencyKey = validateIdempotencyKey(body.requestId);
  if (!clientIdempotencyKey) {
    return NextResponse.json(
      { success: false, error: "缺少有效的 requestId（幂等键）。", code: "MISSING_IDEMPOTENCY_KEY" as AiErrorCode, traceId: traceCtx.traceId },
      { status: 400 },
    );
  }

  const assistantDef = getAssistantDefinition(rawAssistant);
  if (!assistantDef) {
    return NextResponse.json(
      {
        success: false,
        error: `未知的 AI 助手。可用值：${AI_ASSISTANT_LIST.map((a) => a.title).join("、")}。`,
      },
      { status: 400 },
    );
  }

  if (!isAssistantEnabled(config, assistantDef.displayTitle)) {
    return NextResponse.json(
      { success: false, error: "该 AI 助手尚未启用，请联系管理员配置后再试。" },
      { status: 403 },
    );
  }

  if (!message || message.length > assistantDef.maxMessageLength) {
    return NextResponse.json(
      { success: false, error: `消息不能为空或超过 ${assistantDef.maxMessageLength} 字。` },
      { status: 400 },
    );
  }

  // ===== 输入安全审核 =====
  const injection = detectPromptInjection(message);
  if (injection.detected) {
    await logAiRiskEvent({
      userId: user.id,
      eventType: "input_blocked",
      assistant: assistantDef.title,
      riskLevel: "high",
      userMessage: message,
      ipAddress: ip,
      metadata: { reason: injection.reason, traceId: traceCtx.traceId },
    });
    recordSafetyRejection({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      stage: "input",
      reason: `prompt_injection: ${injection.reason}`,
      requestSource: "workbench-ai:chat",
    });
    const resp = NextResponse.json(
      { success: false, error: `检测到潜在的提示词注入风险：${injection.reason}。请重新组织问题。`, code: "AI_SAFETY_REJECTED" as AiErrorCode, traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const sensitive = hasSensitiveContent(message);
  if (sensitive.detected) {
    await logAiRiskEvent({
      userId: user.id,
      eventType: "input_blocked",
      assistant: assistantDef.title,
      riskLevel: "medium",
      userMessage: message,
      ipAddress: ip,
      metadata: { matchedWords: sensitive.matches, traceId: traceCtx.traceId },
    });
    recordSafetyRejection({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      stage: "input",
      reason: `sensitive_content: ${sensitive.matches.slice(0, 3).join(",")}`,
      requestSource: "workbench-ai:chat",
    });
    const resp = NextResponse.json(
      { success: false, error: `消息内容包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。`, code: "AI_SAFETY_REJECTED" as AiErrorCode, traceId: traceCtx.traceId },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  const sanitizedMessage = sanitizeUserMessage(message);

  const providerConfig = await getProviderConfig(assistantDef);
  if (!isProviderConfigured(providerConfig)) {
    return NextResponse.json(
      { success: false, error: "AI 服务尚未配置（缺少 API Key / Base URL / Model）。" },
      { status: 500 },
    );
  }

  let convId = conversationId;

  if (convId) {
    const existingConversation = await getConversation(user.id, convId);
    if (!existingConversation) {
      return NextResponse.json(
        { success: false, error: "会话不存在或无权访问。" },
        { status: 404 },
      );
    }
  } else {
    const newConv = await createConversation(user.id, assistantDef.title as any);
    convId = newConv.id;
  }

  await addMessage(convId, "user", sanitizedMessage, 0, { requestId: clientIdempotencyKey });

  const history = historyRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { role?: unknown; content?: unknown };
      const role = obj.role;
      const content = obj.content;
      if ((role === "user" || role === "assistant") && typeof content === "string") {
        return { role: role as "user" | "assistant", content };
      }
      return null;
    })
    .filter(Boolean) as { role: "user" | "assistant"; content: string }[];

  // 先尝试扣额度（调用失败会回补）
  const creditCost = AI_BASIC_TASK_CREDIT_COST;
  const creditResult = await consumeCredit(
    user.id,
    creditCost,
    "ai_message",
    convId,
    buildAiUsageMetadata({
      usageType: "business_ai",
      assistant: assistantDef.title,
      provider: providerConfig.provider,
      conversationId: convId,
      extra: { model: providerConfig.model },
    }),
    clientIdempotencyKey,
  );

  if (!creditResult.success) {
    await addMessage(convId, "assistant", "额度不足，请升级套餐或购买额度包。", 0, { requestId: clientIdempotencyKey, blocked: true });
    return NextResponse.json(
      {
        success: false,
        error: creditResult.reason || "额度不足，请升级套餐。",
        conversationId: convId,
        upgradeRequired: true,
        quota: {
          planCode: quota.planCode,
          planUsage: quota.planUsage,
          dailyUsage: quota.dailyUsage,
          creditBalance: quota.creditBalance,
        },
      },
      { status: 402 },
    );
  }

  const result = await callAssistant(assistantDef, sanitizedMessage, history);

  // ===== 模型调用失败 =====
  if (!result.ok || !result.reply) {
    const refundResult = await refundConsumedCredit({
      userId: user.id,
      operationKey: creditResult.operationKey,
      reason: "模型调用失败自动补偿",
      metadata: { conversationId: convId, traceId: traceCtx.traceId },
    });
    if (!refundResult.success) {
      await logAiRiskEvent({
        userId: user.id,
        eventType: "refund_failed",
        assistant: assistantDef.title,
        riskLevel: "high",
        metadata: {
          reason: "模型调用失败退款失败",
          conversationId: convId,
          traceId: traceCtx.traceId,
          error: result.error,
        },
      });
      const resp = NextResponse.json(
        { success: false, error: "AI 调用失败且退款处理中，请联系客服。", code: "REFUND_PENDING" as AiErrorCode, traceId: traceCtx.traceId, conversationId: convId },
        { status: 502 },
      );
      setTraceIdOnNextResponse(resp, traceCtx.traceId);
      return resp;
    }
    await logAiRiskEvent({
      userId: user.id,
      eventType: "model_error",
      assistant: assistantDef.title,
      riskLevel: "medium",
      userMessage: sanitizedMessage,
      ipAddress: ip,
      metadata: { error: result.error, status: result.status, model: providerConfig.model, traceId: traceCtx.traceId },
    });

    // 统一指标（recordAiMetrics 内部已调用 recordAiCall，避免双重计数）
    const httpStatus = result.status ?? 502;
    const providerErrorType = result.status === 401 ? "AUTH_ERROR" : result.status === 404 ? "NOT_FOUND" : result.status === 429 ? "RATE_LIMIT" : result.status === 504 ? "TIMEOUT" : "SERVER_ERROR";
    const aiErrorCode = mapProviderErrorToAiCode(providerErrorType as any) as AiErrorCode;
    recordAiMetrics({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      provider: "bailian",
      model: providerConfig.model,
      success: false,
      errorCode: aiErrorCode,
      httpStatus,
      ipAddress: ip,
      assistant: assistantDef.title,
    });

    await addMessage(convId, "assistant", result.error || "AI 服务暂时不可用。", 0, { requestId: clientIdempotencyKey, error: result.error });
    const resp = NextResponse.json(
      {
        success: false,
        error: result.error || "AI 服务暂时不可用，已自动退回额度。",
        code: aiErrorCode,
        traceId: traceCtx.traceId,
        conversationId: convId,
        providerMeta: result.providerMeta,
      },
      { status: result.status ?? 502 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // 统一指标（recordAiMetrics 内部已调用 recordAiCall，避免双重计数）
  if (result.bailianResult) {
    recordAiMetrics({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      provider: "bailian",
      model: result.bailianResult.model,
      inputTokens: result.bailianResult.inputTokens,
      outputTokens: result.bailianResult.outputTokens,
      durationMs: result.bailianResult.latencyMs,
      success: true,
      ipAddress: ip,
      assistant: assistantDef.title,
    });
  }

  // ===== 输出安全审核 =====
  const moderated = moderateAiOutput(result.reply.summary, result.reply.content);
  if (moderated.blocked) {
    const refundResult = await refundConsumedCredit({
      userId: user.id,
      operationKey: creditResult.operationKey,
      reason: "输出审核拦截自动补偿",
      metadata: { conversationId: convId, traceId: traceCtx.traceId },
    });
    if (!refundResult.success) {
      await logAiRiskEvent({
        userId: user.id,
        eventType: "refund_failed",
        assistant: assistantDef.title,
        riskLevel: "high",
        metadata: {
          reason: "输出审核拦截退款失败",
          conversationId: convId,
          traceId: traceCtx.traceId,
        },
      });
      const resp = NextResponse.json(
        { success: false, error: "内容审核未通过且退款处理中，请联系客服。", code: "REFUND_PENDING" as AiErrorCode, traceId: traceCtx.traceId, conversationId: convId },
        { status: 400 },
      );
      setTraceIdOnNextResponse(resp, traceCtx.traceId);
      return resp;
    }
    await logAiRiskEvent({
      userId: user.id,
      eventType: "output_blocked",
      assistant: assistantDef.title,
      riskLevel: "high",
      userMessage: sanitizedMessage,
      aiResponse: result.reply.content,
      ipAddress: ip,
      metadata: { reason: moderated.reason, model: providerConfig.model, traceId: traceCtx.traceId },
    });
    recordSafetyRejection({
      traceCtx,
      userId: user.id,
      usageType: "business_ai",
      stage: "output",
      reason: moderated.reason ?? "内容审核拒绝",
      requestSource: "workbench-ai:chat",
    });
    await addMessage(convId, "assistant", "该问题无法提供有效回答，请换一种方式提问。", creditCost, { requestId: clientIdempotencyKey, blocked: true });
    const resp = NextResponse.json(
      {
        success: false,
        error: "该问题无法提供有效回答，请换一种方式提问。已自动退回额度。",
        code: "AI_SAFETY_REJECTED" as AiErrorCode,
        traceId: traceCtx.traceId,
        conversationId: convId,
      },
      { status: 400 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // ===== 构造带 AI 标识的回复（每条强制追加【内容由人工智能生成】）=====
  const replyText = result.reply;
  const suggestionsText = replyText.suggestions.length
    ? `建议：\n${replyText.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}`
    : "";

  // 关键：每条回复以【内容由人工智能生成】开头
  const fullReplyText = [
    AI_GENERATED_MARKER,
    "",
    `【摘要】${moderated.summary}`,
    "",
    suggestionsText,
    suggestionsText ? "" : null,
    moderated.content,
    "",
    moderated.disclaimer,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  // 保存助手回复到数据库
  try {
    await addMessage(convId, "assistant", fullReplyText, creditCost, {
      requestId: clientIdempotencyKey,
      structured: {
        summary: moderated.summary,
        suggestions: replyText.suggestions,
        content: moderated.content,
        disclaimer: moderated.disclaimer,
      },
      providerMeta: result.providerMeta,
      creditSource: creditResult.source,
    });
  } catch (dbError) {
    const refundResult = await refundConsumedCredit({
      userId: user.id,
      operationKey: creditResult.operationKey,
      reason: "写库失败自动补偿（助手回复）",
      metadata: { conversationId: convId, traceId: traceCtx.traceId },
    });
    if (!refundResult.success) {
      await logAiRiskEvent({
        userId: user.id,
        eventType: "refund_failed",
        assistant: assistantDef.title,
        riskLevel: "high",
        metadata: {
          reason: "写库失败退款失败（助手回复）",
          conversationId: convId,
          traceId: traceCtx.traceId,
          error: String(dbError),
        },
      });
      const resp = NextResponse.json(
        { success: false, error: "服务异常且退款处理中，请联系客服。", code: "REFUND_PENDING" as AiErrorCode, traceId: traceCtx.traceId, conversationId: convId },
        { status: 500 },
      );
      setTraceIdOnNextResponse(resp, traceCtx.traceId);
      return resp;
    }
    const resp = NextResponse.json(
      { success: false, error: "服务异常，已自动退回额度。", code: "DB_WRITE_FAILED" as AiErrorCode, traceId: traceCtx.traceId, conversationId: convId },
      { status: 500 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // 返回更新后的配额
  const updatedQuota = await getAiQuota(user.id);

  const resp = NextResponse.json({
    success: true,
    traceId: traceCtx.traceId,
    conversationId: convId,
    requestId: clientIdempotencyKey,
    reply: fullReplyText,
    structured: {
      summary: moderated.summary,
      suggestions: replyText.suggestions,
      content: moderated.content,
      disclaimer: moderated.disclaimer,
      assistantTitle: replyText.assistantTitle,
    },
    quota: {
      planUsage: updatedQuota.planUsage,
      dailyUsage: updatedQuota.dailyUsage,
      creditBalance: updatedQuota.creditBalance,
    },
    creditCost,
    creditSource: creditResult.source,
    providerMeta: result.providerMeta,
  });
  setTraceIdOnNextResponse(resp, traceCtx.traceId);
  return resp;
}
