/**
 * Products CRUD API
 * 路径: /api/dashboard/products
 *
 * GET    /api/dashboard/products          — 列出当前用户所有产品
 * POST   /api/dashboard/products        — 新增产品
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOwnedProfile,
  newId,
  normalizeNullableString,
  toProductDto,
} from "@/lib/dashboard-data";
import {
  hasSensitiveContent,
  sanitizePublicText,
} from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { checkLimitEntitlement } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;
const MAX_CATEGORY_LENGTH = 30;
const VALID_CATEGORIES = [
  "SaaS",
  "运营",
  "会员",
  "咨询",
  "硬件",
  "教育",
  "医疗",
  "金融",
  "零售",
  "其他",
];

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

function sanitizeString(
  raw: unknown,
  maxLen: number
): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().slice(0, maxLen);
  return sanitizePublicText(trimmed) ?? "";
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

  const products = await db.product.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    products: products.map(toProductDto),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  // ===== P0: 服务端校验产品数量上限（防止免费用户绕过前端限制）=====
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
    return NextResponse.json(
      { success: false, error: "请求格式不正确。" },
      { status: 400 }
    );
  }

  // 名称校验
  const name = sanitizeString(body.name, MAX_NAME_LENGTH);
  if (!name) {
    return NextResponse.json(
      { success: false, error: "请输入产品名称。" },
      { status: 400 }
    );
  }
  if (hasSensitiveContent(name).detected) {
    return NextResponse.json(
      { success: false, error: "产品名称包含受限关键词。" },
      { status: 400 }
    );
  }

  // 类目校验
  const rawCategory = normalizeNullableString(body.category);
  const category = VALID_CATEGORIES.includes(rawCategory ?? "")
    ? rawCategory
    : "其他";

  // 描述校验
  const description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
  if (description && hasSensitiveContent(description).detected) {
    return NextResponse.json(
      { success: false, error: "产品描述包含受限关键词。" },
      { status: 400 }
    );
  }

  // 封面图 URL
  const coverImageUrlRaw = normalizeNullableString(body.coverImageUrl);
  const coverImageUrl = coverImageUrlRaw
    ? sanitizePublicUrl(coverImageUrlRaw).url ?? null
    : null;

  // CTA 链接
  const ctaUrlRaw = normalizeNullableString(body.ctaUrl);
  const ctaUrl = ctaUrlRaw
    ? sanitizePublicUrl(ctaUrlRaw).url ?? null
    : null;

  // CTA 标签
  const ctaLabel = normalizeNullableString(body.ctaLabel);

  // 价格文本
  const priceText = normalizeNullableString(body.priceText);

  // 排序
  const sortOrder =
    typeof body.sortOrder === "number"
      ? Math.max(0, Math.floor(body.sortOrder))
      : 0;

  const isActive = sanitizeBool(body.isActive, true);
  const allowAiRecommendation = sanitizeBool(
    body.allowAiRecommendation,
    true
  );

  const product = await db.product.create({
    data: {
      id: newId(),
      userId: user.id,
      name,
      category,
      description,
      priceText,
      coverImageUrl,
      ctaLabel,
      ctaUrl,
      sortOrder,
      isActive,
      allowAiRecommendation,
    },
  });

  return NextResponse.json(
    { success: true, product: toProductDto(product) },
    { status: 201 }
  );
}
