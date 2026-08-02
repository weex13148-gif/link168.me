import { NextResponse } from "next/server";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { getConfig, getMaskedConfig, updateConfig, type AppConfigValues } from "@/lib/app-config";
import { getJeepworkSessionUser, requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import {
  recordExternalServiceTest,
  sanitizeExternalServiceMessage,
} from "@/lib/external-service-readiness";
import {
  getEnterpriseAiSettingsUrlValidationError,
  resolveEnterpriseBailianConfig,
  validateEnterpriseAiSettingsPatch,
} from "@/lib/ai/enterprise-bailian";
import { callBailianApplication } from "@/lib/ai/providers/bailian-application";

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
  const resolved = resolveEnterpriseBailianConfig(config);

  if (!resolved.appId) {
    return apiError("BAD_BODY", "请先填写完整的百炼应用 App ID", 400);
  }
  if (!resolved.apiKey) {
    return apiError("BAD_BODY", "请先填写完整的百炼 API Key", 400);
  }

  const validationError = getEnterpriseAiSettingsUrlValidationError({
    aiBailianBaseUrl: resolved.baseUrl,
  });
  if (validationError) {
    return apiError(validationError.code, validationError.message, 400);
  }

  const startTime = Date.now();
  const result = await callBailianApplication(
    {
      appId: resolved.appId,
      apiKey: resolved.apiKey,
      baseUrl: resolved.baseUrl,
      timeoutMs: resolved.timeoutMs,
      workspaceId: resolved.dashscopeWorkspaceId || undefined,
    },
    "请只回复：连接测试成功",
  );
  const duration = Date.now() - startTime;

  if (!result.ok) {
    const safeError = sanitizeExternalServiceMessage(redactKeys(result.error));
    await recordExternalServiceTest("bailian", config, {
      passed: false,
      message: safeError,
    }).catch(() => undefined);

    return NextResponse.json(
      {
        success: false,
        data: {
          success: false,
          status: result.status,
          duration,
          requestId: result.requestId,
          error: safeError,
        } satisfies AiTestResult,
        error: null,
      },
      { status: 502 },
    );
  }

  try {
    await recordExternalServiceTest("bailian", config, {
      passed: true,
      message: "百炼应用真实连接测试成功",
    });
  } catch {
    return apiError(
      "READINESS_RECORD_FAILED",
      "百炼应用连接成功，但测试证据保存失败，请稍后重试。",
      500,
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      success: true,
      status: 200,
      model: result.usage?.modelId || config.aiModel,
      duration,
      promptTokens: result.usage?.inputTokens ?? undefined,
      completionTokens: result.usage?.outputTokens ?? undefined,
      totalTokens: result.usage?.totalTokens ?? undefined,
      requestId: result.requestId,
      message: "百炼应用连接测试成功",
    } satisfies AiTestResult,
    error: null,
  });
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
