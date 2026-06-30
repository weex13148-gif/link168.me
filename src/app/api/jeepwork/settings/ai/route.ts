import { NextResponse } from "next/server";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { getConfig, getMaskedConfig, updateConfig, type AppConfigValues } from "@/lib/app-config";
import { getJeepworkSessionUser, requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import {
  getEnterpriseAiSettingsUrlValidationError,
  validateEnterpriseAiSettingsPatch,
} from "@/lib/ai/enterprise-bailian";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function redactKeys(message: string) {
  if (!message) return message;
  return message
    .replace(/sk-[A-Za-z0-9_\-]{4,}/g, "sk-****")
    .replace(/Bearer\s+[A-Za-z0-9_\-.]{4,}/gi, "Bearer ****");
}

type AiTestResult = {
  success: boolean;
  status?: number;
  model?: string;
  duration?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestId?: string;
  error?: string;
  message?: string;
};

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const config = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    data: { config },
    error: null,
  });
}

export async function PUT(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: Partial<Record<keyof AppConfigValues, unknown>>;
  try {
    body = (await request.json()) as Partial<Record<keyof AppConfigValues, unknown>>;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  const validated = validateEnterpriseAiSettingsPatch(body);
  const validationError = getEnterpriseAiSettingsUrlValidationError(validated);
  if (validationError) {
    return apiError(validationError.code, validationError.message, 400);
  }

  try {
    await updateConfig(validated);
  } catch (error) {
    const message = redactKeys(error instanceof Error ? error.message : String(error));
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
      targetType: "system_config",
      targetId: "app-config",
      metadata: { section: "ai", updatedKeys: Object.keys(validated), reason: message },
      request,
      success: false,
    });
    return apiError("DB_ERROR", `保存配置失败：${message}`, 500);
  }

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
    targetType: "system_config",
    targetId: "app-config",
    metadata: { section: "ai", updatedKeys: Object.keys(validated) },
    request,
    success: true,
  });

  const config = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    data: { config, updatedKeys: Object.keys(validated), message: "配置已更新（敏感字段已脱敏）" },
    error: null,
  });
}

async function handleTestAiConnection(): Promise<NextResponse> {
  const config = await getConfig();
  if (!config.aiApiKey) {
    return apiError("BAD_BODY", "请先填写完整 AI API Key", 400);
  }

  const baseUrl = config.aiBaseUrl.endsWith("/") ? config.aiBaseUrl.slice(0, -1) : config.aiBaseUrl;
  const validationError = getEnterpriseAiSettingsUrlValidationError({ aiBaseUrl: baseUrl });
  if (validationError) {
    return apiError(validationError.code, validationError.message, 400);
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutMs = 45000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 50,
        temperature: 0.3,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const duration = Date.now() - startTime;
    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          data: {
            success: false,
            status: response.status,
            error: `AI 服务返回错误（${response.status}）：${errorText.slice(0, 200)}`,
          } satisfies AiTestResult,
          error: null,
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      id?: string;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        status: response.status,
        model: data.model || config.aiModel,
        duration,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        requestId: data.id,
        message: "AI 连接测试成功",
      } satisfies AiTestResult,
      error: null,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    clearTimeout(timer);
    const message = redactKeys(error instanceof Error ? error.message : "无法连接 AI 服务");
    return NextResponse.json(
      {
        success: false,
        data: {
          success: false,
          duration,
          error: `AI 连接测试失败：${message}`,
        } satisfies AiTestResult,
        error: null,
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  switch (body.action) {
    case "test-ai-connection":
      return handleTestAiConnection();
    default:
      return apiError("BAD_BODY", "未知操作", 400);
  }
}
