import { NextRequest, NextResponse } from "next/server";
import { SHOWCASE_COOKIE_NAME, getShowcaseConfig, hasValidShowcaseCookie } from "@/lib/showcase";
import { AI_ASSISTANTS } from "@/lib/app-config";
import { getShowcaseAIConfig, runShowcaseDemo } from "@/lib/showcase-v2";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { createAiTraceContext, setTraceIdOnNextResponse, logAiTraceInfo } from "@/lib/observability/ai-trace";
import { recordAiMetrics, recordSafetyRejection } from "@/lib/observability/ai-metrics";
import { type AiErrorCode } from "@/lib/ai/provider-error";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400, traceId?: string) {
  const resp = NextResponse.json(
    { success: false, data: null, error: { code, message, ...(traceId ? { traceId } : {}) } },
    { status },
  );
  if (traceId) setTraceIdOnNextResponse(resp, traceId);
  return resp;
}

function isAssistant(value: unknown): value is keyof typeof AI_ASSISTANTS {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AI_ASSISTANTS, value);
}

function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const traceCtx = createAiTraceContext({ headers: request.headers, requestSource: "showcase:ai-demo" });
  logAiTraceInfo(traceCtx, "ai_request_received");

  const ip = clientIp(request.headers);

  const config = await getShowcaseConfig();
  const authed = hasValidShowcaseCookie(request.cookies.get(SHOWCASE_COOKIE_NAME)?.value, config);
  if (!config.enabled || !authed) {
    return apiError("NOT_AUTHORIZED", "未授权", 404, traceCtx.traceId);
  }
  const aiCfg = await getShowcaseAIConfig();
  if (!aiCfg.enabled || !aiCfg.apiKeyConfigured) {
    return apiError("AI_DISABLED", "AI 演示暂未开启", 503, traceCtx.traceId);
  }

  let body: { assistant?: unknown; question?: unknown; sourcePage?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400, traceCtx.traceId);
  }
  if (!isAssistant(body.assistant)) return apiError("BAD_ASSISTANT", "未知 AI 助手", 400, traceCtx.traceId);
  if (!aiCfg.assistantEnabled[body.assistant]) return apiError("ASSISTANT_DISABLED", "该 AI 助手已关闭", 400, traceCtx.traceId);
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (aiCfg.allowFreeInput) {
    if (!question) return apiError("EMPTY_QUESTION", "问题不能为空", 400, traceCtx.traceId);
    if (question.length > 600) return apiError("QUESTION_TOO_LONG", "问题长度超过 600 字", 400, traceCtx.traceId);
  } else {
    // 自由输入关闭：仅允许选择推荐问题
    const suggestions = aiCfg.suggestedQuestionsByAssistant[body.assistant] || [];
    if (!suggestions.includes(question)) {
      return apiError("FREE_INPUT_DISABLED", "当前仅允许点击预设问题", 400, traceCtx.traceId);
    }
  }

  const result = await runShowcaseDemo({
    headers: request.headers,
    assistant: body.assistant,
    question,
    sourcePage: typeof body.sourcePage === "string" ? body.sourcePage.slice(0, 200) : "/showcase",
  });

  // 比赛访问审计：成功 / 失败 / 超额都记录
  await writeAdminAuditLog({
    actorUserId: undefined,
    actorEmail: `visitor:${clientIp(request.headers)}`,
    actorRole: "visitor",
    action: AUDIT_ACTION.TOGGLE_SHOWCASE_DEMO,
    targetType: "showcase_ai_demo",
    targetId: body.assistant,
    metadata: {
      assistant: body.assistant,
      success: result.ok,
      latencyMs: result.latencyMs,
      errorCode: result.errorCode,
      blocked: result.blocked,
      reason: result.blockedReason,
    },
    request,
    success: result.ok,
  }).catch(() => undefined);

  if (!result.ok) {
    recordAiMetrics({
      traceCtx,
      userId: "showcase-demo",
      usageType: "showcase_demo",
      success: false,
      errorCode: (result.blocked ? "AI_RATE_LIMITED" : "AI_PROVIDER_FAILED") as AiErrorCode,
      httpStatus: result.blocked ? 429 : 502,
      ipAddress: ip,
    });
    const resp = NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: result.errorCode || "AI_FAILED",
          message: result.errorMessage || "AI 调用失败",
          latencyMs: result.latencyMs,
          blocked: result.blocked,
          reason: result.blockedReason,
          traceId: traceCtx.traceId,
        },
      },
      { status: result.blocked ? 429 : 502 },
    );
    setTraceIdOnNextResponse(resp, traceCtx.traceId);
    return resp;
  }

  // 数据库级限流由 runShowcaseDemo 内部的 checkDemoQuota 统一处理
  recordAiMetrics({
    traceCtx,
    userId: "showcase-demo",
    usageType: "showcase_demo",
    provider: result.modelName ?? "bailian",
    model: result.modelName ?? null,
    inputTokens: result.inputTokens ?? 0,
    outputTokens: result.outputTokens ?? 0,
    durationMs: result.latencyMs,
    success: true,
    errorCode: null,
    httpStatus: 200,
    ipAddress: ip,
    assistant: typeof body?.assistant === "string" ? body.assistant : "showcase",
  });
  const resp = NextResponse.json({
    success: true,
    data: {
      response: result.response,
      latencyMs: result.latencyMs,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      assistant: body.assistant,
      traceId: traceCtx.traceId,
    },
    error: null,
  });
  setTraceIdOnNextResponse(resp, traceCtx.traceId);
  return resp;
}
