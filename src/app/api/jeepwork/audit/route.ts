import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));

  // 过滤参数
  const actionFilter = url.searchParams.get("action") || "";
  const actorFilter = url.searchParams.get("actor") || "";
  const targetTypeFilter = url.searchParams.get("targetType") || "";
  const targetIdFilter = url.searchParams.get("targetId") || "";
  const successFilter = url.searchParams.get("success");
  const dateFrom = url.searchParams.get("from") || "";
  const dateTo = url.searchParams.get("to") || "";
  const showIp = url.searchParams.get("showIp") === "1";
  const ipReason = (url.searchParams.get("reason") || "").slice(0, 200);

  const actor = await getJeepworkSessionUser(request);

  // 记录 IP 查看审计日志
  if (showIp && ipReason) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "admin.view_original_ip",
      targetType: "audit_logs",
      targetId: "all",
      metadata: { action: actionFilter, actor: actorFilter, targetType: targetTypeFilter, reason: ipReason },
      request,
      success: true,
    }).catch(() => undefined);
  }

  // 构建 where 条件
  const where: Record<string, unknown> = {};
  if (actionFilter) {
    where.action = { contains: actionFilter, mode: "insensitive" };
  }
  if (actorFilter) {
    where.actorEmail = { contains: actorFilter, mode: "insensitive" };
  }
  if (targetTypeFilter) {
    where.targetType = { contains: targetTypeFilter, mode: "insensitive" };
  }
  if (targetIdFilter) {
    where.targetId = { contains: targetIdFilter, mode: "insensitive" };
  }
  if (successFilter === "true") where.success = true;
  else if (successFilter === "false") where.success = false;
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (!Number.isNaN(fromDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object || {}), gte: fromDate };
    }
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    if (!Number.isNaN(toDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object || {}), lte: toDate };
    }
  }

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
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
        metadataRaw: showIp ? log.metadataRaw : undefined,
        ipHash: showIp ? log.ipHash : undefined,
        userAgent: showIp ? log.userAgent : undefined,
        createdAt: log.createdAt,
      })),
    },
    error: null,
  });
}
