import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toKnowledgeDocDto } from "@/lib/dashboard-data";
import { hasSensitiveContent } from "@/lib/content-safety";
import {
  WorkspaceResourceError,
  assertWorkspaceAssignee,
  assertWorkspaceResourceManager,
  listVisibleWorkspaceResourceMappings,
} from "@/lib/workspace/resources";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string }> };

type CreateKnowledgeRequest = {
  title?: unknown;
  category?: unknown;
  content?: unknown;
  sourceType?: unknown;
  isActive?: unknown;
  allowAiCitation?: unknown;
  assignedToUserId?: unknown;
};

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
    { success: false, error: "企业知识库暂时不可用。", code: "WORKSPACE_KNOWLEDGE_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  try {
    const mappings = await listVisibleWorkspaceResourceMappings({
      workspaceId,
      userId: user.id,
      resourceType: "knowledge_doc",
    });
    const docs = await db.knowledgeDoc.findMany({
      where: { id: { in: mappings.map((item) => item.resourceId) } },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    const mappingByResource = new Map(mappings.map((item) => [item.resourceId, item]));
    return NextResponse.json({
      success: true,
      docs: docs.map((doc) => ({
        ...toKnowledgeDocDto(doc),
        assignedToUserId: mappingByResource.get(doc.id)?.assignedToUserId ?? null,
        workspaceId,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  try {
    await assertWorkspaceResourceManager(workspaceId, user.id);

    let body: CreateKnowledgeRequest;
    try {
      body = (await request.json()) as CreateKnowledgeRequest;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : "";
    if (!title || hasSensitiveContent(title).detected) {
      return NextResponse.json({ success: false, error: "请输入有效文档标题。" }, { status: 400 });
    }
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 50_000 || hasSensitiveContent(content).detected) {
      return NextResponse.json({ success: false, error: "请输入有效文档内容，且不超过50000字。" }, { status: 400 });
    }
    const category = normalizeNullableString(body.category);
    const safeCategory = category && category.length <= 30 ? category : null;
    const rawSourceType = typeof body.sourceType === "string" ? body.sourceType.trim() : "manual";
    const sourceType = VALID_SOURCE_TYPES.includes(rawSourceType) ? rawSourceType : "manual";
    const assignedToUserId = typeof body.assignedToUserId === "string" && body.assignedToUserId
      ? body.assignedToUserId
      : null;
    await assertWorkspaceAssignee(workspaceId, assignedToUserId);

    const docId = crypto.randomUUID();
    const doc = await db.$transaction(async (tx) => {
      const created = await tx.knowledgeDoc.create({
        data: {
          id: docId,
          userId: user.id,
          title,
          category: safeCategory,
          content,
          sourceType,
          isActive: sanitizeBool(body.isActive, true),
          allowAiCitation: sanitizeBool(body.allowAiCitation, true),
        },
      });
      await tx.workspaceResource.create({
        data: {
          workspaceId,
          resourceType: "knowledge_doc",
          resourceId: docId,
          createdByUserId: user.id,
          assignedToUserId,
          status: "active",
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.knowledge.created",
          targetType: "knowledge_doc",
          targetId: docId,
          metadata: { assignedToUserId },
        },
      });
      return created;
    });

    return NextResponse.json(
      { success: true, doc: { ...toKnowledgeDocDto(doc), workspaceId, assignedToUserId } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
