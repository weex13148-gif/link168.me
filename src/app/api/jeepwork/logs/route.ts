import { NextResponse } from "next/server";
import { getJeepworkSessionUser, requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { pruneAllOldData } from "@/lib/data-cleanup";

export const runtime = "nodejs";

type LogType = "login" | "admin_audit" | "session";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function normalizeLogType(raw: unknown): LogType | "" {
  return raw === "login" || raw === "admin_audit" || raw === "session" ? raw : "";
}

function originalIpFromMetadata(metadataRaw: string | null) {
  if (!metadataRaw) return null;
  try {
    const metadata = JSON.parse(metadataRaw) as { ipAddress?: unknown };
    return typeof metadata.ipAddress === "string" && metadata.ipAddress.trim() ? metadata.ipAddress.trim() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const logType = normalizeLogType(url.searchParams.get("type")) || "login";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = 50;
  const actor = await getJeepworkSessionUser(request);

  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: "admin.view_logs",
    targetType: "admin_logs",
    targetId: logType,
    metadata: { page },
    request,
    success: true,
  }).catch(() => undefined);

  if (logType === "login") {
    const [logs, total] = await Promise.all([
      db.loginAttempt.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.loginAttempt.count(),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        type: logType,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        logs: logs.map((log) => ({
          id: log.id,
          email: log.email,
          ipAddress: log.ipAddress || "unknown",
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
      db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.adminAuditLog.count(),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        type: logType,
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
          ipAddress: originalIpFromMetadata(log.metadataRaw),
          createdAt: log.createdAt,
        })),
      },
      error: null,
    });
  }

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
      type: logType,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      logs: logs.map((log) => ({
        id: log.id,
        userEmail: log.user.email,
        userRole: log.user.role,
        ipAddress: log.ipAddress || "unknown",
        expiresAt: log.expiresAt,
        lastActive: log.lastActive,
        createdAt: log.createdAt,
      })),
    },
    error: null,
  });
}

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);

  let body: { action?: unknown };
  try {
    body = await request.json() as { action?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求格式不正确。", 400);
  }
  if (body.action !== "cleanup") return apiError("BAD_ACTION", "不支持的操作。", 400);

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
    data: { message: "180 天前的历史日志已清理。", deleted: result },
    error: null,
  });
}
