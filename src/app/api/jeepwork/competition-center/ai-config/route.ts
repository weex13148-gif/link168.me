import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { AI_ASSISTANTS } from "@/lib/app-config";
import {
  getShowcaseAIConfig,
  saveShowcaseAIConfig,
} from "@/lib/showcase-v2";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function safeStringMap(value: unknown, max = 500): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.slice(0, max);
  }
  return out;
}

function safeQuestionsMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    out[k] = v
      .map((item) => (typeof item === "string" ? item.slice(0, 200) : ""))
      .filter((s) => s.length > 0)
      .slice(0, 12);
  }
  return out;
}

function safeBoolMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const config = await getShowcaseAIConfig();
  return NextResponse.json({ success: true, data: { config, assistants: AI_ASSISTANTS }, error: null });
}

export async function PUT(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权", 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  const next = await saveShowcaseAIConfig({
    enabled: body.enabled === true,
    allowFreeInput: body.allowFreeInput !== false,
    saveRecord: body.saveRecord === true,
    perVisitorLimit: Number(body.perVisitorLimit) || 0,
    dailyTotalLimit: Number(body.dailyTotalLimit) || 0,
    maxOutputLength: Number(body.maxOutputLength) || 0,
    timeoutMs: Number(body.timeoutMs) || 0,
    modelName: typeof body.modelName === "string" ? body.modelName : "",
    welcomeByAssistant: safeStringMap(body.welcomeByAssistant),
    suggestedQuestionsByAssistant: safeQuestionsMap(body.suggestedQuestionsByAssistant),
    assistantEnabled: safeBoolMap(body.assistantEnabled),
    updatedBy: actor.id,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: AUDIT_ACTION.UPDATE_SHOWCASE_AI_CONFIG,
    targetType: "showcase_ai_config",
    targetId: "competition",
    metadata: {
      enabled: next.enabled,
      perVisitorLimit: next.perVisitorLimit,
      dailyTotalLimit: next.dailyTotalLimit,
      maxOutputLength: next.maxOutputLength,
      timeoutMs: next.timeoutMs,
      modelName: next.modelName,
      allowFreeInput: next.allowFreeInput,
      saveRecord: next.saveRecord,
    },
    request,
    success: true,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data: { config: next, message: "AI 配置已更新" }, error: null });
}
