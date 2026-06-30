/**
 * KnowledgeDoc 单条操作 API
 * 路径: /api/dashboard/knowledge/[id]
 *
 * GET    /api/dashboard/knowledge/[id]  — 获取单条文档
 * PUT    /api/dashboard/knowledge/[id]  — 更新文档
 * DELETE /api/dashboard/knowledge/[id]  — 删除文档
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  newId,
  normalizeNullableString,
  toKnowledgeDocDto,
} from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CATEGORY_LENGTH = 30;
const VALID_SOURCE_TYPES = ["manual", "web", "document", "api"];

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1") return true;
  return fallback;
}

export async function GET(_request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(_request);
  if (response || !user) return response;
  const { id } = await context.params;

  const doc = await db.knowledgeDoc.findFirst({
    where: { id, userId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ success: false, error: "文档不存在。" }, { status: 404 });
  }
  return NextResponse.json({ success: true, doc: toKnowledgeDocDto(doc) });
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await db.knowledgeDoc.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "文档不存在。" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : existing.title;
  if (!title || hasSensitiveContent(title).detected) {
    return NextResponse.json({ success: false, error: "请输入有效标题。" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : existing.content;
  if (!content || content.length > MAX_CONTENT_LENGTH || hasSensitiveContent(content).detected) {
    return NextResponse.json({ success: false, error: "请输入有效内容。" }, { status: 400 });
  }

  const category = normalizeNullableString(body.category);
  const safeCategory = category && category.length <= MAX_CATEGORY_LENGTH ? category : existing.category;

  const rawSourceType = typeof body.sourceType === "string" ? body.sourceType.trim() : existing.sourceType;
  const sourceType = VALID_SOURCE_TYPES.includes(rawSourceType) ? rawSourceType : existing.sourceType;

  const isActive = sanitizeBool(body.isActive, existing.isActive);
  const allowAiCitation = sanitizeBool(body.allowAiCitation, existing.allowAiCitation);

  const updated = await db.knowledgeDoc.update({
    where: { id },
    data: { title, category: safeCategory, content, sourceType, isActive, allowAiCitation },
  });

  return NextResponse.json({ success: true, doc: toKnowledgeDocDto(updated) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(_request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await db.knowledgeDoc.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "文档不存在。" }, { status: 404 });
  }

  await db.knowledgeDoc.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
