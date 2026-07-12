import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toProductDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import {
  WorkspaceResourceError,
  assertWorkspaceAssignee,
  assertWorkspaceResourceManager,
  listVisibleWorkspaceResourceMappings,
} from "@/lib/workspace/resources";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string }> };

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
  assignedToUserId?: unknown;
};

const VALID_CATEGORIES = ["SaaS", "运营", "会员", "咨询", "硬件", "教育", "医疗", "金融", "零售", "其他"];

function sanitizeString(raw: unknown, maxLength: number) {
  if (typeof raw !== "string") return "";
  return sanitizePublicText(raw.trim().slice(0, maxLength)) ?? "";
}

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
    { success: false, error: "企业产品库暂时不可用。", code: "WORKSPACE_PRODUCT_UNAVAILABLE" },
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
      resourceType: "product",
    });
    const products = await db.product.findMany({
      where: { id: { in: mappings.map((item) => item.resourceId) } },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const mappingByResource = new Map(mappings.map((item) => [item.resourceId, item]));
    return NextResponse.json({
      success: true,
      products: products.map((product) => ({
        ...toProductDto(product),
        assignedToUserId: mappingByResource.get(product.id)?.assignedToUserId ?? null,
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

    let body: CreateProductRequest;
    try {
      body = (await request.json()) as CreateProductRequest;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const name = sanitizeString(body.name, 80);
    if (!name || hasSensitiveContent(name).detected) {
      return NextResponse.json({ success: false, error: "请输入有效产品名称。" }, { status: 400 });
    }
    const description = sanitizeString(body.description, 400);
    if (description && hasSensitiveContent(description).detected) {
      return NextResponse.json({ success: false, error: "产品描述包含受限关键词。" }, { status: 400 });
    }

    const rawCategory = normalizeNullableString(body.category);
    const category = VALID_CATEGORIES.includes(rawCategory ?? "") ? rawCategory : "其他";
    const coverRaw = normalizeNullableString(body.coverImageUrl);
    const coverImageUrl = coverRaw ? sanitizePublicUrl(coverRaw).url ?? null : null;
    const ctaRaw = normalizeNullableString(body.ctaUrl);
    const ctaUrl = ctaRaw ? sanitizePublicUrl(ctaRaw).url ?? null : null;
    const assignedToUserId = typeof body.assignedToUserId === "string" && body.assignedToUserId
      ? body.assignedToUserId
      : null;
    await assertWorkspaceAssignee(workspaceId, assignedToUserId);

    const productId = crypto.randomUUID();
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          id: productId,
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
      await tx.workspaceResource.create({
        data: {
          workspaceId,
          resourceType: "product",
          resourceId: productId,
          createdByUserId: user.id,
          assignedToUserId,
          status: "active",
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.product.created",
          targetType: "product",
          targetId: productId,
          metadata: { assignedToUserId },
        },
      });
      return created;
    });

    return NextResponse.json(
      { success: true, product: { ...toProductDto(product), workspaceId, assignedToUserId } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
