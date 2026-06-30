import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { RESTRICTION_TYPE_ADMIN_FREEZE, RESTRICTION_TYPE_BANNED } from "@/lib/auth";
import { STATUS_PERMANENTLY_RESERVED } from "@/lib/username-registry";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

// GET: 获取用户的限制记录列表
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const { id: userId } = await context.params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, profile: { select: { username: true, displayName: true } } },
  });
  if (!user) return apiError("NOT_FOUND", "用户不存在", 404);

  const restrictions = await db.freezeRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.profile?.username || null,
        displayName: user.profile?.displayName || null,
      },
      restrictions: restrictions.map((r) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        source: r.source,
        isActive: r.isActive,
        startsAt: r.startsAt,
        expiresAt: r.expiresAt,
        clearedAt: r.clearedAt,
        createdAt: r.createdAt,
      })),
    },
    error: null,
  });
}

// POST: 创建冻结或封禁
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: userId } = await context.params;

  let body: { action?: unknown; reason?: unknown; expiresAt?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; reason?: unknown; expiresAt?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const expiresAtRaw = typeof body.expiresAt === "string" ? body.expiresAt : null;

  if (!["freeze", "ban"].includes(action)) {
    return apiError("BAD_BODY", "操作必须是 freeze 或 ban");
  }
  if (!reason) {
    return apiError("BAD_BODY", "必须提供原因");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isSystem: true, profile: { select: { username: true } } },
  });
  if (!user) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: action === "ban" ? AUDIT_ACTION.BAN_USER : AUDIT_ACTION.FREEZE_USER,
      targetType: "user",
      targetId: userId,
      metadata: { reason: "user_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "用户不存在", 404);
  }

  if (user.isSystem) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: action === "ban" ? AUDIT_ACTION.BAN_USER : AUDIT_ACTION.FREEZE_USER,
      targetType: "user",
      targetId: userId,
      metadata: { reason: "system_account_immutable" },
      request,
      success: false,
    });
    return apiError("FORBIDDEN", "系统账号禁止冻结或封禁", 400);
  }

  const isSelf = actor?.id === user.id;
  if (isSelf) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: action === "ban" ? AUDIT_ACTION.BAN_USER : AUDIT_ACTION.FREEZE_USER,
      targetType: "user",
      targetId: userId,
      metadata: { reason: "self_protect" },
      request,
      success: false,
    });
    return apiError("FORBIDDEN", "不能对自己执行此操作", 403);
  }

  const restrictionType = action === "ban" ? RESTRICTION_TYPE_BANNED : RESTRICTION_TYPE_ADMIN_FREEZE;

  // 检查是否已有同类型活跃限制
  const existing = await db.freezeRecord.findFirst({
    where: { userId, type: restrictionType, isActive: true },
  });
  if (existing) {
    return apiError("CONFLICT", `该用户已有${action === "ban" ? "封禁" : "冻结"}记录，请先解除后再操作`, 409);
  }

  let expiresAt: Date | null = null;
  if (action === "freeze" && expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      expiresAt = parsed;
    }
  }

  // 事务：创建限制记录 + 更新用户名注册表 + 写审计日志
  const restriction = await db.$transaction(async (tx) => {
    const rec = await tx.freezeRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: restrictionType,
        reason,
        source: "admin",
        isActive: true,
        startsAt: new Date(),
        expiresAt,
      },
    });

    // 更新 UsernameRegistry：封禁永久保留，冻结按过期时间保留
    if (user.profile?.username && action === "ban") {
      await tx.usernameRegistry.updateMany({
        where: { normalizedUsername: user.profile.username.toLowerCase(), status: "CURRENT" },
        data: {
          status: STATUS_PERMANENTLY_RESERVED,
          userId: null,
          reason: "banned",
          reservedUntil: null,
        },
      });
    }

    await writeAdminAuditLog(
      {
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        action: action === "ban" ? AUDIT_ACTION.BAN_USER : AUDIT_ACTION.FREEZE_USER,
        targetType: "user",
        targetId: userId,
        metadata: {
          targetEmail: user.email,
          targetUsername: user.profile?.username || null,
          reason,
          expiresAt: expiresAt?.toISOString() || null,
          restrictionId: rec.id,
        },
        request,
        success: true,
      },
      tx,
    );

    return rec;
  });

  return NextResponse.json({
    success: true,
    data: {
      restrictionId: restriction.id,
      type: restriction.type,
      reason: restriction.reason,
      expiresAt: restriction.expiresAt,
      message: action === "ban" ? "用户已封禁" : "用户已冻结",
    },
    error: null,
  });
}

// PATCH: 解除冻结（解冻）
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: userId } = await context.params;

  let body: { action?: unknown; reason?: unknown; restrictionId?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; reason?: unknown; restrictionId?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const restrictionId = typeof body.restrictionId === "string" ? body.restrictionId : "";

  if (!["unfreeze", "unban"].includes(action)) {
    return apiError("BAD_BODY", "操作必须是 unfreeze 或 unban");
  }
  if (!reason) {
    return apiError("BAD_BODY", "必须提供解除原因");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, profile: { select: { username: true } } },
  });
  if (!user) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: action === "unban" ? AUDIT_ACTION.UNBAN_USER : AUDIT_ACTION.UNFREEZE_USER,
      targetType: "user",
      targetId: userId,
      metadata: { reason: "user_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "用户不存在", 404);
  }

  const restrictionType = action === "unban" ? RESTRICTION_TYPE_BANNED : RESTRICTION_TYPE_ADMIN_FREEZE;
  const auditAction = action === "unban" ? AUDIT_ACTION.UNBAN_USER : AUDIT_ACTION.UNFREEZE_USER;

  // 查找活跃的限制记录
  const whereClause = restrictionId
    ? { id: restrictionId, userId, type: restrictionType, isActive: true }
    : { userId, type: restrictionType, isActive: true };

  const existing = await db.freezeRecord.findFirst({ where: whereClause });
  if (!existing) {
    return apiError("NOT_FOUND", `未找到活跃的${action === "unban" ? "封禁" : "冻结"}记录`, 404);
  }

  await db.$transaction(async (tx) => {
    await tx.freezeRecord.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        clearedAt: new Date(),
        clearedByUserId: actor?.id || null,
        clearedBySource: action === "unban" ? "admin_unban" : "admin_unfreeze",
      },
    });

    // 解除封禁时，恢复 UsernameRegistry 状态（从 PERMANENTLY_RESERVED 改回 CURRENT）
    if (action === "unban" && user.profile?.username) {
      await tx.usernameRegistry.updateMany({
        where: { normalizedUsername: user.profile.username.toLowerCase(), status: "PERMANENTLY_RESERVED" },
        data: {
          status: "CURRENT",
          userId: user.id,
          reason: null,
          reservedUntil: null,
        },
      });
    }

    await writeAdminAuditLog(
      {
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        action: auditAction,
        targetType: "user",
        targetId: userId,
        metadata: {
          targetEmail: user.email,
          targetUsername: user.profile?.username || null,
          reason,
          restrictionId: existing.id,
        },
        request,
        success: true,
      },
      tx,
    );
  });

  return NextResponse.json({
    success: true,
    data: {
      restrictionId: existing.id,
      message: action === "unban" ? "用户已解除封禁" : "用户已解冻",
    },
    error: null,
  });
}
