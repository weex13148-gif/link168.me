import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toKnowledgeDocDto } from "@/lib/dashboard-data";
import { hasSensitiveContent } from "@/lib/content-safety";
import {
  WorkspaceResourceError,
  assertWorkspaceAssignee,
  assertWorkspaceResourceAccess,
} from "@/lib/workspace/resources";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string; docId: string }> };

const VALID_SOURCE_TYPES = ["manual", "web", "document", "api"];

function sanitizeBool(raw: unknown, fallback: boolean) {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceResourceError) {
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json(
    { success: false, error: "企业知识文档暂时不可用。", code: "WORKSPACE_KNOWLEDGE_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, docId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "knowledge_doc",
      resourceId: docId,
    });
    const doc = await db.knowledgeDoc.findUnique({ where: { id: docId } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "企业知识文档不存在。" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      doc: { ...toKnowledgeDocDto(doc), workspaceId, assignedToUserId: mapping.assignedToUserId },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, docId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "knowledge_doc",
      resourceId: docId,
      manage: true,
    });
    const existing = await db.knowledgeDoc.findUnique({ where: { id: docId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "企业知识文档不存在。" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const title = body.title === undefined
      ? existing.title
      : typeof body.title === "string"
        ? body.title.trim().slice(0, 100)
        : "";
    if (!title || hasSensitiveContent(title).detected) {
      return NextResponse.json({ success: false, error: "请输入有效文档标题。" }, { status: 400 });
    }
    const content = body.content === undefined
      ? existing.content
      : typeof body.content === "string"
        ? body.content.trim()
        : "";
    if (!content || content.length > 50_000 || hasSensitiveContent(content).detected) {
      return NextResponse.json({ success: false, error: "请输入有效文档内容，且不超过50000字。" }, { status: 400 });
    }
    const category = body.category === undefined ? existing.category : normalizeNullableString(body.category);
    const safeCategory = category && category.length <= 30 ? category : null;
    const rawSourceType = body.sourceType === undefined
      ? existing.sourceType
      : typeof body.sourceType === "string"
        ? body.sourceType.trim()
        : existing.sourceType;
    const sourceType = VALID_SOURCE_TYPES.includes(rawSourceType) ? rawSourceType : existing.sourceType;
    const assignedToUserId = body.assignedToUserId === undefined
      ? mapping.assignedToUserId
      : typeof body.assignedToUserId === "string" && body.assignedToUserId
        ? body.assignedToUserId
        : null;
    await assertWorkspaceAssignee(workspaceId, assignedToUserId);

    const updated = await db.$transaction(async (tx) => {
      const doc = await tx.knowledgeDoc.update({
        where: { id: docId },
        data: {
          title,
          category: safeCategory,
          content,
          sourceType,
          isActive: sanitizeBool(body.isActive, existing.isActive),
          allowAiCitation: sanitizeBool(body.allowAiCitation, existing.allowAiCitation),
        },
      });
      await tx.workspaceResource.update({
        where: { id: mapping.id },
        data: { assignedToUserId },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.knowledge.updated",
          targetType: "knowledge_doc",
          targetId: docId,
          metadata: { assignedToUserId },
        },
      });
      return doc;
    });

    return NextResponse.json({
      success: true,
      doc: { ...toKnowledgeDocDto(updated), workspaceId, assignedToUserId },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, docId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "knowledge_doc",
      resourceId: docId,
      manage: true,
    });
    const existing = await db.knowledgeDoc.findUnique({ where: { id: docId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "企业知识文档不存在。" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.workspaceResource.delete({ where: { id: mapping.id } });
      await tx.knowledgeDoc.delete({ where: { id: docId } });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.knowledge.deleted",
          targetType: "knowledge_doc",
          targetId: docId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
