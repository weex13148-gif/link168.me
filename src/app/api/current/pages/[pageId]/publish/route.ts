import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { CurrentErrorCode } from "@/lib/current/contracts";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getCurrentPageContext } from "@/lib/current/page-service";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new PrismaCurrentPageRepository();
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

function errorResponse(result: { error: { code: CurrentErrorCode; message: string } }) {
  return NextResponse.json(
    { success: false, code: result.error.code, error: result.error.message },
    { status: ERROR_STATUS[result.error.code] ?? 500 },
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 });
  }

  const context = await getCurrentPageContext(user.id, pageId, "mutation");
  if (!context.ok) return errorResponse(context);

  let payload: { idempotencyKey?: unknown } = {};
  try {
    payload = (await request.json()) as { idempotencyKey?: unknown };
  } catch {
    // 空请求体允许使用服务端生成的幂等键。
  }
  const headerKey = request.headers.get("x-idempotency-key")?.trim();
  const bodyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "";
  const idempotencyKey = headerKey || bodyKey || randomUUID();
  const result = await repository.publish({ pageId, actor: context.value.actor, idempotencyKey });
  if (!result.ok) return errorResponse(result);

  return NextResponse.json({
    success: true,
    publication: result.value,
    message: "Published 已更新，Draft 仍保留为下一次编辑起点。",
  });
}
