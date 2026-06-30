// 执行数据清理任务 - 真实写数据库
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { pruneOldSessions, pruneOldLoginAttempts, pruneOldAdminAuditLogs, pruneOldLinkClicks } from "@/lib/data-cleanup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const task = searchParams.get("task");

  // 支持按任务名执行单个或全部执行
  const allowedTasks = ["prune_old_sessions", "prune_old_login_attempts", "prune_old_admin_audit_logs", "prune_old_link_clicks"];

  const startTime = Date.now();

  try {
    let results: Record<string, { deleted: number; errors: string[] }> = {};
    let totalDeleted = 0;
    const errors: string[] = [];

    if (task && allowedTasks.includes(task)) {
      // 单个任务执行
      const result = await executeSingleTask(task);
      results[task] = result;
      totalDeleted += result.deleted;
      errors.push(...result.errors);
    } else {
      // 全部任务执行
      const [sessionsResult, loginAttemptsResult, adminAuditLogsResult, linkClicksResult] = await Promise.all([
        pruneOldSessions(),
        pruneOldLoginAttempts(),
        pruneOldAdminAuditLogs(),
        pruneOldLinkClicks(),
      ]);

      results = {
        prune_old_sessions: { deleted: sessionsResult.deleted, errors: sessionsResult.errors },
        prune_old_login_attempts: { deleted: loginAttemptsResult.deleted, errors: loginAttemptsResult.errors },
        prune_old_admin_audit_logs: { deleted: adminAuditLogsResult.deleted, errors: adminAuditLogsResult.errors },
        prune_old_link_clicks: { deleted: linkClicksResult.deleted, errors: linkClicksResult.errors },
      };

      totalDeleted = sessionsResult.deleted + loginAttemptsResult.deleted + adminAuditLogsResult.deleted + linkClicksResult.deleted;
      errors.push(
        ...sessionsResult.errors,
        ...loginAttemptsResult.errors,
        ...adminAuditLogsResult.errors,
        ...linkClicksResult.errors,
      );
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        executed: true,
        task: task || "all",
        results,
        totalDeleted,
        totalErrors: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        executionTimeMs,
        executedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLEANUP_EXECUTION_ERROR",
          message: error instanceof Error ? error.message : "清理任务执行失败",
          executionTimeMs,
        },
      },
      { status: 500 },
    );
  }
}

async function executeSingleTask(taskName: string): Promise<{ deleted: number; errors: string[] }> {
  switch (taskName) {
    case "prune_old_sessions": {
      const result = await pruneOldSessions();
      return { deleted: result.deleted, errors: result.errors };
    }
    case "prune_old_login_attempts": {
      const result = await pruneOldLoginAttempts();
      return { deleted: result.deleted, errors: result.errors };
    }
    case "prune_old_admin_audit_logs": {
      const result = await pruneOldAdminAuditLogs();
      return { deleted: result.deleted, errors: result.errors };
    }
    case "prune_old_link_clicks": {
      const result = await pruneOldLinkClicks();
      return { deleted: result.deleted, errors: result.errors };
    }
    default:
      return { deleted: 0, errors: [`Unknown task: ${taskName}`] };
  }
}
