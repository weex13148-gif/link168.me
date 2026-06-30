import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { pruneAllOldData } from "@/lib/data-cleanup";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

type LogType = "login" | "admin_audit" | "session";

function normalizeLogType(raw: unknown): LogType | "" {
  if (raw === "login" || raw === "admin_audit" || raw === "session") return raw;
  return "";
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const logType = normalizeLogType(url.searchParams.get("type"));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = 50;

  const actor = await getJeepworkSessionUser(request);
  const showIp = url.searchParams.get("showIp") === "1";
  const reason = (url.searchParams.get("reason") || "").slice(0, 200);

  // 记录 IP 查看审计日志
  if (showIp && reason) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "admin.view_original_ip",
      targetType: "admin_logs",
      targetId: logType || "all",
      metadata: { logType, reason },
      request,
      success: true,
    }).catch(() => undefined);
  }

  if (!logType || logType === "login") {
    // 登录日志
    const [logs, total] = await Promise.all([
      db.loginAttempt.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.loginAttempt.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: "login",
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        logs: logs.map((log) => ({
          id: log.id,
          email: log.email,
          ipAddress: showIp ? log.ipAddress : maskIp(log.ipAddress),
          success: log.success,
          locked: log.locked,
          lockUntil: log.lockUntil,
          createdAt: log.createdAt,
        })),
      },
      error: null,
    });
  }

  if (logType === "admin_audit") {
    const [logs, total] = await Promise.all([
      db.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.adminAuditLog.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: "admin_audit",
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        logs: logs.map((log) => ({
          id: log.id,
          actorEmail: log.actorEmail,
          actorRole: log.actorRole,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          success: log.success,
          ipHash: showIp ? log.ipHash : undefined,
          createdAt: log.createdAt,
        })),
      },
      error: null,
    });
  }

  if (logType === "session") {
    const [logs, total] = await Promise.all([
      db.session.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true, role: true } } },
      }),
      db.session.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        type: "session",
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        logs: logs.map((log) => ({
          id: log.id,
          userEmail: log.user.email,
          userRole: log.user.role,
          ipAddress: showIp ? log.ipAddress : maskIp(log.ipAddress || ""),
          expiresAt: log.expiresAt,
          lastActive: log.lastActive,
          createdAt: log.createdAt,
        })),
      },
      error: null,
    });
  }

  return apiError("INVALID_TYPE", "无效的日志类型", 400);
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  if (body.action !== "cleanup") {
    return apiError("BAD_ACTION", "未知操作", 400);
  }

  const result = await pruneAllOldData();

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: "admin.data_cleanup",
    targetType: "system",
    targetId: "data-cleanup",
    metadata: { deleted: result },
    request,
    success: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      message: "90 天前的历史数据已清理",
      deleted: result,
    },
    error: null,
  });
}

function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length > 2 ? `${parts.slice(0, 2).join(":")}:****` : "****";
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return "****";
  return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
}
