/**
 * Product 单条操作 API
 * 路径: /api/dashboard/products/[id]
 *
 * GET    /api/dashboard/products/[id]  — 获取单条产品
 * PUT    /api/dashboard/products/[id]  — 更新产品
 * DELETE /api/dashboard/products/[id]  — 删除产品
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  newId,
  normalizeNullableString,
  toProductDto,
} from "@/lib/dashboard-data";
import {
  hasSensitiveContent,
  sanitizePublicText,
} from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { collectManagedMediaUrls } from "@/lib/owned-media";
import { cleanupOwnedMediaUrls } from "@/lib/owned-media-lifecycle";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;
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

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { user, response } = await requireDashboardUser(_request);
  if (response || !user) return response;

  const { id } = await context.params;

  const product = await db.product.findFirst({
    where: { id, userId: user.id },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "产品不存在。" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, product: toProductDto(product) });
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const existing = await db.product.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "产品不存在。" },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确。" },
      { status: 400 }
    );
  }

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

  const rawCategory = normalizeNullableString(body.category);
  const category = VALID_CATEGORIES.includes(rawCategory ?? "")
    ? rawCategory
    : existing.category;

  const description = sanitizeString(body.description, MAX_DESCRIPTION_LENGTH);
  if (description && hasSensitiveContent(description).detected) {
    return NextResponse.json(
      { success: false, error: "产品描述包含受限关键词。" },
      { status: 400 }
    );
  }

  const hasCoverImageUrl = Object.prototype.hasOwnProperty.call(body, "coverImageUrl");
  const coverImageUrlRaw = normalizeNullableString(body.coverImageUrl);
  const coverImageUrl = hasCoverImageUrl
    ? coverImageUrlRaw ? sanitizePublicUrl(coverImageUrlRaw).url ?? null : null
    : existing.coverImageUrl;

  const ctaUrlRaw = normalizeNullableString(body.ctaUrl);
  const ctaUrl = ctaUrlRaw
    ? sanitizePublicUrl(ctaUrlRaw).url ?? null
    : existing.ctaUrl;

  const ctaLabel = normalizeNullableString(body.ctaLabel);
  const priceText = normalizeNullableString(body.priceText);

  const sortOrder =
    typeof body.sortOrder === "number"
      ? Math.max(0, Math.floor(body.sortOrder))
      : existing.sortOrder;

  const isActive = sanitizeBool(body.isActive, existing.isActive);
  const allowAiRecommendation = sanitizeBool(
    body.allowAiRecommendation,
    existing.allowAiRecommendation
  );

  const updated = await db.product.update({
    where: { id },
    data: {
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

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const mediaCleanup = profile && existing.coverImageUrl !== updated.coverImageUrl
    ? await cleanupOwnedMediaUrls(collectManagedMediaUrls(existing.coverImageUrl), profile.id)
    : [];

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({
    success: true,
    product: toProductDto(updated),
    mediaCleanup,
    mediaCleanupOk: mediaCleanup.every((result) => result.status !== "failed"),
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const { user, response } = await requireDashboardUser(_request);
  if (response || !user) return response;

  const { id } = await context.params;

  const existing = await db.product.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "产品不存在。" },
      { status: 404 }
    );
  }

  await db.product.delete({ where: { id } });

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const mediaCleanup = profile
    ? await cleanupOwnedMediaUrls(collectManagedMediaUrls(existing.coverImageUrl), profile.id)
    : [];

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({
    success: true,
    mediaCleanup,
    mediaCleanupOk: mediaCleanup.every((result) => result.status !== "failed"),
  });
}
