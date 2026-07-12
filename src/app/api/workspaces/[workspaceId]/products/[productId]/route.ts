import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNullableString, toProductDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import {
  WorkspaceResourceError,
  assertWorkspaceAssignee,
  assertWorkspaceResourceAccess,
} from "@/lib/workspace/resources";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string; productId: string }> };

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
    { success: false, error: "企业产品暂时不可用。", code: "WORKSPACE_PRODUCT_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, productId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "product",
      resourceId: productId,
    });
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ success: false, error: "企业产品不存在。" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      product: { ...toProductDto(product), workspaceId, assignedToUserId: mapping.assignedToUserId },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, productId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "product",
      resourceId: productId,
      manage: true,
    });
    const existing = await db.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "企业产品不存在。" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const name = body.name === undefined ? existing.name : sanitizeString(body.name, 80);
    if (!name || hasSensitiveContent(name).detected) {
      return NextResponse.json({ success: false, error: "请输入有效产品名称。" }, { status: 400 });
    }
    const description = body.description === undefined
      ? existing.description ?? ""
      : sanitizeString(body.description, 400);
    if (description && hasSensitiveContent(description).detected) {
      return NextResponse.json({ success: false, error: "产品描述包含受限关键词。" }, { status: 400 });
    }

    const rawCategory = body.category === undefined ? existing.category : normalizeNullableString(body.category);
    const category = VALID_CATEGORIES.includes(rawCategory ?? "") ? rawCategory : existing.category;
    const coverRaw = body.coverImageUrl === undefined ? existing.coverImageUrl : normalizeNullableString(body.coverImageUrl);
    const coverImageUrl = coverRaw ? sanitizePublicUrl(coverRaw).url ?? null : null;
    const ctaRaw = body.ctaUrl === undefined ? existing.ctaUrl : normalizeNullableString(body.ctaUrl);
    const ctaUrl = ctaRaw ? sanitizePublicUrl(ctaRaw).url ?? null : null;
    const assignedToUserId = body.assignedToUserId === undefined
      ? mapping.assignedToUserId
      : typeof body.assignedToUserId === "string" && body.assignedToUserId
        ? body.assignedToUserId
        : null;
    await assertWorkspaceAssignee(workspaceId, assignedToUserId);

    const updated = await db.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          category,
          description,
          priceText: body.priceText === undefined ? existing.priceText : normalizeNullableString(body.priceText),
          coverImageUrl,
          ctaLabel: body.ctaLabel === undefined ? existing.ctaLabel : normalizeNullableString(body.ctaLabel),
          ctaUrl,
          sortOrder: typeof body.sortOrder === "number" ? Math.max(0, Math.floor(body.sortOrder)) : existing.sortOrder,
          isActive: sanitizeBool(body.isActive, existing.isActive),
          allowAiRecommendation: sanitizeBool(body.allowAiRecommendation, existing.allowAiRecommendation),
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
          action: "workspace.product.updated",
          targetType: "product",
          targetId: productId,
          metadata: { assignedToUserId },
        },
      });
      return product;
    });

    return NextResponse.json({
      success: true,
      product: { ...toProductDto(updated), workspaceId, assignedToUserId },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, productId } = await context.params;

  try {
    const { mapping } = await assertWorkspaceResourceAccess({
      workspaceId,
      userId: user.id,
      resourceType: "product",
      resourceId: productId,
      manage: true,
    });
    const existing = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "企业产品不存在。" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.workspaceResource.delete({ where: { id: mapping.id } });
      await tx.product.delete({ where: { id: productId } });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.product.deleted",
          targetType: "product",
          targetId: productId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
