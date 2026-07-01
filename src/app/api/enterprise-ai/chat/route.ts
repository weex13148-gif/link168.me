import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAiDailyUsage,
  getAiGlobalDailyUsage,
  incrementAiUsage,
  isAssistantEnabled,
} from "@/lib/app-config";
import { getAssistantDefinition, AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import {
  AI_CHAT_CREDIT_COST,
  consumeAiCredits,
  createAiCreditOperationId,
  refundAiCredits,
} from "@/lib/ai/credits";
import { rateLimit } from "@/lib/rate-limit";
import {
  detectPromptInjection,
  sanitizeUserMessage,
  hasSensitiveContent,
  moderateAiOutput,
} from "@/lib/content-safety";
import { checkUserAiRestricted } from "@/lib/ai/permissions";
import { logAiRiskEvent } from "@/lib/ai/risk-log";
import { recordAiCall } from "@/lib/ai/telemetry";
import {
  callBailianApplication,
  isBailianApplicationConfigured,
} from "@/lib/ai/providers/bailian-application";
import { getEnterpriseBailianAccess } from "@/lib/ai/enterprise-bailian";

export const runtime = "nodejs";

type ChatPayload = {
  assistant?: unknown;
  message?: unknown;
  history?: unknown;
  sessionId?: unknown;
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
  const rl = await rateLimit(request, "enterprise-ai:chat", 20, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  const { user, response: authResponse } = await requireUser(request);
  if (authResponse || !user) {
    return authResponse ?? NextResponse.json({ success: false, error: "请先登录。" }, { status: 401 });
  }
  const userId = user.id;
  const userEmail = user.email;

  const aiRestricted = await checkUserAiRestricted(userId);
  if (aiRestricted.restricted) {
    await logAiRiskEvent({
      userId,
      eventType: "user_ai_restricted",
      assistant: "",
      riskLevel: "high",
      userMessage: null,
      ipAddress: ip,
      metadata: { restrictionType: aiRestricted.type, reason: aiRestricted.reason },
    });
    return NextResponse.json(
      { success: false, error: "当前账户已被限制使用 AI，请联系管理员。" },
      { status: 403 },
    );
  }

  const enterpriseAccess = await getEnterpriseBailianAccess(userId, userEmail);
  if (!enterpriseAccess.access.allowed) {
    return NextResponse.json(
      { success: false, error: enterpriseAccess.access.reason || "当前账户没有企业 AI 权限。" },
      { status: 403 },
    );
  }

  const { config, resolved } = enterpriseAccess;
  if (!config.aiEnabled) {
    return NextResponse.json({ success: false, error: "AI 服务尚未开启。" }, { status: 403 });
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const rawAssistant = normalizeString(body.assistant);
  const message = normalizeString(body.message);
  const sessionId = normalizeString(body.sessionId);
  const history = normalizeHistory(body.history);

  if (!message) {
    return NextResponse.json({ success: false, error: "请输入问题。" }, { status: 400 });
  }

  let assistantTitle = "Enterprise AI";
  let assistantPrompt = "You are the Link168 enterprise AI assistant. Keep answers concise, accurate, and actionable.";
  let outputFormat = "Answer directly in Chinese.";
  let riskNotice = "For legal, tax, contract, or high-risk operational advice, tell the user to verify with a qualified human.";
  let assistantMaxLength = 6000;

  if (rawAssistant) {
    const assistantDef = getAssistantDefinition(rawAssistant);
    if (!assistantDef) {
      return NextResponse.json(
        {
          success: false,
          error: `未知 AI 助理。可用助理：${AI_ASSISTANT_LIST.map((item) => item.title).join("、")}`,
        },
        { status: 400 },
      );
    }

    assistantTitle = assistantDef.displayTitle;
    assistantPrompt = assistantDef.systemPrompt;
    outputFormat = assistantDef.outputFormat;
    riskNotice = assistantDef.riskNotice;
    assistantMaxLength = assistantDef.maxMessageLength;

    if (!isAssistantEnabled(config, assistantDef.displayTitle)) {
      return NextResponse.json(
        { success: false, error: "该 AI 助理尚未开启，请联系管理员。" },
        { status: 403 },
      );
    }
  }

  if (message.length > assistantMaxLength) {
    return NextResponse.json(
      { success: false, error: `消息不能超过 ${assistantMaxLength} 个字符。` },
      { status: 400 },
    );
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
      metadata: { reason: injection.reason },
    });
    return NextResponse.json(
      { success: false, error: `检测到提示词注入风险：${injection.reason}` },
      { status: 400 },
    );
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
      metadata: { matchedWords: sensitive.matches },
    });
    return NextResponse.json(
      { success: false, error: `消息包含受限内容（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后重试。` },
      { status: 400 },
    );
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
    return NextResponse.json(
      { success: false, error: "AI 服务尚未完成配置。" },
      { status: 500 },
    );
  }

  const perUserUsage = await getAiDailyUsage(userId, assistantTitle);
  if (perUserUsage.remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: `今日调用次数已用完（${perUserUsage.used}/${perUserUsage.limit}），请明天再试。`,
        usage: perUserUsage,
      },
      { status: 429 },
    );
  }

  const globalUsage = await getAiGlobalDailyUsage();
  if (globalUsage.remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: "平台今日 AI 总额度已用完，请明天再试。",
        usage: globalUsage,
      },
      { status: 429 },
    );
  }

  const creditOperationId = createAiCreditOperationId();
  const creditConsumeKey = `ai-chat:${creditOperationId}:consume`;
  const creditRefundKey = `ai-chat:${creditOperationId}:refund`;
  const creditMetadata = {
    assistant: assistantTitle,
    provider: "bailian-app",
    sessionId: sessionId || null,
  };
  const consumed = await consumeAiCredits({
    userId,
    amount: AI_CHAT_CREDIT_COST,
    idempotencyKey: creditConsumeKey,
    referenceType: "ai_chat",
    referenceId: creditOperationId,
    reason: `${assistantTitle} 对话消费`,
    metadata: creditMetadata,
  });

  if (!consumed.success) {
    return NextResponse.json(
      {
        success: false,
        error: consumed.error || "AI Credits 不足。",
        creditBalance: consumed.balance,
        creditCost: AI_CHAT_CREDIT_COST,
      },
      { status: 402 },
    );
  }

  async function refundCredit(reason: string, requestId = "") {
    const refunded = await refundAiCredits({
      userId,
      amount: AI_CHAT_CREDIT_COST,
      idempotencyKey: creditRefundKey,
      referenceType: "ai_chat",
      referenceId: creditOperationId,
      reason,
      metadata: { ...creditMetadata, requestId: requestId || null },
    });
    if (!refunded.success) {
      console.error("[enterprise-ai] AI Credits 自动退回失败:", refunded.error, creditOperationId);
    }
    return refunded;
  }

  const callStart = Date.now();
  let result: Awaited<ReturnType<typeof callBailianApplication>>;
  try {
    result = await callBailianApplication(providerConfig, prompt, sessionId || undefined);
  } catch (error) {
    const latencyMs = Date.now() - callStart;
    await refundCredit("百炼请求异常，自动退回 AI Credits");
    recordAiCall({
      userId,
      assistant: assistantTitle,
      model: providerConfig.appId,
      provider: "bailian-app",
      status: "error",
      httpStatus: 502,
      errorCode: "provider_exception",
      latencyMs,
      ipAddress: ip,
    });
    console.error("[enterprise-ai] 百炼请求异常:", error);
    return NextResponse.json(
      { success: false, error: "AI 服务请求失败，本次 Credits 已自动退回。" },
      { status: 502 },
    );
  }
  const latencyMs = Date.now() - callStart;

  if (!result.ok) {
    await refundCredit("百炼调用失败，自动退回 AI Credits", result.requestId || "");
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
        creditOperationId,
      },
    });

    recordAiCall({
      userId,
      assistant: assistantTitle,
      model: providerConfig.appId,
      provider: "bailian-app",
      status: "error",
      httpStatus: result.status,
      errorCode: result.status === 401 ? "401" : result.status === 403 ? "403" : result.status === 429 ? "429" : result.status >= 500 ? "5xx" : "other",
      latencyMs,
      ipAddress: ip,
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
      creditOperationId,
      creditRefunded: true,
    }));

    return NextResponse.json(
      {
        success: false,
        error: `${buildSafeError(result.error, "百炼服务暂时不可用。")} 本次 Credits 已自动退回。`,
        sessionId: sessionId || undefined,
        requestId: result.requestId || "",
      },
      { status: result.status ?? 502 },
    );
  }

  const usageRecorded = await incrementAiUsage(userId, assistantTitle);
  if (!usageRecorded) {
    const refunded = await refundCredit("每日额度竞争失败，自动退回 AI Credits", result.requestId || "");
    return NextResponse.json(
      {
        success: false,
        error: "今日调用次数已用完，本次 Credits 已自动退回。",
        creditBalance: refunded.balance,
      },
      { status: 429 },
    );
  }

  const moderated = moderateAiOutput(result.reply, result.reply);
  if (moderated.blocked) {
    const refunded = await refundCredit("AI 输出被安全审核拦截，自动退回 Credits", result.requestId || "");
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
        creditOperationId,
      },
    });

    recordAiCall({
      userId,
      assistant: assistantTitle,
      model: providerConfig.appId,
      provider: "bailian-app",
      status: "blocked",
      blockReason: "output_audit_blocked",
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      latencyMs,
      ipAddress: ip,
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
      creditOperationId,
      creditRefunded: true,
    }));

    return NextResponse.json(
      {
        success: false,
        error: "当前回答未通过安全审核，本次 Credits 已自动退回。请调整问题后重试。",
        requestId: result.requestId || "",
        creditBalance: refunded.balance,
      },
      { status: 400 },
    );
  }

  const finalUsage = await getAiDailyUsage(userId, assistantTitle);
  recordAiCall({
    userId,
    assistant: assistantTitle,
    model: providerConfig.appId,
    provider: "bailian-app",
    status: "success",
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs,
    ipAddress: ip,
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
    creditOperationId,
    creditCost: AI_CHAT_CREDIT_COST,
    creditBalance: consumed.balance,
  }));

  return NextResponse.json({
    success: true,
    reply: result.reply,
    sessionId: result.sessionId || sessionId || "",
    requestId: result.requestId || "",
    usage: finalUsage,
    credits: {
      cost: AI_CHAT_CREDIT_COST,
      balance: consumed.balance,
      operationId: creditOperationId,
    },
    providerMeta: {
      provider: "bailian-app",
      model: providerConfig.appId,
    },
  });
}
