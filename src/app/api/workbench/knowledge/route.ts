/**
 * 知识库 CRUD API
 * 支持 7 种资料类型：company / product / faq / brand_voice / customer_profile / sop / document
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

const VALID_CATEGORIES = [
  "company",
  "product",
  "faq",
  "brand_voice",
  "customer_profile",
  "sop",
  "document",
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  company: "公司资料",
  product: "产品资料",
  faq: "FAQ",
  brand_voice: "品牌语气",
  customer_profile: "客户画像",
  sop: "SOP",
  document: "文档资料",
};

function isValidCategory(cat: string): cat is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(cat);
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const activeOnly = searchParams.get("active") === "true";

  const where: Record<string, unknown> = { userId: user.id };
  if (category && isValidCategory(category)) {
    where.category = category;
  }
  if (activeOnly) {
    where.isActive = true;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const docs = await db.knowledgeDoc.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    docs: docs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      categoryLabel: d.category ? CATEGORY_LABELS[d.category] || d.category : "未分类",
      content: d.content,
      sourceType: d.sourceType,
      isActive: d.isActive,
      allowAiCitation: d.allowAiCitation,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    categories: VALID_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const category = typeof body.category === "string" ? body.category : "document";
  const isActive = body.isActive !== false;
  const allowAiCitation = body.allowAiCitation !== false;

  if (!title) {
    return NextResponse.json({ success: false, error: "标题不能为空。" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ success: false, error: "内容不能为空。" }, { status: 400 });
  }
  if (!isValidCategory(category)) {
    return NextResponse.json({ success: false, error: `无效的资料类型。可用值：${VALID_CATEGORIES.join("、")}` }, { status: 400 });
  }

  const doc = await db.knowledgeDoc.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      title,
      content,
      category,
      sourceType: "manual",
      isActive,
      allowAiCitation,
    },
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
