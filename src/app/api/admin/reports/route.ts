import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function normalizeStatus(raw: unknown) {
  if (raw === "待处理" || raw === "已处理") return raw as string;
  if (raw === "pending") return "待处理";
  if (raw === "processed") return "已处理";
  return "";
}

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = normalizeStatus(searchParams.get("status"));

  const whereItems: Array<Record<string, unknown>> = [];
  if (status) whereItems.push({ status });
  const where = whereItems.length > 0 ? { AND: whereItems } : undefined;

  const [reports, total, pending, processed, grouped] = await Promise.all([
    db.report.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    db.report.count(),
    db.report.count({ where: { status: "待处理" } }),
    db.report.count({ where: { status: "已处理" } }),
    db.report.groupBy({
      by: ["reportUrl"],
      _count: { reportUrl: true },
    }),
  ]);

  const counts = new Map(grouped.map((item) => [item.reportUrl, item._count.reportUrl]));

  return NextResponse.json({
    success: true,
    summary: { total, pending, processed },
    reports: reports.map((report) => ({
      id: report.id,
      reportUrl: report.reportUrl,
      reportType: report.reportType,
      reportReason: report.reportReason,
      contact: report.contact,
      imageUrl: report.imageUrl,
      status: report.status,
      handlerNote: report.handlerNote,
      processedAt: report.processedAt,
      createdAt: report.createdAt,
      reportCount: counts.get(report.reportUrl) || 1,
      highRisk: (counts.get(report.reportUrl) || 1) >= 5,
    })),
  });
}
