import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { AI_ASSISTANTS, type AiAssistantKey } from "@/lib/app-config";
import {
  createPromptDraft,
  listPromptDrafts,
  publishPromptDraft,
  runShowcaseDebug,
} from "@/lib/showcase-v2";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function isAssistant(value: unknown): value is AiAssistantKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AI_ASSISTANTS, value);
}

export async function GET(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const url = new URL(request.url);
  const assistantParam = url.searchParams.get("assistant");
  const assistant = isAssistant(assistantParam) ? assistantParam : null;
  const drafts = await listPromptDrafts(assistant || undefined, 30);
  return NextResponse.json({ success: true, data: { drafts, assistants: AI_ASSISTANTS }, error: null });
}

export async function POST(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权", 401);

  let body: { action?: unknown; assistant?: unknown; systemPrompt?: unknown; question?: unknown; modelName?: unknown; configVersion?: unknown; saveLog?: unknown; title?: unknown; welcomeText?: unknown; suggestedQuestions?: unknown; version?: unknown; draftId?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  switch (body.action) {
    case "test": {
      if (!isAssistant(body.assistant)) return apiError("BAD_ASSISTANT", "未知 AI 助手", 400);
      const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
      const question = typeof body.question === "string" ? body.question : "";
      if (!systemPrompt) return apiError("EMPTY_PROMPT", "系统提示词不能为空", 400);
      if (!question) return apiError("EMPTY_QUESTION", "测试问题不能为空", 400);
      const result = await runShowcaseDebug({
        debuggerId: actor.id,
        debuggerEmail: actor.email,
        assistant: body.assistant,
        systemPrompt,
        question,
        modelName: typeof body.modelName === "string" ? body.modelName : undefined,
        configVersion: typeof body.configVersion === "string" ? body.configVersion : undefined,
        saveLog: body.saveLog !== false,
      });
      await writeAdminAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: AUDIT_ACTION.RUN_SHOWCASE_AI_DEBUG,
        targetType: "showcase_ai_debug",
        targetId: body.assistant,
        metadata: {
          assistant: body.assistant,
          success: result.ok,
          latencyMs: result.latencyMs,
          errorCode: result.errorCode,
          logId: result.logId,
          saveLog: body.saveLog !== false,
        },
        request,
        success: result.ok,
      }).catch(() => undefined);
      if (!result.ok) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: result.errorCode || "AI_FAILED",
              message: result.errorMessage || "AI 调用失败",
              latencyMs: result.latencyMs,
            },
          },
          { status: 502 },
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          response: result.response,
          latencyMs: result.latencyMs,
          modelName: result.modelName,
          configVersion: result.configVersion,
          logId: result.logId,
        },
        error: null,
      });
    }
    case "save-draft": {
      if (!isAssistant(body.assistant)) return apiError("BAD_ASSISTANT", "未知 AI 助手", 400);
      const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
      const title = typeof body.title === "string" ? body.title : "未命名草稿";
      const welcomeText = typeof body.welcomeText === "string" ? body.welcomeText : "";
      const version = typeof body.version === "string" && body.version.trim() ? body.version : "0.1.0";
      const suggested = Array.isArray(body.suggestedQuestions)
        ? body.suggestedQuestions.filter((q): q is string => typeof q === "string").slice(0, 12)
        : [];
      if (!systemPrompt) return apiError("EMPTY_PROMPT", "系统提示词不能为空", 400);
      const draft = await createPromptDraft({
        assistant: body.assistant,
        title,
        systemPrompt,
        welcomeText,
        suggestedQuestions: suggested,
        published: false,
        version,
        authorId: actor.id,
        authorEmail: actor.email,
      });
      await writeAdminAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: AUDIT_ACTION.PUBLISH_SHOWCASE_PROMPT,
        targetType: "showcase_prompt_draft",
        targetId: draft.id,
        metadata: { assistant: body.assistant, version, action: "save_draft", title },
        request,
        success: true,
      }).catch(() => undefined);
      return NextResponse.json({ success: true, data: { draft }, error: null });
    }
    case "publish-draft": {
      if (typeof body.draftId !== "string" || !body.draftId) return apiError("BAD_DRAFT", "缺少 draftId", 400);
      const draft = await publishPromptDraft(body.draftId);
      if (!draft) return apiError("NOT_FOUND", "草稿不存在", 404);
      await writeAdminAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: AUDIT_ACTION.PUBLISH_SHOWCASE_PROMPT,
        targetType: "showcase_prompt_draft",
        targetId: draft.id,
        metadata: { assistant: draft.assistant, version: draft.version, action: "publish_draft" },
        request,
        success: true,
      }).catch(() => undefined);
      return NextResponse.json({ success: true, data: { draft }, error: null });
    }
    default:
      return apiError("BAD_ACTION", "未知操作", 400);
  }
}
