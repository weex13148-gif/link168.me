import { db } from "@/lib/db";

// 90 天清理阈值（毫秒）
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// 清理任务执行记录（用于审计）
export interface CleanupTaskResult {
  task: string;
  deleted: number;
  errors: string[];
  executedAt: Date;
}

export interface CleanupReport {
  totalDeleted: number;
  tasks: CleanupTaskResult[];
  executedAt: Date;
  errors: string[];
}

/**
 * 清理过期的会话
 */
export async function pruneOldSessions(): Promise<CleanupTaskResult> {
  const result: CleanupTaskResult = {
    task: "prune_old_sessions",
    deleted: 0,
    errors: [],
    executedAt: new Date(),
  };

  try {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const deleteResult = await db.session.deleteMany({
      where: {
        OR: [
          // 过期超过 90 天的 session
          { expiresAt: { lt: cutoff } },
          // 超过 90 天未活跃的 session
          { lastActive: { lt: cutoff } },
        ],
      },
    });
    result.deleted = deleteResult.count;
  } catch (error) {
    result.errors.push(`pruneOldSessions: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * 清理过期的登录尝试记录
 */
export async function pruneOldLoginAttempts(): Promise<CleanupTaskResult> {
  const result: CleanupTaskResult = {
    task: "prune_old_login_attempts",
    deleted: 0,
    errors: [],
    executedAt: new Date(),
  };

  try {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const deleteResult = await db.loginAttempt.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    result.deleted = deleteResult.count;
  } catch (error) {
    result.errors.push(`pruneOldLoginAttempts: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * 清理过期的管理员审计日志
 */
export async function pruneOldAdminAuditLogs(): Promise<CleanupTaskResult> {
  const result: CleanupTaskResult = {
    task: "prune_old_admin_audit_logs",
    deleted: 0,
    errors: [],
    executedAt: new Date(),
  };

  try {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const deleteResult = await db.adminAuditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    result.deleted = deleteResult.count;
  } catch (error) {
    result.errors.push(`pruneOldAdminAuditLogs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * 清理过期的链接点击记录（原始访问数据）
 * 注意：这是隐私合规的重要清理任务
 */
export async function pruneOldLinkClicks(): Promise<CleanupTaskResult> {
  const result: CleanupTaskResult = {
    task: "prune_old_link_clicks",
    deleted: 0,
    errors: [],
    executedAt: new Date(),
  };

  try {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const deleteResult = await db.linkClick.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    result.deleted = deleteResult.count;
  } catch (error) {
    result.errors.push(`pruneOldLinkClicks: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * 清理过期的短链接点击记录（等待 ShortLinkClick 模型添加后启用）
 * TODO: 当 ShortLinkClick 模型存在时，取消注释以下代码
 */
/*
export async function pruneOldShortLinkClicks(): Promise<CleanupTaskResult> {
  const result: CleanupTaskResult = {
    task: "prune_old_short_link_clicks",
    deleted: 0,
    errors: [],
    executedAt: new Date(),
  };

  try {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const deleteResult = await db.shortLinkClick.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    result.deleted = deleteResult.count;
  } catch (error) {
    result.errors.push(`pruneOldShortLinkClicks: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}
*/

/**
 * 执行所有清理任务
 * 返回清理报告，包含执行结果和错误信息
 */
export async function pruneAllOldData(): Promise<CleanupReport> {
  const [sessions, loginAttempts, adminAuditLogs, linkClicks] = await Promise.all([
    pruneOldSessions(),
    pruneOldLoginAttempts(),
    pruneOldAdminAuditLogs(),
    pruneOldLinkClicks(),
    // pruneOldShortLinkClicks(), // TODO: 当 ShortLinkClick 模型存在时启用
  ]);

  const tasks = [sessions, loginAttempts, adminAuditLogs, linkClicks];
  const allErrors = tasks.flatMap((t) => t.errors);

  return {
    totalDeleted: tasks.reduce((sum, t) => sum + t.deleted, 0),
    tasks,
    executedAt: new Date(),
    errors: allErrors,
  };
}

/**
 * 验证清理任务的健康状态
 * 检查是否有大量待清理的数据，或清理是否失败
 */
export async function checkCleanupHealth(): Promise<{
  healthy: boolean;
  warnings: string[];
  linkClicksPendingDeletion: number;
}> {
  const warnings: string[] = [];
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  // 检查有多少链接点击记录超过 90 天
  const oldLinkClicksCount = await db.linkClick.count({
    where: { createdAt: { lt: cutoff } },
  });

  // 如果有超过 10000 条待清理记录，发出警告
  if (oldLinkClicksCount > 10000) {
    warnings.push(`有 ${oldLinkClicksCount} 条链接点击记录超过 90 天未清理`);
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    linkClicksPendingDeletion: oldLinkClicksCount,
  };
}

/**
 * 获取数据保留状态摘要
 * 用于超级管理员查看数据保留合规状态
 */
export async function getDataRetentionSummary(): Promise<{
  linkClicksTotal: number;
  linkClicksOlderThan90Days: number;
  sessionsTotal: number;
  sessionsOlderThan90Days: number;
  loginAttemptsTotal: number;
  loginAttemptsOlderThan90Days: number;
  cutoffDate: Date;
}> {
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  const [
    linkClicksTotal,
    linkClicksOlderThan90Days,
    sessionsTotal,
    sessionsOlderThan90Days,
    loginAttemptsTotal,
    loginAttemptsOlderThan90Days,
  ] = await Promise.all([
    db.linkClick.count(),
    db.linkClick.count({ where: { createdAt: { lt: cutoff } } }),
    db.session.count(),
    db.session.count({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { lastActive: { lt: cutoff } },
        ],
      },
    }),
    db.loginAttempt.count(),
    db.loginAttempt.count({ where: { createdAt: { lt: cutoff } } }),
  ]);

  return {
    linkClicksTotal,
    linkClicksOlderThan90Days,
    sessionsTotal,
    sessionsOlderThan90Days,
    loginAttemptsTotal,
    loginAttemptsOlderThan90Days,
    cutoffDate: cutoff,
  };
}
