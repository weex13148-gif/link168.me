import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function normalizeKeyword(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.length > 60 ? text.slice(0, 60) : text;
}

function normalizeEmail(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return text.length > 120 ? text.slice(0, 120) : text;
}

function normalizeRole(raw: unknown): "super_admin" | "admin" | "user" | "" {
  if (raw === "super_admin" || raw === "admin" || raw === "user") return raw;
  return "";
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const keyword = normalizeKeyword(url.searchParams.get("q"));
  const emailFilter = normalizeEmail(url.searchParams.get("email"));
  const roleFilter = normalizeRole(url.searchParams.get("role"));

  const whereItems: Array<Record<string, unknown>> = [];
  if (emailFilter) {
    whereItems.push({ email: { contains: emailFilter, mode: "insensitive" } });
  } else if (keyword) {
    whereItems.push({
      OR: [
        { email: { contains: keyword, mode: "insensitive" } },
        { profile: { username: { contains: keyword, mode: "insensitive" } } },
        { profile: { displayName: { contains: keyword, mode: "insensitive" } } },
      ],
    });
  }
  if (roleFilter) whereItems.push({ role: roleFilter });
  const where = whereItems.length > 0 ? { AND: whereItems } : undefined;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        profile: { select: { id: true, username: true, displayName: true, isPublic: true, createdAt: true } },
        _count: { select: { sessions: true, shortLinks: true, aiUsageLogs: true } },
        freezeRecords: {
          where: { isActive: true },
          select: { type: true, isActive: true, reason: true, expiresAt: true },
          take: 5,
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      users: users.map((user) => ({
        id: user.id,
        email: user.email, // 超级管理员可查看邮箱
        emailVerified: user.emailVerified,
        role: user.role,
        isSystem: Boolean(user.isSystem),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile
          ? {
              id: user.profile.id,
              username: user.profile.username,
              displayName: user.profile.displayName,
              isPublic: user.profile.isPublic,
              createdAt: user.profile.createdAt,
            }
          : null,
        stats: {
          sessionCount: user._count.sessions,
          shortLinkCount: user._count.shortLinks,
          aiUsageLogCount: user._count.aiUsageLogs,
        },
        // 安全：限制记录摘要，不暴露原始 IP、Session 详情等敏感信息
        _restrictions: (user.freezeRecords || []).map((r: { type: string; isActive: boolean; reason: string | null; expiresAt: Date | null }) => ({
          type: r.type,
          isActive: r.isActive,
          reason: r.reason,
          expiresAt: r.expiresAt?.toISOString() || null,
        })),
      })),
    },
    error: null,
  });
}

