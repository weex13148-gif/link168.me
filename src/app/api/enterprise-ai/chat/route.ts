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
    return authResponse ?? NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

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
      { success: false, error: "This account is currently restricted from AI usage. Please contact an administrator." },
      { status: 403 },
    );
  }

  const enterpriseAccess = await getEnterpriseBailianAccess(user.id, user.email);
  if (!enterpriseAccess.access.allowed) {
    return NextResponse.json(
      { success: false, error: enterpriseAccess.access.reason || "This account is not allowed to use Enterprise AI." },
      { status: 403 },
    );
  }

  const { config, resolved } = enterpriseAccess;
  if (!config.aiEnabled) {
    return NextResponse.json({ success: false, error: "AI service is not enabled." }, { status: 403 });
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const rawAssistant = normalizeString(body.assistant);
  const message = normalizeString(body.message);
  const sessionId = normalizeString(body.sessionId);
  const history = normalizeHistory(body.history);

  if (!message) {
    return NextResponse.json({ success: false, error: "Message is required." }, { status: 400 });
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
          error: `Unknown assistant. Available values: ${AI_ASSISTANT_LIST.map((item) => item.title).join(", ")}`, 
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
        { success: false, error: "This assistant is not enabled. Please contact an administrator." },
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
      userId: user.id,
      eventType: "input_blocked",
      assistant: assistantTitle,
      riskLevel: "high",
      userMessage: message,
      ipAddress: ip,
      metadata: { reason: injection.reason },
    });
    return NextResponse.json(
      { success: false, error: `Prompt injection risk detected: ${injection.reason}` },
      { status: 400 },
    );
  }

  const sensitive = hasSensitiveContent(message);
  if (sensitive.detected) {
    await logAiRiskEvent({
      userId: user.id,
      eventType: "input_blocked",
      assistant: assistantTitle,
      riskLevel: "medium",
      userMessage: message,
      ipAddress: ip,
      metadata: { matchedWords: sensitive.matches },
    });
    return NextResponse.json(
      { success: false, error: `Message contains restricted content (${sensitive.matches.slice(0, 3).join(" / ")}). Please revise and retry.` },
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
      { success: false, error: "AI service is not configured." },
      { status: 500 },
    );
  }

  const perUserUsage = await getAiDailyUsage(user.id, assistantTitle);
  if (perUserUsage.remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Daily limit reached (${perUserUsage.used}/${perUserUsage.limit}). Try again tomorrow.`,
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
        error: "Global daily AI quota has been exhausted. Try again tomorrow.",
        usage: globalUsage,
      },
      { status: 429 },
    );
  }

  const callStart = Date.now();
  const result = await callBailianApplication(providerConfig, prompt, sessionId || undefined);
  const latencyMs = Date.now() - callStart;

  if (!result.ok) {
    await logAiRiskEvent({
      userId: user.id,
      eventType: "model_error",
      assistant: assistantTitle,
      riskLevel: "medium",
      userMessage: sanitizedMessage,
      ipAddress: ip,
      metadata: {
        error: result.error,
        status: result.status,
        requestId: result.requestId || "",
      },
    });

    recordAiCall({
      userId: user.id,
      assistant: assistantTitle,
      model: providerConfig.appId,
      provider: "bailian-app",
      status: "error",
      httpStatus: result.status,
      errorCode: result.status === 401 ? "401" : result.status === 403 ? "403" : result.status === 429 ? "429" : result.status >= 500 ? "5xx" : "other",
      latencyMs,
      ipAddress: ip,
    });

    console.info(
      JSON.stringify({
        event: "enterprise_ai_chat",
        status: "error",
        requestId: result.requestId || "",
        userId: user.id,
        provider: "bailian-app",
        statusCode: result.status,
        latencyMs,
        usage: null,
      }),
    );

    return NextResponse.json(
      {
        success: false,
        error: buildSafeError(result.error, "Bailian service is temporarily unavailable."),
        sessionId: sessionId || undefined,
        requestId: result.requestId || "",
      },
      { status: result.status ?? 502 },
    );
  }

  const usageRecorded = await incrementAiUsage(user.id, assistantTitle);
  if (!usageRecorded) {
    return NextResponse.json(
      { success: false, error: "Daily limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  const moderated = moderateAiOutput(result.reply, result.reply);
  if (moderated.blocked) {
    await logAiRiskEvent({
      userId: user.id,
      eventType: "output_blocked",
      assistant: assistantTitle,
      riskLevel: "high",
      userMessage: sanitizedMessage,
      aiResponse: result.reply,
      ipAddress: ip,
      metadata: {
        reason: moderated.reason,
        requestId: result.requestId || "",
      },
    });

    recordAiCall({
      userId: user.id,
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

    console.info(
      JSON.stringify({
        event: "enterprise_ai_chat",
        status: "blocked",
        requestId: result.requestId || "",
        userId: user.id,
        provider: "bailian-app",
        statusCode: 400,
        latencyMs,
        usage: result.usage,
      }),
    );

    return NextResponse.json(
      { success: false, error: "This question cannot be answered safely right now. Please try a different phrasing.", requestId: result.requestId || "" },
      { status: 400 },
    );
  }

  const finalUsage = await getAiDailyUsage(user.id, assistantTitle);
  recordAiCall({
    userId: user.id,
    assistant: assistantTitle,
    model: providerConfig.appId,
    provider: "bailian-app",
    status: "success",
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs,
    ipAddress: ip,
  });

  console.info(
    JSON.stringify({
      event: "enterprise_ai_chat",
      status: "success",
      requestId: result.requestId || "",
      userId: user.id,
      provider: "bailian-app",
      statusCode: 200,
      latencyMs,
      usage: result.usage,
    }),
  );

  return NextResponse.json({
    success: true,
    reply: result.reply,
    sessionId: result.sessionId || sessionId || "",
    requestId: result.requestId || "",
    usage: finalUsage,
    providerMeta: {
      provider: "bailian-app",
      model: providerConfig.appId,
    },
  });
}



