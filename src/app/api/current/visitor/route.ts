import { NextResponse } from "next/server";

import { CurrentErrorCode } from "@/lib/current/contracts";
import { createEnvCurrentVisitorAiProvider } from "@/lib/current/ai/provider";
import { parseCurrentVisitorAiChatRequest } from "@/lib/current/ai/request";
import { getCurrentVisitorAiRuntime } from "@/lib/current/ai/runtime";
import { createCurrentVisitorAiService } from "@/lib/current/ai/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<CurrentErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_STATE: 409,
  IDEMPOTENCY_ERROR: 409,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  TIMEOUT: 504,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  DEPENDENCY_UNAVAILABLE: 503,
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid visitor AI request body.",
        directFormFallbackAvailable: true,
      },
      { status: 400 },
    );
  }

  const parsed = parseCurrentVisitorAiChatRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        success: false,
        code: parsed.error.code,
        error: parsed.error.message,
        directFormFallbackAvailable: true,
      },
      { status: ERROR_STATUS[parsed.error.code] ?? 400 },
    );
  }

  const runtimeState = getCurrentVisitorAiRuntime();
  const provider = runtimeState?.provider ?? createEnvCurrentVisitorAiProvider();
  const providerStatus = provider.getStatus();

  const service = createCurrentVisitorAiService({
    pageRepository: runtimeState.pageRepository,
    provider,
    audit: runtimeState.audit,
  });

  const result = await service.chat(parsed.value);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        code: result.error.code,
        error: result.error.message,
        providerStatus,
        directFormFallbackAvailable: true,
      },
      { status: ERROR_STATUS[result.error.code] ?? 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...result.value,
      providerStatus: { available: true, code: null },
      directFormFallbackAvailable: true,
    },
  });
}
