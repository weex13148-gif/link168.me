/**
 * Product 单条操作 API
 * 路径: /api/dashboard/products/[id]
 *
 * 企业归属产品只能通过 Workspace API 访问；个人接口统一返回不存在。
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toProductDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { isWorkspaceOwnedResource } from "@/lib/workspace/resources";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;
const VALID_CATEGORIES = ["SaaS", "运营", "会员", "咨询", "硬件", "教育", "医疗", "金融", "零售", "其他"];

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeString(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  return sanitizePublicText(raw.trim().slice(0, maxLen)) ?? "";
}

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

async function isPersonalProduct(userId: string, id: string) {
  if (await isWorkspaceOwnedResource("product", id)) return null;
  return db.product.findFirst({ where: { id, userId } });
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const product = await isPersonalProduct(user.id, id);
  if (!product) {
    return NextResponse.json({ success: false, error: "产品不存在。" }, { status: 404 });
  }
  return NextResponse.json({ success: true, product: toProductDto(product) });
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await isPersonalProduct(user.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "产品不存在。" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const name = sanitizeString(body.name, MAX_NAME_LENGTH);
  if (!name) {
    return NextResponse.json({ success: false, error: "请输入产品名称。" }, { status: 400 });
  }
  if (hasSensitiveContent(name).detected) {
    return NextResponse.json({ success: false, error: "产品名称包含受限关键词。" }, { status: 400 });
  }

  const rawCategory = normalizeNullableString(body.category);
  const category = VALID_CATEGORIES.includes(rawCategory ?? "") ? rawCategory : existing.category;
  const description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
  if (description && hasSensitiveContent(description).detected) {
    return NextResponse.json({ success: false, error: "产品描述包含受限关键词。" }, { status: 400 });
  }

  const coverImageUrlRaw = normalizeNullableString(body.coverImageUrl);
  const coverImageUrl = coverImageUrlRaw ? sanitizePublicUrl(coverImageUrlRaw).url ?? null : existing.coverImageUrl;
  const ctaUrlRaw = normalizeNullableString(body.ctaUrl);
  const ctaUrl = ctaUrlRaw ? sanitizePublicUrl(ctaUrlRaw).url ?? null : existing.ctaUrl;

  const updated = await db.product.update({
    where: { id },
    data: {
      name,
      category,
      description,
      priceText: normalizeNullableString(body.priceText),
      coverImageUrl,
      ctaLabel: normalizeNullableString(body.ctaLabel),
      ctaUrl,
      sortOrder: typeof body.sortOrder === "number" ? Math.max(0, Math.floor(body.sortOrder)) : existing.sortOrder,
      isActive: sanitizeBool(body.isActive, existing.isActive),
      allowAiRecommendation: sanitizeBool(body.allowAiRecommendation, existing.allowAiRecommendation),
    },
  });

  await revalidatePublicProfileByUser(user.id);
  return NextResponse.json({ success: true, product: toProductDto(updated) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { id } = await context.params;

  const existing = await isPersonalProduct(user.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "产品不存在。" }, { status: 404 });
  }

  await db.product.delete({ where: { id } });
  await revalidatePublicProfileByUser(user.id);
  return NextResponse.json({ success: true });
}
