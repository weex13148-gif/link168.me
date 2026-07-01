import { NextResponse } from "next/server";
import { getConfig } from "@/lib/app-config";
import { db } from "@/lib/db";
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

  const smtpComplete = Boolean(config.smtpHost && config.smtpUser && config.smtpPassword && config.mailFrom);
  const aiComplete = Boolean(config.aiApiKey && (config.aiProvider !== "bailian" || config.aiBailianAppId));
  const storageConfigured = config.storageProvider === "local"
    ? true
    : Boolean(config.storageEndpoint && config.storageBucket && config.storageAccessKeyId && config.storageAccessKeySecret);

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
        mail: {
          status: config.mailEnabled && smtpComplete ? "enabled" : config.mailEnabled ? "incomplete" : "disabled",
          label: config.mailEnabled && smtpComplete ? "已开启并配置完整" : config.mailEnabled ? "已开启但配置不完整" : "未启用",
        },
        ai: {
          status: config.aiEnabled && aiComplete ? "enabled" : config.aiEnabled ? "incomplete" : "disabled",
          label: config.aiEnabled && aiComplete ? "已开启并配置完整" : config.aiEnabled ? "已开启但配置不完整" : "未启用",
        },
        storage: {
          status: config.storageEnabled || config.storageProvider === "local" ? "configured" : "disabled",
          label: config.storageProvider === "local" ? "服务器本地存储" : storageConfigured ? "云存储已配置" : "云存储未配置",
        },
        payment: {
          status: config.paymentEnabled ? "enabled" : "disabled",
          label: config.paymentEnabled ? (config.paymentTestMode ? "已开启（测试模式）" : "已开启") : "未启用",
        },
      },
    },
    error: null,
  });
}
