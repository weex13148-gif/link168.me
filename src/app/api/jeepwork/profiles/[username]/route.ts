import { NextResponse } from "next/server";
import { requireJeepworkAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { getActiveRestrictions, RESTRICTION_TYPE_ADMIN_FREEZE, RESTRICTION_TYPE_BANNED } from "@/lib/auth";

export const runtime = "nodejs";

function normalizeNote(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length > 1000) return text.slice(0, 1000);
  return text;
}

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  const profile = await db.profile.findUnique({
    where: { username: normalized },
    include: {
      user: { select: { id: true, email: true, role: true, isSystem: true, emailVerified: true, createdAt: true } },
      links: { orderBy: { position: "asc" } },
    },
  });

  if (!profile) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        theme: profile.theme,
        isPublic: profile.isPublic,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: profile.user
          ? {
              id: profile.user.id,
              email: profile.user.email,
              emailVerified: profile.user.emailVerified,
              role: profile.user.role || "user",
              isSystem: Boolean(profile.user.isSystem),
              createdAt: profile.user.createdAt,
            }
          : null,
        linkCount: profile.links.length,
      },
      links: profile.links.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        description: link.description,
        iconType: link.iconType,
        position: link.position,
        isActive: link.isActive,
        totalClicks: link.totalClicks,
        createdAt: link.createdAt,
      })),
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ username: string }> }) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  let body: { action?: unknown; isPublic?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; isPublic?: unknown };
  } catch {
    body = {};
  }

  let action: string;
  if (typeof body.action === "string" && body.action) {
    action = body.action;
  } else {
    const actionHeader = request.headers.get("x-admin-action");
    if (!actionHeader) {
      return NextResponse.json({ success: false, error: "缺少操作类型" }, { status: 400 });
    }
    action = actionHeader;
  }

  const profile = await db.profile.findUnique({ where: { username: normalized } });
  if (!profile) {
    writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
      targetType: "profile",
      targetId: normalized,
      metadata: { username: normalized, reason: "profile_not_found" },
      request,
      success: false,
    });
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  if (action === "hide-profile") {
    const oldIsPublic = profile.isPublic;
    // P0-4: 主页隐藏与审计日志在同一事务中
    await db.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: profile.id }, data: { isPublic: false } });
      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
          targetType: "profile",
          targetId: profile.id,
          metadata: { username: normalized, oldIsPublic, newIsPublic: false },
          request,
          success: true,
        },
        tx,
      );
    });
    return NextResponse.json({
      success: true,
      data: { message: "主页已隐藏", profileId: profile.id, username: normalized, isPublic: false, previousIsPublic: oldIsPublic },
    });
  }

  if (action === "restore-profile") {
    // 检查用户是否有活跃的冻结/封禁限制
    const restrictions = await getActiveRestrictions(profile.userId);
    const activeFreeze = restrictions.find((r) => r.type === RESTRICTION_TYPE_ADMIN_FREEZE || r.type === RESTRICTION_TYPE_BANNED);
    if (activeFreeze) {
      await writeAdminAuditLog({
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
        targetType: "profile",
        targetId: profile.id,
        metadata: { username: normalized, reason: "user_frozen_or_banned", restrictionType: activeFreeze.type },
        request,
        success: false,
      });
      return NextResponse.json(
        { success: false, error: { code: "USER_RESTRICTED", message: `该用户处于${activeFreeze.type === RESTRICTION_TYPE_BANNED ? "封禁" : "冻结"}状态，请先解除限制后再恢复主页公开` } },
        { status: 409 },
      );
    }

    const oldIsPublic = profile.isPublic;
    // P0-4: 主页恢复与审计日志在同一事务中
    await db.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: profile.id }, data: { isPublic: true } });
      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
          targetType: "profile",
          targetId: profile.id,
          metadata: { username: normalized, oldIsPublic, newIsPublic: true },
          request,
          success: true,
        },
        tx,
      );
    });
    return NextResponse.json({
      success: true,
      data: { message: "主页已恢复公开", profileId: profile.id, username: normalized, isPublic: true, previousIsPublic: oldIsPublic },
    });
  }

  if (action === "disable-links") {
    // P0-4: 下架链接与审计日志在同一事务中
    const result = await db.$transaction(async (tx) => {
      const updateResult = await tx.link.updateMany({
        where: { profileId: profile.id, isActive: true },
        data: { isActive: false },
      });
      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
          targetType: "profile",
          targetId: profile.id,
          metadata: { username: normalized, linkAction: "disable-links", disabledCount: updateResult.count },
          request,
          success: true,
        },
        tx,
      );
      return updateResult;
    });
    return NextResponse.json({
      success: true,
      data: { message: `已下架 ${result.count} 条链接`, disabledCount: result.count, profileId: profile.id },
    });
  }

  if (action === "enable-links") {
    // P0-4: 恢复链接与审计日志在同一事务中
    const result = await db.$transaction(async (tx) => {
      const updateResult = await tx.link.updateMany({
        where: { profileId: profile.id, isActive: false },
        data: { isActive: true },
      });
      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.UPDATE_PROFILE_VISIBILITY,
          targetType: "profile",
          targetId: profile.id,
          metadata: { username: normalized, linkAction: "enable-links", enabledCount: updateResult.count },
          request,
          success: true,
        },
        tx,
      );
      return updateResult;
    });
    return NextResponse.json({
      success: true,
      data: { message: `已恢复 ${result.count} 条链接`, enabledCount: result.count, profileId: profile.id },
    });
  }

  return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
}
