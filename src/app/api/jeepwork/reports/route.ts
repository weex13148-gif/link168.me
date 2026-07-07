import { NextResponse } from "next/server";
import { requireJeepworkAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function normalizeStatus(status: string | null): "待处理" | "已处理" | "已驳回" {
  if (!status) return "待处理";
  const s = String(status).trim();
  if (s === "pending" || s === "待处理") return "待处理";
  if (s === "processed" || s === "已处理") return "已处理";
  if (s === "rejected" || s === "已驳回") return "已驳回";
  return "待处理";
}

// 仅保留 GET 列表查询（不再提供 PATCH 批量/单条更新在 list 路由上；
// 单条更新统一走 /reports/[id] PATCH）。

export async function GET(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status");
  const filterBucket = statusRaw ? normalizeStatus(statusRaw) : null;
  const filterWhere = filterBucket ? { status: filterBucket } : undefined;

  const reports = await db.report.findMany({ where: filterWhere, orderBy: { createdAt: "desc" }, take: 200 });

  let total = 0;
  let pending = 0;
  let processed = 0;
  let rejected = 0;
  if (filterBucket) {
    total = reports.length;
    pending = filterBucket === "待处理" ? reports.length : 0;
    processed = filterBucket === "已处理" ? reports.length : 0;
    rejected = filterBucket === "已驳回" ? reports.length : 0;
  } else {
    total = reports.length;
    for (const r of reports) {
      const bucket = normalizeStatus(r.status);
      if (bucket === "待处理") pending += 1;
      else if (bucket === "已处理") processed += 1;
      else if (bucket === "已驳回") rejected += 1;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: { total, pending, processed, rejected },
      reports: reports.map((report) => ({
        id: report.id,
        reportUrl: report.reportUrl,
        reportType: report.reportType,
        reportReason: report.reportReason,
        contact: report.contact,
        imageUrl: report.imageUrl,
        status: normalizeStatus(report.status),
        handlerNote: report.handlerNote,
        processedAt: report.processedAt,
        createdAt: report.createdAt,
      })),
    },
    error: null,
  });
}
