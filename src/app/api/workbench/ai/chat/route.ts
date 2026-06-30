import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { getAssistantDefinition, AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { callAssistant, getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";
import { rateLimit } from "@/lib/rate-limit";
import { detectPromptInjection, sanitizeUserMessage, hasSensitiveContent, moderateAiOutput } from "@/lib/content-safety";
import { getAiQuota, consumeCredit, refundCredit, checkUserAiRestricted } from "@/lib/ai/permissions";
import { createConversation, addMessage, getConversation } from "@/lib/ai/conversations";
import { logAiRiskEvent } from "@/lib/ai/risk-log";
import { recordAiCall } from "@/lib/ai/telemetry";
import crypto from "crypto";

export const runtime = "nodejs";

// 每条 AI 回复强制追加的标识（监管要求）
const AI_GENERATED_MARKER = "【内容由人工智能生成】";

type ChatPayload = {
  assistant?: unknown;
  message?: unknown;
  conversationId?: unknown;
  history?: unknown;
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

  const rl = await rateLimit(request, "workbench-ai:chat", 20, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  const { user, response: authResponse } = await requireDashboardUser(request);
  if (authResponse || !user) {
    return authResponse ?? NextResponse.json({ success: false, error: "未登录。" }, { status: 401 });
  }

  // ===== AI 冻结/封禁检查 =====
  const aiRestricted = await checkUserAiRestricted(user.id);
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
    return NextResponse.json(
      { success: false, error: "当前账号 AI 功能已被限制，请联系管理员。" },
      { status: 403 },
    );
  }

  // 使用新的配额系统（套餐月度 + 每日风控 + Credit）
  const quota = await getAiQuota(user.id);
  if (!quota.canCall) {
    return NextResponse.json(
      {
        success: false,
        error: quota.reason || "您没有使用 AI 助手的权限，请升级会员。",
        upgradeRequired: true,
        quota: {
          planCode: quota.planCode,
          isActiveMember: quota.isActiveMember,
          planUsage: quota.planUsage,
          dailyUsage: quota.dailyUsage,
          creditBalance: quota.creditBalance,
        },
      },
      { status: 403 },
    );
  }

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
      metadata: { reason: injection.reason },
    });
    return NextResponse.json(
      { success: false, error: `检测到潜在的提示词注入风险：${injection.reason}。请重新组织问题。` },
      { status: 400 },
    );
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
      metadata: { matchedWords: sensitive.matches },
    });
    return NextResponse.json(
      { success: false, error: `消息内容包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
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

  // 幂等键：防止重复扣减和重复消息
  const messageId = crypto.randomUUID();

  await addMessage(convId, "user", sanitizedMessage, 0, { messageId });

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
  const creditCost = 1;
  const creditResult = await consumeCredit(
    user.id,
    creditCost,
    "ai_message",
    messageId,
    { assistant: assistantDef.title, model: providerConfig.model, conversationId: convId },
  );

  if (!creditResult.success) {
    await addMessage(convId, "assistant", "额度不足，请升级套餐或购买额度包。", 0, { messageId, blocked: true });
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
    await refundCredit(user.id, creditCost, "ai_message", messageId, "调用失败回补");
    await logAiRiskEvent({
      userId: user.id,
      eventType: "model_error",
      assistant: assistantDef.title,
      riskLevel: "medium",
      userMessage: sanitizedMessage,
      ipAddress: ip,
      metadata: { error: result.error, status: result.status, model: providerConfig.model },
    });

    // 记录到 telemetry（失败）
    const httpStatus = result.status ?? 502;
    const errorCode = result.status === 401 ? "AUTH_ERROR" : result.status === 404 ? "NOT_FOUND" : result.status === 429 ? "RATE_LIMIT" : "SERVER_ERROR";
    recordAiCall({
      userId: user.id,
      assistant: assistantDef.title as string,
      model: providerConfig.model,
      provider: "bailian",
      status: "error",
      httpStatus,
      errorCode,
      latencyMs: 0,
      ipAddress: ip,
    });

    await addMessage(convId, "assistant", result.error || "AI 服务暂时不可用。", 0, { messageId, error: result.error });
    return NextResponse.json(
      {
        success: false,
        error: result.error || "AI 服务暂时不可用。",
        conversationId: convId,
        providerMeta: result.providerMeta,
      },
      { status: result.status ?? 502 },
    );
  }

  // 记录到 telemetry（成功）
  if (result.bailianResult) {
    recordAiCall({
      userId: user.id,
      assistant: assistantDef.title as string,
      model: result.bailianResult.model,
      provider: "bailian",
      status: "success",
      inputTokens: result.bailianResult.inputTokens,
      outputTokens: result.bailianResult.outputTokens,
      latencyMs: result.bailianResult.latencyMs,
      ipAddress: ip,
    });
  }

  // ===== 输出安全审核 =====
  const moderated = moderateAiOutput(result.reply.summary, result.reply.content);
  if (moderated.blocked) {
    // 内容审核拦截：不回补（已消耗服务资源）
    await logAiRiskEvent({
      userId: user.id,
      eventType: "output_blocked",
      assistant: assistantDef.title,
      riskLevel: "high",
      userMessage: sanitizedMessage,
      aiResponse: result.reply.content,
      ipAddress: ip,
      metadata: { reason: moderated.reason, model: providerConfig.model },
    });
    await addMessage(convId, "assistant", "该问题无法提供有效回答，请换一种方式提问。", creditCost, { messageId, blocked: true });
    return NextResponse.json(
      {
        success: false,
        error: "该问题无法提供有效回答，请换一种方式提问。",
        conversationId: convId,
      },
      { status: 400 },
    );
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

  await addMessage(convId, "assistant", fullReplyText, creditCost, {
    messageId,
    structured: {
      summary: moderated.summary,
      suggestions: replyText.suggestions,
      content: moderated.content,
      disclaimer: moderated.disclaimer,
    },
    providerMeta: result.providerMeta,
    creditSource: creditResult.source,
  });

  // 返回更新后的配额
  const updatedQuota = await getAiQuota(user.id);

  return NextResponse.json({
    success: true,
    conversationId: convId,
    messageId,
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
}