export async function PATCH(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: { id?: unknown; role?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; role?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const userId = typeof body.id === "string" ? body.id : "";
  const newRole = normalizeRole(body.role);

  if (!userId) return apiError("BAD_BODY", "缺少用户 ID");
  if (!newRole) return apiError("BAD_BODY", "不支持的角色");

  // 系统账号不可修改
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, isSystem: true } });
  if (!target) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_USER_ROLE,
      targetType: "user",
      targetId: userId,
      metadata: { newRole, reason: "user_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "用户不存在", 404);
  }

  if (target.isSystem) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_USER_ROLE,
      targetType: "user",
      targetId: userId,
      metadata: { newRole, reason: "system_account_immutable" },
      request,
      success: false,
    });
    return apiError("FORBIDDEN", "系统账号禁止修改角色", 400);
  }

  const isSelf = actor?.id === target.id;
  if (isSelf) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_USER_ROLE,
      targetType: "user",
      targetId: userId,
      metadata: { newRole, reason: "self_protect" },
      request,
      success: false,
    });
    return NextResponse.json(
      { success: false, error: { code: "SELF_PROTECT", message: "超级管理员不能修改自己的角色或删除自己" } },
      { status: 403 },
    );
  }

  // P0-1: 禁止把最后一名 super_admin 降级
  // 使用 $transaction + PostgreSQL advisory transaction lock，防止两名 super_admin 并发互降
  const wasSuperAdmin = target.role === "super_admin";
  if (wasSuperAdmin && newRole !== "super_admin") {
    // P0-4: 角色更新和审计日志在同一事务中，审计失败则角色更新回滚
    try {
      await db.$transaction(async (tx) => {
        // 在事务中获取 advisory transaction lock（事务提交/回滚时自动释放）
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(87654321)`;

        // 在持有锁的情况下重新查询 super_admin 数量（防止并发修改）
        const superAdminCount = await tx.user.count({
          where: { role: "super_admin", id: { not: target.id } },
        });
        if (superAdminCount === 0) {
          throw new Error("PREVENT_LAST_SUPER_ADMIN");
        }

        // 执行角色更新
        const oldRole = target.role;
        await tx.user.update({ where: { id: target.id }, data: { role: newRole } });

        // 事务内写审计日志（P0-4: 失败时角色更新一并回滚）
        await writeAdminAuditLog(
          {
            actorUserId: actor?.id,
            actorEmail: actor?.email,
            actorRole: actor?.role,
            action: AUDIT_ACTION.UPDATE_USER_ROLE,
            targetType: "user",
            targetId: target.id,
            metadata: { targetEmail: target.email, oldRole, newRole },
            request,
            success: true,
          },
          tx,
        );
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (reason === "PREVENT_LAST_SUPER_ADMIN") {
        await writeAdminAuditLog({
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.UPDATE_USER_ROLE,
          targetType: "user",
          targetId: userId,
          metadata: { newRole, reason: "last_super_admin_blocked" },
          request,
          success: false,
        });
        return apiError("FORBIDDEN", "系统必须至少保留一名超级管理员", 400);
      }
      // 其他事务错误（如数据库断开）走通用错误处理
      return apiError("TRANSACTION_FAILED", `事务执行失败: ${reason}`, 500);
    }

    return NextResponse.json({
      success: true,
      data: { message: "角色已更新", userId, oldRole: target.role, newRole },
      error: null,
    });
  }

  const oldRole = target.role;
  await db.user.update({ where: { id: userId }, data: { role: newRole } });

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.UPDATE_USER_ROLE,
    targetType: "user",
    targetId: userId,
    metadata: { targetEmail: target.email, oldRole, newRole },
    request,
    success: true,
  });

  return NextResponse.json({
    success: true,
    data: { message: "角色已更新", userId, oldRole, newRole },
    error: null,
  });
}

export async function DELETE(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const userId = typeof body.id === "string" ? body.id : "";
  if (!userId) return apiError("BAD_BODY", "缺少用户 ID");

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, isSystem: true } });
  if (!target) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "DELETE_USER",
      targetType: "user",
      targetId: userId,
      metadata: { reason: "user_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "用户不存在", 404);
  }

  if (actor?.id === target.id) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "DELETE_USER",
      targetType: "user",
      targetId: userId,
      metadata: { reason: "self_protect" },
      request,
      success: false,
    });
    return NextResponse.json(
      { success: false, error: { code: "SELF_PROTECT", message: "超级管理员不能修改自己的角色或删除自己" } },
      { status: 403 },
    );
  }

  if (target.isSystem) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "DELETE_USER",
      targetType: "user",
      targetId: userId,
      metadata: { reason: "system_account_immutable" },
      request,
      success: false,
    });
    return apiError("FORBIDDEN", "系统账号禁止删除", 400);
  }

// P0-B: 用户物理删除已暂停，等待 UsernameRegistry、用户名释放和日志保留政策确认。
// 当前返回 409，明确告知前端暂停原因。待政策确认后，将改为软删除。
  return NextResponse.json(
    { success: false, error: { code: "USER_DELETE_POLICY_PENDING", message: "账号注销和数据保留政策制定中，暂不可物理删除" } },
    { status: 409 },
  );
}
