/**
 * Workbench Leads 详情与更新 API
 * 路径: /api/workbench/leads/[id]
 *
 * GET    /api/workbench/leads/[id] — 获取单条线索详情（含完整跟进记录）
 * PATCH  /api/workbench/leads/[id] — 更新线索状态、添加跟进记录
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, newId } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

// 统一状态枚举
const VALID_STATUSES = ["new", "contacted", "following", "converted", "closed"] as const;
type LeadStatus = typeof VALID_STATUSES[number];

// 旧状态映射
const OLD_STATUS_MAP: Record<string, LeadStatus> = {
  qualified: "following",
  lost: "closed",
};

function normalizeStatus(status: string): LeadStatus | "unknown" {
  const lower = status.toLowerCase();
  if (VALID_STATUSES.includes(lower as LeadStatus)) {
    return lower as LeadStatus;
  }
  if (OLD_STATUS_MAP[lower]) {
    return OLD_STATUS_MAP[lower];
  }
  return "unknown";
}

function isValidStatus(status: string): status is LeadStatus {
  return VALID_STATUSES.includes(status as LeadStatus);
}

function sanitizeNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 2000);
  if (!trimmed) return null;
  return sanitizePublicText(trimmed);
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "请先创建个人资料。" },
      { status: 400 }
    );
  }

  const lead = await db.lead.findFirst({
    where: { id, profileId: profile.id },
    include: {
      interestedProduct: {
        select: {
          id: true,
          name: true,
          category: true,
          priceText: true,
          isActive: true,
          coverImageUrl: true,
          description: true,
        },
      },
      followUps: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    return NextResponse.json(
      { success: false, error: "线索不存在。" },
      { status: 404 }
    );
  }

  // 检查状态是否为未知状态
  const normalizedStatus = normalizeStatus(lead.status);
  const isLegacyStatus = normalizedStatus === "unknown";

  return NextResponse.json({
    success: true,
    lead: {
      id: lead.id,
      profile_id: lead.profileId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      source_component: lead.sourceComponent,
      source_page: lead.sourcePage,
      status: lead.status,
      status_is_legacy: isLegacyStatus,
      status_display: isLegacyStatus ? "未知状态" : null,
      handler_note: lead.handlerNote,
      handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
      wechat: lead.wechat,
      interested_product_id: lead.interestedProductId,
      interested_product_name: lead.interestedProductName,
      interested_product_price: lead.interestedProductPrice,
      interested_product_category: lead.interestedProductCategory,
      conversation_id: lead.conversationId,
      notes: lead.notes, // 旧版备注
      is_legacy_note: !!lead.notes,
      created_at: lead.createdAt.toISOString(),
      updated_at: lead.updatedAt.toISOString(),
      interested_product: lead.interestedProduct
        ? {
            id: lead.interestedProduct.id,
            name: lead.interestedProduct.name,
            category: lead.interestedProduct.category,
            price_text: lead.interestedProduct.priceText,
            is_active: lead.interestedProduct.isActive,
          }
        : null,
      product_snapshot_status: lead.interestedProduct
        ? (lead.interestedProduct.isActive ? "active" : "inactive")
        : lead.interestedProductId
          ? "deleted"
          : "none",
      follow_ups: lead.followUps.map((fu) => ({
        id: fu.id,
        content: fu.content,
        previous_status: fu.previousStatus,
        new_status: fu.newStatus,
        created_by_type: fu.createdByType,
        created_at: fu.createdAt.toISOString(),
      })),
      follow_ups_count: lead.followUps.length,
    },
    valid_statuses: VALID_STATUSES,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "请先创建个人资料。" },
      { status: 400 }
    );
  }

  const existing = await db.lead.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "线索不存在。" },
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

  // 处理状态更新
  const rawStatus = normalizeNullableString(body.status);
  let newStatus: string = existing.status;
  let statusChanged = false;

  if (rawStatus) {
    const normalized = normalizeStatus(rawStatus);
    if (normalized !== "unknown" && isValidStatus(normalized)) {
      newStatus = normalized;
      statusChanged = newStatus !== existing.status;
    }
  }

  // 处理跟进记录（独立记录）
  const newNote = sanitizeNote(body.note);
  if (newNote && hasSensitiveContent(newNote).detected) {
    return NextResponse.json(
      { success: false, error: "跟进记录包含受限关键词。" },
      { status: 400 }
    );
  }

  // 处理管理员备注
  const handlerNote = sanitizeNote(body.handlerNote);
  if (handlerNote && hasSensitiveContent(handlerNote).detected) {
    return NextResponse.json(
      { success: false, error: "备注包含受限关键词。" },
      { status: 400 }
    );
  }

  // 处理微信
  const wechat = normalizeNullableString(body.wechat);

  // 处理产品关联变更
  const interestedProductId = normalizeNullableString(body.interestedProductId);
  if (interestedProductId && interestedProductId !== existing.interestedProductId) {
    const product = await db.product.findFirst({
      where: { id: interestedProductId, userId: user.id },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "产品不存在或不属于你。" },
        { status: 400 }
      );
    }
  }

  // 构建更新数据
  const updateData: Parameters<typeof db.lead.update>[0]["data"] = {
    status: newStatus,
    handlerNote: handlerNote ?? existing.handlerNote,
    handledAt: newNote || statusChanged ? new Date() : existing.handledAt,
    wechat: wechat ?? existing.wechat,
    interestedProductId: interestedProductId ?? existing.interestedProductId,
  };

  // 执行更新和创建跟进记录（事务保证一致性）
  const updated = await db.$transaction(async (tx) => {
    // 1. 更新线索
    const leadUpdate = await tx.lead.update({
      where: { id },
      data: updateData,
    });

    // 2. 如果有新的跟进内容，创建独立跟进记录
    if (newNote) {
      await tx.leadFollowUp.create({
        data: {
          id: newId(),
          leadId: id,
          profileId: profile.id,
          createdByType: "owner",
          createdByUserId: user.id,
          content: newNote,
          previousStatus: statusChanged ? existing.status : null,
          newStatus: statusChanged ? newStatus : null,
        },
      });
    } else if (statusChanged) {
      // 3. 状态变更也创建跟进记录（即使没有手动内容）
      await tx.leadFollowUp.create({
        data: {
          id: newId(),
          leadId: id,
          profileId: profile.id,
          createdByType: "owner",
          createdByUserId: user.id,
          content: `状态从「${existing.status}」变更为「${newStatus}」`,
          previousStatus: existing.status,
          newStatus: newStatus,
        },
      });
    }

    // 4. 获取完整更新后的线索（含关联数据）
    return tx.lead.findUnique({
      where: { id },
      include: {
        interestedProduct: {
          select: {
            id: true,
            name: true,
            category: true,
            priceText: true,
            isActive: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  // DTO 转换
  const leadDto = {
    id: updated!.id,
    profile_id: updated!.profileId,
    name: updated!.name,
    email: updated!.email,
    phone: updated!.phone,
    message: updated!.message,
    source_component: updated!.sourceComponent,
    source_page: updated!.sourcePage,
    status: updated!.status,
    handler_note: updated!.handlerNote,
    handled_at: updated!.handledAt ? updated!.handledAt.toISOString() : null,
    wechat: updated!.wechat,
    interested_product_id: updated!.interestedProductId,
    interested_product_name: updated!.interestedProductName,
    interested_product_price: updated!.interestedProductPrice,
    interested_product_category: updated!.interestedProductCategory,
    conversation_id: updated!.conversationId,
    notes: updated!.notes,
    is_legacy_note: !!updated!.notes,
    created_at: updated!.createdAt.toISOString(),
    updated_at: updated!.updatedAt.toISOString(),
    interested_product: updated!.interestedProduct
      ? {
          id: updated!.interestedProduct.id,
          name: updated!.interestedProduct.name,
          category: updated!.interestedProduct.category,
          price_text: updated!.interestedProduct.priceText,
          is_active: updated!.interestedProduct.isActive,
        }
      : null,
    product_snapshot_status: updated!.interestedProduct
      ? (updated!.interestedProduct.isActive ? "active" : "inactive")
      : updated!.interestedProductId
        ? "deleted"
        : "none",
    follow_ups: updated!.followUps.map((fu) => ({
      id: fu.id,
      content: fu.content,
      previous_status: fu.previousStatus,
      new_status: fu.newStatus,
      created_by_type: fu.createdByType,
      created_at: fu.createdAt.toISOString(),
    })),
    follow_ups_count: updated!.followUps.length,
  };

  return NextResponse.json({
    success: true,
    lead: leadDto,
    valid_statuses: VALID_STATUSES,
  });
}
