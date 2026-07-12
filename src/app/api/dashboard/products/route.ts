/**
 * Products CRUD API
 * 路径: /api/dashboard/products
 *
 * 个人产品接口只处理个人资产。已登记为企业资源的产品即使保留创建人 userId，
 * 也必须从个人后台排除，避免成员离职后继续访问企业资产。
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, normalizeNullableString, toProductDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { checkLimitEntitlement } from "@/lib/billing/entitlements";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { getWorkspaceOwnedResourceIds } from "@/lib/workspace/resources";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;
const VALID_CATEGORIES = ["SaaS", "运营", "会员", "咨询", "硬件", "教育", "医疗", "金融", "零售", "其他"];

type CreateProductRequest = {
  name?: unknown;
  category?: unknown;
  description?: unknown;
  priceText?: unknown;
  coverImageUrl?: unknown;
  ctaLabel?: unknown;
  ctaUrl?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
  allowAiRecommendation?: unknown;
};

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

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const enterpriseProductIds = await getWorkspaceOwnedResourceIds("product");
  const products = await db.product.findMany({
    where: {
      userId: user.id,
      ...(enterpriseProductIds.length > 0 ? { id: { notIn: enterpriseProductIds } } : {}),
    },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, products: products.map(toProductDto) });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const productLimit = await checkLimitEntitlement(user.id, "products");
  if (!productLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: productLimit.reason || "已达到产品数量上限，升级会员可解锁更多。",
        upgradeRequired: true,
        limit: productLimit.limit,
        used: productLimit.used,
        remaining: productLimit.remaining,
      },
      { status: 403 },
    );
  }

  let body: CreateProductRequest;
  try {
    body = (await request.json()) as CreateProductRequest;
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
  const category = VALID_CATEGORIES.includes(rawCategory ?? "") ? rawCategory : "其他";
  const description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
  if (description && hasSensitiveContent(description).detected) {
    return NextResponse.json({ success: false, error: "产品描述包含受限关键词。" }, { status: 400 });
  }

  const coverImageUrlRaw = normalizeNullableString(body.coverImageUrl);
  const coverImageUrl = coverImageUrlRaw ? sanitizePublicUrl(coverImageUrlRaw).url ?? null : null;
  const ctaUrlRaw = normalizeNullableString(body.ctaUrl);
  const ctaUrl = ctaUrlRaw ? sanitizePublicUrl(ctaUrlRaw).url ?? null : null;

  const product = await db.product.create({
    data: {
      id: newId(),
      userId: user.id,
      name,
      category,
      description,
      priceText: normalizeNullableString(body.priceText),
      coverImageUrl,
      ctaLabel: normalizeNullableString(body.ctaLabel),
      ctaUrl,
      sortOrder: typeof body.sortOrder === "number" ? Math.max(0, Math.floor(body.sortOrder)) : 0,
      isActive: sanitizeBool(body.isActive, true),
      allowAiRecommendation: sanitizeBool(body.allowAiRecommendation, true),
    },
  });

  await revalidatePublicProfileByUser(user.id);
  return NextResponse.json({ success: true, product: toProductDto(product) }, { status: 201 });
}
