import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { RESTRICTION_TYPE_ADMIN_FREEZE } from "@/lib/auth";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

/**
 * 批量操作 API（第一版仅支持）：
 *   - 批量导出普通用户（CSV）
 *   - 批量冻结普通用户（ADMIN_FREEZE）
 *
 * 禁止批量操作：
 *   - super_admin / admin 不可批量冻结/解冻
 *   - 系统账号不可批量冻结
 *   - 已冻结的用户跳过
 *
 * POST body: { action: "export" | "batch_freeze", reason?: string, userIds?: string[] }
 */
export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: { action?: unknown; reason?: unknown; userIds?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; reason?: unknown; userIds?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (!["export", "batch_freeze"].includes(action)) {
    return apiError("BAD_BODY", "不支持的批量操作类型");
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (action === "batch_freeze" && !reason) {
    return apiError("BAD_BODY", "批量冻结必须提供原因");
  }

  // ========== 批量导出 ==========
  if (action === "export") {
    const users = await db.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { username: true, displayName: true, isPublic: true } },
        freezeRecords: {
          where: { isActive: true },
          select: { type: true, reason: true, expiresAt: true },
        },
      },
    });

    const csvHeader = "邮箱,用户名,展示名,邮箱已验证,角色,主页公开,当前冻结,冻结原因,注册时间\n";
    const csvRows = users.map((u) => {
      const active = u.freezeRecords[0];
      return [
        u.email,
        u.profile?.username || "",
        u.profile?.displayName || "",
        u.emailVerified ? "是" : "否",
        u.role,
        u.profile?.isPublic ? "是" : "否",
        active ? "是" : "否",
        active?.reason || "",
        u.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = csvHeader + csvRows.join("\n");

    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "admin.batch_export_users",
      targetType: "users",
      targetId: "batch",
      metadata: { count: users.length, role: "user" },
      request,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "导出成功",
        count: users.length,
        // 返回 CSV 内容（前端负责下载）
        csv,
        filename: `users_export_${new Date().toISOString().slice(0, 10)}.csv`,
      },
      error: null,
    });
  }

  // ========== 批量冻结普通用户 ==========
  if (action === "batch_freeze") {
    const userIdsRaw = Array.isArray(body.userIds) ? body.userIds : [];
    const userIds = userIdsRaw.filter((id): id is string => typeof id === "string");

    if (userIds.length === 0) {
      return apiError("BAD_BODY", "必须指定要冻结的用户 ID 列表");
    }

    // 查询目标用户，仅限普通用户
    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
        role: "user",
        isSystem: false,
      },
      select: { id: true, email: true, profile: { select: { username: true } } },
    });

    if (users.length === 0) {
      return apiError("NOT_FOUND", "未找到符合条件的用户（仅普通用户可批量冻结）", 404);
    }

    // 过滤掉已有活跃冻结的用户
    const existingFreezes = await db.freezeRecord.findMany({
      where: { userId: { in: users.map((u) => u.id) }, type: RESTRICTION_TYPE_ADMIN_FREEZE, isActive: true },
      select: { userId: true },
    });
    const alreadyFrozenIds = new Set(existingFreezes.map((f) => f.userId));
    const toFreeze = users.filter((u) => !alreadyFrozenIds.has(u.id));

    if (toFreeze.length === 0) {
      return apiError("CONFLICT", "所选用户均已有活跃冻结记录", 409);
    }

    // 批量创建冻结记录
    const records = await db.$transaction(async (tx) => {
      const created: { id: string; userId: string }[] = [];
      for (const user of toFreeze) {
        const rec = await tx.freezeRecord.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            type: RESTRICTION_TYPE_ADMIN_FREEZE,
            reason,
            source: "admin",
            isActive: true,
            startsAt: new Date(),
            expiresAt: null,
          },
        });
        created.push({ id: rec.id, userId: user.id });
      }

      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.FREEZE_USER,
          targetType: "users",
          targetId: "batch",
          metadata: {
            reason,
            frozenCount: toFreeze.length,
            userIds: toFreeze.map((u) => u.id),
            userEmails: toFreeze.map((u) => u.email),
            skippedCount: users.length - toFreeze.length,
            skippedReason: "already_frozen_or_not_eligible",
          },
          request,
          success: true,
        },
        tx,
      );

      return created;
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `已冻结 ${records.length} 名用户，跳过 ${users.length - records.length} 名（已有冻结记录）`,
        frozenCount: records.length,
        skippedCount: users.length - records.length,
      },
      error: null,
    });
  }

  return apiError("BAD_BODY", "不支持的操作", 400);
}
