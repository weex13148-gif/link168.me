/**
 * 知识库单条操作 API（编辑、启用/停用、删除）
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const VALID_CATEGORIES = ["company", "product", "faq", "brand_voice", "customer_profile", "sop", "document"];

const CATEGORY_LABELS: Record<string, string> = {
  company: "公司资料",
  product: "产品资料",
  faq: "FAQ",
  brand_voice: "品牌语气",
  customer_profile: "客户画像",
  sop: "SOP",
  document: "文档资料",
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const doc = await db.knowledgeDoc.findFirst({
    where: { id, userId: user.id },
  });

  if (!doc) {
    return NextResponse.json({ success: false, error: "资料不存在或无权访问。" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    doc: {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      categoryLabel: doc.category ? CATEGORY_LABELS[doc.category] || doc.category : "未分类",
      content: doc.content,
      sourceType: doc.sourceType,
      isActive: doc.isActive,
      allowAiCitation: doc.allowAiCitation,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const existing = await db.knowledgeDoc.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "资料不存在或无权访问。" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (typeof body.content === "string") {
    data.content = body.content;
  }
  if (typeof body.category === "string" && VALID_CATEGORIES.includes(body.category)) {
    data.category = body.category;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (typeof body.allowAiCitation === "boolean") {
    data.allowAiCitation = body.allowAiCitation;
  }

  const doc = await db.knowledgeDoc.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    success: true,
    doc: {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      categoryLabel: doc.category ? CATEGORY_LABELS[doc.category] || doc.category : "未分类",
      content: doc.content,
      sourceType: doc.sourceType,
      isActive: doc.isActive,
      allowAiCitation: doc.allowAiCitation,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const result = await db.knowledgeDoc.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "资料不存在或无权删除。" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
