import { NextResponse } from "next/server";
import { requireJeepworkAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { db } from "@/lib/db";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["approved", "rejected", "pending", "pending_manual_review"]);

class ModerationConflictError extends Error {}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const contentType = searchParams.get("contentType");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 20));

  const where: Record<string, unknown> = {};
  if (status && VALID_STATUSES.has(status)) where.status = status;
  if (contentType) where.contentType = contentType;

  const [records, total] = await Promise.all([
    db.contentModerationRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        contentType: true,
        contentRef: true,
        status: true,
        riskLevel: true,
        reason: true,
        provider: true,
        reviewedAt: true,
        reviewerId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.contentModerationRecord.count({ where }),
  ]);

  const pending = await db.contentModerationRecord.count({
    where: { status: { in: ["pending", "pending_manual_review"] } },
  });
  const approved = await db.contentModerationRecord.count({ where: { status: "approved" } });
  const rejected = await db.contentModerationRecord.count({ where: { status: "rejected" } });

  return NextResponse.json({
    success: true,
    data: {
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      summary: { total, pending, approved, rejected },
    },
    message: "当前未接入云图片内容审核，新上传图片进入人工复核队列。",
  });
}

export async function PATCH(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const admin = await getJeepworkSessionUser(request);

  try {
    const body = (await request.json()) as {
      id: string;
      status: string;
      reason?: string;
    };

    if (!body.id || !body.status || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ success: false, error: "缺少必要参数或状态无效" }, { status: 400 });
    }

    if (body.status === "pending" || body.status === "pending_manual_review") {
      return NextResponse.json({ success: false, error: "不能通过 PATCH 设置为待审核状态" }, { status: 400 });
    }

    const existingRecord = await db.contentModerationRecord.findUnique({
      where: { id: body.id },
    });
    if (!existingRecord) {
      return NextResponse.json({ success: false, error: "审核记录不存在" }, { status: 404 });
    }

    const result = await db.$transaction(async (tx) => {
      const updateResult = await tx.contentModerationRecord.updateMany({
        where: {
          id: existingRecord.id,
          updatedAt: existingRecord.updatedAt,
          status: existingRecord.status,
        },
        data: {
          status: body.status,
          reason: body.reason || null,
          reviewedAt: new Date(),
          reviewerId: admin?.id || null,
        },
      });
      if (updateResult.count !== 1) throw new ModerationConflictError();

      const record = await tx.contentModerationRecord.findUnique({ where: { id: existingRecord.id } });
      if (!record) throw new ModerationConflictError();

      const avatarProfile = record.contentType === "avatar"
        ? await tx.profile.update({
            where: { id: record.contentRef },
            data: { avatarModerationStatus: body.status },
            select: { userId: true },
          })
        : null;

      return { record, userId: avatarProfile?.userId || null };
    });

    if (result.userId) {
      try {
        await revalidatePublicProfileByUser(result.userId);
      } catch (error) {
        console.error("[jeepwork:moderation] public profile revalidation failed", error && (error as { message?: unknown }).message ? String((error as { message?: unknown }).message) : String(error));
      }
    }

    await writeAdminAuditLog({
      actorUserId: admin?.id,
      actorEmail: admin?.email,
      actorRole: admin?.role,
      action: "admin.moderation_update",
      targetType: "content_moderation_record",
      targetId: body.id,
      metadata: { status: body.status, reason: body.reason || null, contentType: result.record.contentType, contentRef: result.record.contentRef },
      request,
      success: true,
    }).catch(() => undefined);

    return NextResponse.json({ success: true, data: result.record });
  } catch (error) {
    if (error instanceof ModerationConflictError) {
      return NextResponse.json({ success: false, error: "审核记录已更新，请刷新后重试" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}
