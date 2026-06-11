import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const [reports, total, pending, processed, grouped] = await Promise.all([
    db.report.findMany({ orderBy: { createdAt: "desc" } }),
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
    reports: reports.map((report) => {
      const reportCount = counts.get(report.reportUrl) || 1;
      return {
        ...report,
        reportCount,
        highRisk: reportCount >= 5,
      };
    }),
  });
}
