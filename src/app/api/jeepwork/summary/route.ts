import { NextResponse } from "next/server";
import { getConfig } from "@/lib/app-config";
import { db } from "@/lib/db";
import { getExternalServiceReadiness } from "@/lib/external-service-readiness";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    todayUsers,
    verifiedUsers,
    paidUsers,
    pendingReports,
    activeRestrictions,
    todayMailCount,
    todayMailFailures,
    aiUsage,
    config,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: today } } }),
    db.user.count({ where: { emailVerified: true } }),
    db.membershipSubscription.count({ where: { status: "active", planCode: { not: "free" } } }),
    db.report.count({ where: { status: "待处理" } }),
    db.freezeRecord.count({ where: { isActive: true } }),
    db.emailSendLog.count({ where: { createdAt: { gte: today } } }),
    db.emailSendLog.count({ where: { createdAt: { gte: today }, success: false } }),
    db.aiUsageLog.aggregate({ where: { usageDate: today }, _sum: { callCount: true } }),
    getConfig(),
  ]);

  const externalServices = await getExternalServiceReadiness(config);

  return NextResponse.json({
    success: true,
    data: {
      counts: {
        totalUsers,
        todayUsers,
        verifiedUsers,
        unverifiedUsers: Math.max(0, totalUsers - verifiedUsers),
        paidUsers,
        pendingReports,
        activeRestrictions,
        todayMailCount,
        todayMailFailures,
        todayAiCalls: aiUsage._sum.callCount || 0,
      },
      services: {
        database: { status: "available", label: "数据库可连接" },
        bailian: externalServices.bailian,
        mail: externalServices.mail,
        alipay: externalServices.alipay,
        object_storage: externalServices.object_storage,
      },
    },
    error: null,
  });
}
