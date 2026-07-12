/**
 * Knowledge Docs CRUD API
 * 路径: /api/dashboard/knowledge
 *
 * 个人知识库接口只处理个人资产。企业知识文档由 Workspace API 管理。
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, normalizeNullableString, toKnowledgeDocDto } from "@/lib/dashboard-data";
import { hasSensitiveContent } from "@/lib/content-safety";
import { checkLimitEntitlement } from "@/lib/billing/entitlements";
import { getWorkspaceOwnedResourceIds } from "@/lib/workspace/resources";

export const runtime = "nodejs";

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CATEGORY_LENGTH = 30;
const VALID_SOURCE_TYPES = ["manual", "web", "document", "api"];

type CreateDocRequest = {
  title?: unknown;
  category?: unknown;
  content?: unknown;
  sourceType?: unknown;
  isActive?: unknown;
  allowAiCitation?: unknown;
};

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const enterpriseDocIds = await getWorkspaceOwnedResourceIds("knowledge_doc");
  const docs = await db.knowledgeDoc.findMany({
    where: {
      userId: user.id,
      ...(enterpriseDocIds.length > 0 ? { id: { notIn: enterpriseDocIds } } : {}),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, docs: docs.map(toKnowledgeDocDto) });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const knowledgeLimit = await checkLimitEntitlement(user.id, "knowledgeDocs");
  if (!knowledgeLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: knowledgeLimit.reason || "已达到知识库文档数量上限，升级会员可解锁更多。",
        upgradeRequired: true,
        limit: knowledgeLimit.limit,
        used: knowledgeLimit.used,
        remaining: knowledgeLimit.remaining,
      },
      { status: 403 },
    );
  }

  let body: CreateDocRequest;
  try {
    body = (await request.json()) as CreateDocRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) {
    return NextResponse.json({ success: false, error: "请输入文档标题。" }, { status: 400 });
  }
  if (hasSensitiveContent(title).detected) {
    return NextResponse.json({ success: false, error: "标题包含受限关键词。" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ success: false, error: "请输入文档内容。" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ success: false, error: `内容不能超过 ${MAX_CONTENT_LENGTH} 字。` }, { status: 400 });
  }
  if (hasSensitiveContent(content).detected) {
    return NextResponse.json({ success: false, error: "内容包含受限关键词。" }, { status: 400 });
  }

  const category = normalizeNullableString(body.category);
  const safeCategory = category && category.length <= MAX_CATEGORY_LENGTH ? category : null;
  const rawSourceType = typeof body.sourceType === "string" ? body.sourceType.trim() : "manual";
  const sourceType = VALID_SOURCE_TYPES.includes(rawSourceType) ? rawSourceType : "manual";

  const doc = await db.knowledgeDoc.create({
    data: {
      id: newId(),
      userId: user.id,
      title,
      category: safeCategory,
      content,
      sourceType,
      isActive: sanitizeBool(body.isActive, true),
      allowAiCitation: sanitizeBool(body.allowAiCitation, true),
    },
  });

  return NextResponse.json({ success: true, doc: toKnowledgeDocDto(doc) }, { status: 201 });
}
