import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { CurrentErrorCode, CurrentPageDraftSnapshot } from "@/lib/current/contracts";
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

async function resolve(request: Request, pageId: string, mode: "read" | "mutation") {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return { response: NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 }) };
  }
  const context = await getCurrentPageContext(user.id, pageId, mode);
  if (!context.ok) return { response: errorResponse(context) };
  return { user, context: context.value };
}

export async function GET(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const resolved = await resolve(request, pageId, "read");
  if ("response" in resolved) return resolved.response;

  const draft = await repository.getDraft(pageId);
  if (!draft.ok) return errorResponse(draft);
  const publication = await repository.getPublication(pageId);
  return NextResponse.json({
    success: true,
    draft: draft.value,
    publicationStatus: publication.ok ? publication.value.status : "draft_only",
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const resolved = await resolve(request, pageId, "mutation");
  if ("response" in resolved) return resolved.response;

  let payload: { document?: unknown };
  try {
    payload = (await request.json()) as { document?: unknown };
  } catch {
    return NextResponse.json({ success: false, code: "VALIDATION_ERROR", error: "Draft 请求体不是合法 JSON。" }, { status: 400 });
  }
  if (!payload.document || typeof payload.document !== "object") {
    return NextResponse.json({ success: false, code: "VALIDATION_ERROR", error: "Draft document 不能为空。" }, { status: 400 });
  }

  const existing = await repository.getDraft(pageId);
  const snapshot: CurrentPageDraftSnapshot = {
    page: resolved.context.page,
    draftId: existing.ok ? existing.value.draftId : randomUUID(),
    revision: existing.ok ? existing.value.revision + 1 : 1,
    updatedAt: new Date().toISOString(),
    document: payload.document as CurrentPageDraftSnapshot["document"],
  };
  const saved = await repository.saveDraft(snapshot);
  if (!saved.ok) return errorResponse(saved);
  return NextResponse.json({ success: true, draft: saved.value });
}
