/**
 * KnowledgeDoc 单条操作 API
 * 路径: /api/dashboard/knowledge/[id]
 *
 * 企业归属文档只能通过 Workspace API 访问；个人接口统一返回不存在。
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toKnowledgeDocDto } from "@/lib/dashboard-data";
import { hasSensitiveContent } from "@/lib/content-safety";
import { isWorkspaceOwnedResource } from "@/lib/workspace/resources";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CATEGORY_LENGTH = 30;
const VALID_SOURCE_TYPES = ["manual", "web", "document", "api"];

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

async function isPersonalKnowledgeDoc(userId: string, id: string) {
  if (await isWorkspaceOwnedResource("knowledge_doc", id)) return null;
  return db.knowledgeDoc.findFirst({ where: { id, userId } });
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const doc = await isPersonalKnowledgeDoc(user.id, id);
  if (!doc) {
    return NextResponse.json({ success: false, error: "文档不存在。" }, { status: 404 });
  }
  return NextResponse.json({ success: true, doc: toKnowledgeDocDto(doc) });
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await isPersonalKnowledgeDoc(user.id, id);
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

  const updated = await db.knowledgeDoc.update({
    where: { id },
    data: {
      title,
      category: safeCategory,
      content,
      sourceType,
      isActive: sanitizeBool(body.isActive, existing.isActive),
      allowAiCitation: sanitizeBool(body.allowAiCitation, existing.allowAiCitation),
    },
  });

  return NextResponse.json({ success: true, doc: toKnowledgeDocDto(updated) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await isPersonalKnowledgeDoc(user.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "文档不存在。" }, { status: 404 });
  }

  await db.knowledgeDoc.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
