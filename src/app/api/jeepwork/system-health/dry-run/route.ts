// Dry Run - 只读统计预计影响数量，不写数据库
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const task = searchParams.get("task");

  const ninetyDaysCutoff = new Date(Date.now() - NINETY_DAYS_MS);
  const thirtyDaysCutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  try {
    const results: Record<string, { affectedCount: number; description: string }> = {};
    let totalAffected = 0;

    // 清理类任务
    if (!task || task === "prune_old_link_clicks") {
      const linkClicksCount = await db.linkClick.count({ where: { createdAt: { lt: ninetyDaysCutoff } } });
      results.prune_old_link_clicks = {
        affectedCount: linkClicksCount,
        description: `将删除 ${linkClicksCount} 条超过90天的链接点击记录`,
      };
      totalAffected += linkClicksCount;
    }

    if (!task || task === "prune_old_sessions") {
      const sessionsCount = await db.session.count({
        where: {
          OR: [
            { expiresAt: { lt: ninetyDaysCutoff } },
            { lastActive: { lt: ninetyDaysCutoff } },
          ],
        },
      });
      results.prune_old_sessions = {
        affectedCount: sessionsCount,
        description: `将删除 ${sessionsCount} 个超过90天未活跃的会话`,
      };
      totalAffected += sessionsCount;
    }

    if (!task || task === "prune_old_login_attempts") {
      const loginAttemptsCount = await db.loginAttempt.count({ where: { createdAt: { lt: ninetyDaysCutoff } } });
      results.prune_old_login_attempts = {
        affectedCount: loginAttemptsCount,
        description: `将删除 ${loginAttemptsCount} 条超过90天的登录尝试记录`,
      };
      totalAffected += loginAttemptsCount;
    }

    if (!task || task === "prune_old_admin_audit_logs") {
      const adminAuditLogsCount = await db.adminAuditLog.count({ where: { createdAt: { lt: ninetyDaysCutoff } } });
      results.prune_old_admin_audit_logs = {
        affectedCount: adminAuditLogsCount,
        description: `将删除 ${adminAuditLogsCount} 条超过90天的管理员审计日志`,
      };
      totalAffected += adminAuditLogsCount;
    }

    // 邮箱冻结任务
    if (!task || task === "cleanup_unverified_emails") {
      const unverifiedUsersCount = await db.user.count({
        where: {
          emailVerified: false,
          createdAt: { lt: thirtyDaysCutoff },
        },
      });
      results.cleanup_unverified_emails = {
        affectedCount: unverifiedUsersCount,
        description: `将冻结 ${unverifiedUsersCount} 个超过30天未验证邮箱的账号`,
      };
      totalAffected += unverifiedUsersCount;
    }

    return NextResponse.json({
      success: true,
      data: {
        isDryRun: true,
        task: task || "all",
        results,
        totalAffected,
        cutoffDates: {
          ninetyDays: ninetyDaysCutoff.toISOString(),
          thirtyDays: thirtyDaysCutoff.toISOString(),
        },
        executedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DRY_RUN_ERROR",
          message: error instanceof Error ? error.message : "Dry Run 计算失败",
        },
      },
      { status: 500 },
    );
  }
}
