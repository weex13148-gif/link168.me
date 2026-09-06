import { NextResponse } from "next/server";

import { CurrentErrorCode } from "@/lib/current/contracts";
import { parseCurrentLeadCreateRequest } from "@/lib/current/leads/request";
import { getCurrentLeadRuntime } from "@/lib/current/leads/runtime";
import { createCurrentLeadService } from "@/lib/current/leads/service";

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
        error: "Invalid lead request body.",
      },
      { status: 400 },
    );
  }

  const parsed = parseCurrentLeadCreateRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        success: false,
        code: parsed.error.code,
        error: parsed.error.message,
      },
      { status: ERROR_STATUS[parsed.error.code] ?? 400 },
    );
  }

  const runtimeState = getCurrentLeadRuntime();
  if (!runtimeState?.persistence) {
    return NextResponse.json(
      {
        success: false,
        code: "DEPENDENCY_UNAVAILABLE",
        error: "Current lead persistence unavailable.",
      },
      { status: 503 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown";
  const service = createCurrentLeadService(runtimeState);
  const result = await service.createLead(parsed.value, {
    rateLimitKey: `${clientAddress}:${parsed.value.workspaceId}:${parsed.value.originPageId}`,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        code: result.error.code,
        error: result.error.message,
      },
      { status: ERROR_STATUS[result.error.code] ?? 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      lead: result.value,
    },
    { status: 201 },
  );
}
