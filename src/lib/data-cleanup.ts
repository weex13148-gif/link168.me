import { db } from "@/lib/db";

const RETENTION_DAYS = 180;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

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

function result(task: string): CleanupTaskResult {
  return { task, deleted: 0, errors: [], executedAt: new Date() };
}

function cutoffDate() {
  return new Date(Date.now() - RETENTION_MS);
}

export async function pruneOldSessions(): Promise<CleanupTaskResult> {
  const output = result("prune_old_sessions");
  try {
    const cutoff = cutoffDate();
    const deleted = await db.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { lastActive: { lt: cutoff } },
        ],
      },
    });
    output.deleted = deleted.count;
  } catch (error) {
    output.errors.push(`pruneOldSessions: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return output;
}

export async function pruneOldLoginAttempts(): Promise<CleanupTaskResult> {
  const output = result("prune_old_login_attempts");
  try {
    const deleted = await db.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoffDate() } } });
    output.deleted = deleted.count;
  } catch (error) {
    output.errors.push(`pruneOldLoginAttempts: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return output;
}

export async function pruneOldAdminAuditLogs(): Promise<CleanupTaskResult> {
  const output = result("prune_old_admin_audit_logs");
  try {
    const deleted = await db.adminAuditLog.deleteMany({ where: { createdAt: { lt: cutoffDate() } } });
    output.deleted = deleted.count;
  } catch (error) {
    output.errors.push(`pruneOldAdminAuditLogs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return output;
}

export async function pruneOldLinkClicks(): Promise<CleanupTaskResult> {
  const output = result("prune_old_link_clicks");
  try {
    const deleted = await db.linkClick.deleteMany({ where: { createdAt: { lt: cutoffDate() } } });
    output.deleted = deleted.count;
  } catch (error) {
    output.errors.push(`pruneOldLinkClicks: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return output;
}

export async function pruneAllOldData(): Promise<CleanupReport> {
  const tasks = await Promise.all([
    pruneOldSessions(),
    pruneOldLoginAttempts(),
    pruneOldAdminAuditLogs(),
    pruneOldLinkClicks(),
  ]);
  return {
    totalDeleted: tasks.reduce((sum, item) => sum + item.deleted, 0),
    tasks,
    executedAt: new Date(),
    errors: tasks.flatMap((item) => item.errors),
  };
}

export async function checkCleanupHealth(): Promise<{
  healthy: boolean;
  warnings: string[];
  linkClicksPendingDeletion: number;
}> {
  const warnings: string[] = [];
  const linkClicksPendingDeletion = await db.linkClick.count({ where: { createdAt: { lt: cutoffDate() } } });
  if (linkClicksPendingDeletion > 10000) {
    warnings.push(`有 ${linkClicksPendingDeletion} 条链接点击记录超过 ${RETENTION_DAYS} 天未清理`);
  }
  return { healthy: warnings.length === 0, warnings, linkClicksPendingDeletion };
}

export async function getDataRetentionSummary(): Promise<{
  linkClicksTotal: number;
  linkClicksOlderThan90Days: number;
  sessionsTotal: number;
  sessionsOlderThan90Days: number;
  loginAttemptsTotal: number;
  loginAttemptsOlderThan90Days: number;
  cutoffDate: Date;
}> {
  // 为兼容现有后台类型，字段名暂时保留 OlderThan90Days，实际阈值已经调整为 180 天。
  const cutoff = cutoffDate();
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
    db.session.count({ where: { OR: [{ expiresAt: { lt: cutoff } }, { lastActive: { lt: cutoff } }] } }),
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
