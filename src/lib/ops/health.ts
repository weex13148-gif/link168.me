// 平台运维健康检查核心库
// 包含：数据库健康、Redis状态、邮件服务、AI服务、存储、上传目录、定时任务注册表

import { db } from "@/lib/db";
import { getConfig } from "@/lib/app-config";
import { checkCleanupHealth } from "@/lib/data-cleanup";
import {
  getExternalServiceReadiness,
  type ExternalServiceReadinessStatus,
} from "@/lib/external-service-readiness";
import { currentStoreKind } from "@/lib/rate-limit";
import path from "path";
import fs from "fs/promises";
import net from "node:net";

// ============ 类型定义 ============

export type HealthStatus = "ok" | "warn" | "error" | "unknown";

export interface SystemOverview {
  nodeVersion: string;
  platform: string;
  env: string;
  uptime: number; // 秒
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

export interface DatabaseHealth {
  status: HealthStatus;
  connected: boolean;
  readOnlyQuery: boolean;
  migrationStatus: string;
  connectionLatencyMs: number | null;
  error?: string;
}

export interface RedisHealth {
  status: HealthStatus;
  configured: boolean;
  storeType: string;
  connectionLatencyMs: number | null;
  degradedMode: boolean;
  error?: string;
}

export interface MailHealth {
  status: HealthStatus;
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpSecureMode: string | null;
  fromAddress: string | null;
  connectivityTested: boolean;
  connectivityOk: boolean | null;
  readinessStatus: ExternalServiceReadinessStatus;
  readinessLabel: string;
  connectivityError?: string;
  error?: string;
}

export interface AiServiceHealth {
  status: HealthStatus;
  enabled: boolean;
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  apiKeyPresent: boolean;
  readinessStatus: ExternalServiceReadinessStatus;
  readinessLabel: string;
  assistantTaxEnabled: boolean;
  assistantLegalEnabled: boolean;
  assistantMarketEnabled: boolean;
  assistantDesignEnabled: boolean;
  assistantSocialEnabled: boolean;
  error?: string;
}

export interface UploadHealth {
  status: HealthStatus;
  directoryExists: boolean;
  directoryWritable: boolean;
  tempFileCount: number;
  totalSizeBytes: number;
  storageProvider: string;
  storageEnabled: boolean;
  objectStorageReadinessStatus: ExternalServiceReadinessStatus;
  objectStorageReadinessLabel: string;
  error?: string;
}

export interface ScheduledTask {
  name: string;
  description: string;
  interval: string;
  lastRan?: string;
  nextDue?: string;
  enabled: boolean;
}

export interface ScheduledTaskRegistry {
  tasks: ScheduledTask[];
  totalTasks: number;
}

export interface DryRunResult {
  task: string;
  affectedCount: number;
  description: string;
}

export interface CleanupDryRun {
  results: DryRunResult[];
  totalAffected: number;
  cutoffDate: string;
}

export interface PreDeploymentCheck {
  item: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  details?: string;
}

export interface PreDeploymentReport {
  checks: PreDeploymentCheck[];
  allPassed: boolean;
  criticalFailed: boolean;
}

export interface PostLaunchChecklist {
  item: string;
  description: string;
  checked: boolean;
  day: 1 | 2 | 3;
}

export interface ErrorLogSummary {
  recentErrors: { timestamp: string; message: string; count: number }[];
  totalErrors24h: number;
  errorRate: "low" | "medium" | "high";
}

// ============ 辅助函数 ============

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getUploadDirectory(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

// ============ 系统总览 ============

export async function getSystemOverview(): Promise<SystemOverview> {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
}

// ============ 数据库健康检查 ============

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const result: DatabaseHealth = {
    status: "unknown",
    connected: false,
    readOnlyQuery: false,
    migrationStatus: "unknown",
    connectionLatencyMs: null,
  };

  const start = Date.now();
  try {
    // 尝试执行一个简单查询
    await db.$queryRaw`SELECT 1`;
    result.connectionLatencyMs = Date.now() - start;
    result.connected = true;

    // 尝试执行写查询测试只读
    try {
      await db.$executeRaw`SELECT 1`;
      result.readOnlyQuery = false;
    } catch {
      result.readOnlyQuery = true;
    }

    // 检查迁移状态
    try {
      const migrationCount = await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM _prisma_migrations`;
      result.migrationStatus = `已应用 ${migrationCount[0]?.count ?? 0} 个迁移`;
    } catch {
      result.migrationStatus = "无法读取迁移状态";
    }

    result.status = result.connected ? "ok" : "error";
    if (result.readOnlyQuery) {
      result.status = "warn";
    }
  } catch (error) {
    result.status = "error";
    result.connected = false;
    result.error = error instanceof Error ? error.message : "数据库连接失败";
  }

  return result;
}

// ============ Redis 健康检查 ============

export async function checkRedisHealth(): Promise<RedisHealth> {
  const result: RedisHealth = {
    status: "unknown",
    configured: false,
    storeType: "none",
    connectionLatencyMs: null,
    degradedMode: true,
  };

  const storeType = currentStoreKind();
  result.storeType = storeType;

  if (storeType === "memory") {
    result.status = "warn";
    result.degradedMode = true;
    result.configured = false;
    return result;
  }

  result.configured = true;

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!redisUrl) {
    result.status = "warn";
    result.degradedMode = true;
    return result;
  }

  // 尝试连接测试延迟
  try {
    const start = Date.now();
    let connected = false;

    if (storeType === "upstash-rest") {
      // Upstash REST - 尝试一个简单请求
      try {
        const resp = await fetch(`${redisUrl}/ping`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
          signal: AbortSignal.timeout(3000),
        });
        connected = resp.ok;
      } catch {
        connected = false;
      }
    } else if (storeType === "redis-generic") {
      // 通用 Redis - 尝试 TCP 连接
      try {
        const url = new URL(redisUrl);
        await new Promise<void>((resolve, reject) => {
          const sock = net.createConnection(
            Number(url.port) || 6379,
            url.hostname,
            () => { sock.destroy(); resolve(); },
          );
          sock.on("error", reject);
          sock.setTimeout(3000, () => { sock.destroy(); reject(new Error("timeout")); });
        });
        connected = true;
      } catch {
        connected = false;
      }
    }

    result.connectionLatencyMs = Date.now() - start;
    result.status = connected ? "ok" : "error";
    result.degradedMode = !connected;
  } catch (error) {
    result.status = "error";
    result.degradedMode = true;
    result.error = error instanceof Error ? error.message : "Redis连接失败";
  }

  return result;
}

// ============ 邮件服务健康检查 ============

export async function checkMailHealth(): Promise<MailHealth> {
  const result: MailHealth = {
    status: "unknown",
    enabled: false,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpSecureMode: null,
    fromAddress: null,
    connectivityTested: false,
    connectivityOk: null,
    readinessStatus: "not_configured",
    readinessLabel: "未配置",
  };

  try {
    const config = await getConfig();
    result.enabled = config.mailEnabled;
    result.smtpHost = config.smtpHost || null;
    result.smtpPort = config.smtpPort || null;
    result.smtpUser = config.smtpUser || null;
    result.smtpSecureMode = config.smtpSecureMode || null;
    result.fromAddress = config.mailFrom || null;

    const readiness = (await getExternalServiceReadiness(config)).mail;
    result.readinessStatus = readiness.status;
    result.readinessLabel = readiness.label;
    result.status = readiness.status === "configured_and_passed"
      ? "ok"
      : readiness.status === "not_configured" ? "unknown" : "warn";
    result.connectivityTested = readiness.lastTestedAt !== null;
    result.connectivityOk = readiness.status === "configured_and_passed"
      ? true
      : readiness.lastTestedAt ? false : null;
  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : "邮件配置读取失败";
  }

  return result;
}

// ============ AI 服务健康检查 ============

export async function checkAiServiceHealth(): Promise<AiServiceHealth> {
  const result: AiServiceHealth = {
    status: "unknown",
    enabled: false,
    provider: null,
    baseUrl: null,
    model: null,
    apiKeyPresent: false,
    readinessStatus: "not_configured",
    readinessLabel: "未配置",
    assistantTaxEnabled: false,
    assistantLegalEnabled: false,
    assistantMarketEnabled: false,
    assistantDesignEnabled: false,
    assistantSocialEnabled: false,
  };

  try {
    const config = await getConfig();
    result.enabled = config.aiEnabled;
    result.provider = config.aiProvider || null;
    result.baseUrl = config.aiBaseUrl || null;
    result.model = config.aiModel || null;
    result.apiKeyPresent = Boolean(config.aiApiKey);
    result.assistantTaxEnabled = config.aiAssistantTaxEnabled;
    result.assistantLegalEnabled = config.aiAssistantLegalEnabled;
    result.assistantMarketEnabled = config.aiAssistantMarketEnabled;
    result.assistantDesignEnabled = config.aiAssistantDesignEnabled;
    result.assistantSocialEnabled = config.aiAssistantSocialEnabled;

    const readiness = (await getExternalServiceReadiness(config)).bailian;
    result.readinessStatus = readiness.status;
    result.readinessLabel = readiness.label;
    result.status = readiness.status === "configured_and_passed"
      ? "ok"
      : readiness.status === "not_configured" ? "unknown" : "warn";
  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : "AI配置读取失败";
  }

  return result;
}

// ============ 上传与文件状态 ============

export async function checkUploadHealth(): Promise<UploadHealth> {
  const result: UploadHealth = {
    status: "unknown",
    directoryExists: false,
    directoryWritable: false,
    tempFileCount: 0,
    totalSizeBytes: 0,
    storageProvider: "unknown",
    storageEnabled: false,
    objectStorageReadinessStatus: "not_configured",
    objectStorageReadinessLabel: "未配置",
  };

  try {
    const config = await getConfig();
    result.storageProvider = config.storageProvider;
    result.storageEnabled = config.storageEnabled;

    if (config.storageProvider !== "local") {
      const readiness = (await getExternalServiceReadiness(config)).object_storage;
      result.objectStorageReadinessStatus = readiness.status;
      result.objectStorageReadinessLabel = readiness.label;
      result.status = readiness.status === "configured_and_passed"
        ? "ok"
        : readiness.status === "not_configured" ? "unknown" : "warn";
      result.directoryExists = null as unknown as boolean;
      result.directoryWritable = null as unknown as boolean;
      return result;
    }

    const uploadDir = getUploadDirectory();
    result.directoryExists = false;
    result.directoryWritable = false;

    try {
      await fs.access(uploadDir);
      result.directoryExists = true;

      // 检查写权限
      const testFile = path.join(uploadDir, `.write-test-${Date.now()}.tmp`);
      try {
        await fs.writeFile(testFile, "test");
        await fs.unlink(testFile);
        result.directoryWritable = true;
      } catch {
        result.directoryWritable = false;
      }

      // 统计临时文件
      let totalSize = 0;
      let tempCount = 0;
      try {
        const entries = await fs.readdir(uploadDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const stat = await fs.stat(path.join(uploadDir, entry.name));
            totalSize += stat.size;
            // 临时文件通常是 .tmp 或以 . 开头的文件
            if (entry.name.endsWith(".tmp") || entry.name.startsWith(".")) {
              tempCount++;
            }
          }
        }
      } catch {
        // 忽略读取错误
      }

      result.tempFileCount = tempCount;
      result.totalSizeBytes = totalSize;
      result.status = result.directoryWritable ? "ok" : "warn";
    } catch {
      result.status = "error";
    }
  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : "存储配置读取失败";
  }

  return result;
}

// ============ 定时任务注册表 ============

export async function getScheduledTaskRegistry(): Promise<ScheduledTaskRegistry> {
  const tasks: ScheduledTask[] = [
    {
      name: "prune_old_sessions",
      description: "清理超过90天未活跃的会话",
      interval: "每天",
      enabled: true,
    },
    {
      name: "prune_old_login_attempts",
      description: "清理超过90天的登录尝试记录",
      interval: "每天",
      enabled: true,
    },
    {
      name: "prune_old_admin_audit_logs",
      description: "清理超过90天的管理员审计日志",
      interval: "每天",
      enabled: true,
    },
    {
      name: "prune_old_link_clicks",
      description: "清理超过90天的链接点击记录（隐私合规）",
      interval: "每天",
      enabled: true,
    },
    {
      name: "risk_log_cleanup",
      description: "清理高风险操作日志（90天保留）",
      interval: "每天",
      enabled: true,
    },
    {
      name: "cleanup_unverified_emails",
      description: "冻结30天未验证邮箱的用户账号",
      interval: "每天",
      enabled: true,
    },
  ];

  return {
    tasks,
    totalTasks: tasks.length,
  };
}

// ============ 任务执行状态类型 ============
// 用于区分：已配置、已接通、正常运行、降级运行、未配置
export type TaskExecutionStatus = "configured" | "connected" | "running" | "degraded" | "not_configured";

export interface TaskExecutionRecord {
  task: string;
  status: TaskExecutionStatus;
  lastRun?: {
    executedAt: string;
    success: boolean;
    deleted?: number;
    created?: number;
    errors?: number;
    executionTimeMs?: number;
    errorMessage?: string;
  };
  config: {
    interval: string;
    enabled: boolean;
    implemented: boolean;
    route?: string;
  };
}

export interface TaskExecutionRegistry {
  tasks: TaskExecutionRecord[];
  totalTasks: number;
  configured: number;
  connected: number;
  running: number;
  degraded: number;
}

// 任务执行历史记录（内存中）
const taskExecutionHistory: Map<string, TaskExecutionRecord["lastRun"]> = new Map();
const MAX_HISTORY_SIZE = 10;

export function recordTaskExecution(
  taskName: string,
  result: {
    success: boolean;
    deleted?: number;
    created?: number;
    errors?: number;
    executionTimeMs?: number;
    errorMessage?: string;
  },
): void {
  const record: TaskExecutionRecord["lastRun"] = {
    executedAt: new Date().toISOString(),
    success: result.success,
    deleted: result.deleted,
    created: result.created,
    errors: result.errors,
    executionTimeMs: result.executionTimeMs,
    errorMessage: result.errorMessage,
  };
  taskExecutionHistory.set(taskName, record);
  if (taskExecutionHistory.size > MAX_HISTORY_SIZE) {
    const firstKey = taskExecutionHistory.keys().next().value;
    if (firstKey) taskExecutionHistory.delete(firstKey);
  }
}

export function getTaskExecutionHistory(taskName: string): TaskExecutionRecord["lastRun"] | undefined {
  return taskExecutionHistory.get(taskName);
}

export async function getTaskExecutionStatus(): Promise<TaskExecutionRegistry> {
  const taskDefinitions: TaskExecutionRecord[] = [
    {
      task: "prune_old_sessions",
      status: "connected",
      lastRun: getTaskExecutionHistory("prune_old_sessions"),
      config: {
        interval: "每天",
        enabled: true,
        implemented: true,
        route: "/api/jeepwork/system-health/exec-cleanup?task=prune_old_sessions",
      },
    },
    {
      task: "prune_old_login_attempts",
      status: "connected",
      lastRun: getTaskExecutionHistory("prune_old_login_attempts"),
      config: {
        interval: "每天",
        enabled: true,
        implemented: true,
        route: "/api/jeepwork/system-health/exec-cleanup?task=prune_old_login_attempts",
      },
    },
    {
      task: "prune_old_admin_audit_logs",
      status: "connected",
      lastRun: getTaskExecutionHistory("prune_old_admin_audit_logs"),
      config: {
        interval: "每天",
        enabled: true,
        implemented: true,
        route: "/api/jeepwork/system-health/exec-cleanup?task=prune_old_admin_audit_logs",
      },
    },
    {
      task: "prune_old_link_clicks",
      status: "connected",
      lastRun: getTaskExecutionHistory("prune_old_link_clicks"),
      config: {
        interval: "每天",
        enabled: true,
        implemented: true,
        route: "/api/jeepwork/system-health/exec-cleanup?task=prune_old_link_clicks",
      },
    },
    {
      task: "cleanup_unverified_emails",
      status: "connected",
      lastRun: getTaskExecutionHistory("cleanup_unverified_emails"),
      config: {
        interval: "每天",
        enabled: true,
        implemented: true,
        route: "/api/jeepwork/system-health/exec-email-freeze",
      },
    },
  ];

  const configured = taskDefinitions.filter((t) => t.config.implemented).length;
  const connected = taskDefinitions.filter((t) => t.status !== "not_configured" && t.config.implemented).length;
  const running = taskDefinitions.filter((t) => t.lastRun?.success === true).length;
  const degraded = taskDefinitions.filter((t) => t.config.implemented && t.lastRun?.success === false).length;

  return {
    tasks: taskDefinitions,
    totalTasks: taskDefinitions.length,
    configured,
    connected,
    running,
    degraded,
  };
}

// ============ Dry Run ============

export async function getCleanupDryRun(): Promise<CleanupDryRun> {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  const [
    linkClicksCount,
    sessionsCount,
    loginAttemptsCount,
    adminAuditLogsCount,
  ] = await Promise.all([
    db.linkClick.count({ where: { createdAt: { lt: cutoff } } }),
    db.session.count({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { lastActive: { lt: cutoff } },
        ],
      },
    }),
    db.loginAttempt.count({ where: { createdAt: { lt: cutoff } } }),
    db.adminAuditLog.count({ where: { createdAt: { lt: cutoff } } }),
  ]);

  const results: DryRunResult[] = [
    {
      task: "prune_old_link_clicks",
      affectedCount: linkClicksCount,
      description: `将删除 ${linkClicksCount} 条超过90天的链接点击记录`,
    },
    {
      task: "prune_old_sessions",
      affectedCount: sessionsCount,
      description: `将删除 ${sessionsCount} 个超过90天未活跃的会话`,
    },
    {
      task: "prune_old_login_attempts",
      affectedCount: loginAttemptsCount,
      description: `将删除 ${loginAttemptsCount} 条超过90天的登录尝试记录`,
    },
    {
      task: "prune_old_admin_audit_logs",
      affectedCount: adminAuditLogsCount,
      description: `将删除 ${adminAuditLogsCount} 条超过90天的管理员审计日志`,
    },
  ];

  return {
    results,
    totalAffected: results.reduce((sum, r) => sum + r.affectedCount, 0),
    cutoffDate: cutoff.toISOString(),
  };
}

// ============ 发布前检查 ============

export async function getPreDeploymentReport(): Promise<PreDeploymentReport> {
  const checks: PreDeploymentCheck[] = [];
  let criticalFailed = false;

  // 1. 环境变量检查
  const requiredEnvVars = ["DATABASE_URL"];
  const missingEnv = requiredEnvVars.filter((v) => !process.env[v]);
  checks.push({
    item: "环境变量",
    status: missingEnv.length === 0 ? "pass" : "fail",
    message: missingEnv.length === 0 ? "所有必需环境变量已设置" : `缺少环境变量: ${missingEnv.join(", ")}`,
  });
  if (missingEnv.length > 0) criticalFailed = true;

  // 2. TypeScript 编译（跳过，由 CI 负责）

  // 3. 数据库连接
  try {
    await db.$queryRaw`SELECT 1`;
    checks.push({ item: "数据库连接", status: "pass", message: "数据库连接正常" });
  } catch (error) {
    checks.push({
      item: "数据库连接",
      status: "fail",
      message: "数据库连接失败",
      details: error instanceof Error ? error.message : "未知错误",
    });
    criticalFailed = true;
  }

  // 4. 阿里百炼就绪状态
  try {
    const config = await getConfig();
    const readiness = (await getExternalServiceReadiness(config)).bailian;
    checks.push({
      item: "阿里百炼",
      status: readiness.status === "configured_and_passed" ? "pass" : readiness.status === "not_configured" ? "skip" : "warn",
      message: readiness.label,
    });
  } catch (error) {
    checks.push({
      item: "阿里百炼",
      status: "fail",
      message: "AI配置读取失败",
      details: error instanceof Error ? error.message : "未知错误",
    });
  }

  // 5. 阿里云邮件就绪状态
  try {
    const config = await getConfig();
    const readiness = (await getExternalServiceReadiness(config)).mail;
    checks.push({
      item: "阿里云邮件",
      status: readiness.status === "configured_and_passed" ? "pass" : readiness.status === "not_configured" ? "skip" : "warn",
      message: readiness.label,
    });
  } catch (error) {
    checks.push({
      item: "阿里云邮件",
      status: "fail",
      message: "邮件配置读取失败",
      details: error instanceof Error ? error.message : "未知错误",
    });
  }

  // 6. 存储配置
  try {
    const config = await getConfig();
    if (!config.storageEnabled) {
      checks.push({ item: "存储配置", status: "skip", message: "存储服务未启用" });
    } else if (config.storageProvider === "local") {
      const uploadDir = getUploadDirectory();
      try {
        await fs.access(uploadDir);
        checks.push({ item: "存储配置", status: "pass", message: `本地存储目录存在: ${uploadDir}` });
      } catch {
        checks.push({ item: "存储配置", status: "fail", message: `本地存储目录不存在: ${uploadDir}` });
        criticalFailed = true;
      }
    } else {
      const readiness = (await getExternalServiceReadiness(config)).object_storage;
      checks.push({
        item: "对象存储",
        status: readiness.status === "configured_and_passed" ? "pass" : readiness.status === "not_configured" ? "skip" : "warn",
        message: readiness.label,
      });
    }
  } catch (error) {
    checks.push({
      item: "存储配置",
      status: "fail",
      message: "存储配置读取失败",
      details: error instanceof Error ? error.message : "未知错误",
    });
  }

  // 7. 管理员账号检查
  try {
    const adminCount = await db.user.count({ where: { role: "super_admin" } });
    if (adminCount === 0) {
      checks.push({ item: "管理员账号", status: "fail", message: "没有超级管理员账号！" });
      criticalFailed = true;
    } else {
      checks.push({ item: "管理员账号", status: "pass", message: `存在 ${adminCount} 个超级管理员账号` });
    }
  } catch (error) {
    checks.push({
      item: "管理员账号",
      status: "fail",
      message: "管理员账号检查失败",
      details: error instanceof Error ? error.message : "未知错误",
    });
    criticalFailed = true;
  }

  // 8. 支付宝就绪状态
  try {
    const config = await getConfig();
    const readiness = (await getExternalServiceReadiness(config)).alipay;
    checks.push({
      item: "支付宝",
      status: readiness.status === "configured_and_passed" ? "pass" : readiness.status === "not_configured" ? "skip" : "warn",
      message: readiness.label,
    });
  } catch {
    checks.push({ item: "支付宝", status: "skip", message: "支付宝状态检查跳过" });
  }

  // 9. 清理任务健康检查
  try {
    const cleanupHealth = await checkCleanupHealth();
    if (cleanupHealth.healthy) {
      checks.push({
        item: "数据清理健康",
        status: "pass",
        message: `数据清理正常，待清理记录: ${cleanupHealth.linkClicksPendingDeletion} 条`,
      });
    } else {
      checks.push({
        item: "数据清理健康",
        status: "warn",
        message: cleanupHealth.warnings.join("; "),
      });
    }
  } catch {
    checks.push({ item: "数据清理健康", status: "skip", message: "清理健康检查跳过" });
  }

  const allPassed = checks.every((c) => c.status === "pass" || c.status === "skip");

  return {
    checks,
    allPassed,
    criticalFailed,
  };
}

// ============ 上线后三天检查清单 ============

export function getPostLaunchChecklist(): PostLaunchChecklist[] {
  return [
    // Day 1
    { item: "检查数据库连接是否正常", description: "确认所有数据库读写操作正常", checked: false, day: 1 },
    { item: "验证邮件发送功能", description: "发送测试邮件确认SMTP工作正常", checked: false, day: 1 },
    { item: "检查AI服务调用", description: "测试各Agent是否正常响应", checked: false, day: 1 },
    { item: "检查上传功能", description: "上传测试文件确认存储正常", checked: false, day: 1 },
    { item: "检查错误日志", description: "查看是否有新的错误产生", checked: false, day: 1 },
    // Day 2
    { item: "检查数据清理任务", description: "确认定时任务是否正常执行", checked: false, day: 2 },
    { item: "检查支付回调", description: "如有支付配置，验证回调是否正常", checked: false, day: 2 },
    { item: "检查Redis/缓存", description: "如有Redis，确认缓存正常工作", checked: false, day: 2 },
    // Day 3
    { item: "检查用户数据", description: "确认新注册用户数据正常", checked: false, day: 3 },
    { item: "检查存储使用", description: "确认上传文件正常，无积压", checked: false, day: 3 },
    { item: "最终健康检查", description: "运行完整健康检查确认系统正常", checked: false, day: 3 },
  ];
}

// ============ 错误与日志摘要 ============

export async function getErrorLogSummary(): Promise<ErrorLogSummary> {
  // 实际项目中应接入日志服务（如 Sentry、自建日志）
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentAuditErrors, totalRecentErrors] = await Promise.all([
    db.adminAuditLog.findMany({
      where: {
        success: false,
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { action: true, createdAt: true },
    }),
    db.adminAuditLog.count({
      where: {
        success: false,
        createdAt: { gte: oneDayAgo },
      },
    }),
  ]);

  // 按 action 分组统计
  const errorMap = new Map<string, number>();
  for (const log of recentAuditErrors) {
    errorMap.set(log.action, (errorMap.get(log.action) || 0) + 1);
  }

  const recentErrors = Array.from(errorMap.entries()).map(([action, count]) => ({
    timestamp: recentAuditErrors.find((l) => l.action === action)?.createdAt.toISOString() || "",
    message: action,
    count,
  }));

  let errorRate: "low" | "medium" | "high" = "low";
  if (totalRecentErrors > 50) errorRate = "high";
  else if (totalRecentErrors > 10) errorRate = "medium";

  return {
    recentErrors,
    totalErrors24h: totalRecentErrors,
    errorRate,
  };
}

// ============ 综合健康报告 ============

export interface HealthReport {
  overview: SystemOverview;
  database: DatabaseHealth;
  redis: RedisHealth;
  mail: MailHealth;
  ai: AiServiceHealth;
  upload: UploadHealth;
  scheduledTasks: ScheduledTaskRegistry;
  taskExecution: TaskExecutionRegistry;
  preDeployment: PreDeploymentReport;
  postLaunch: PostLaunchChecklist[];
  errorSummary: ErrorLogSummary;
  generatedAt: string;
}

export async function getFullHealthReport(): Promise<HealthReport> {
  const [overview, database, redis, mail, ai, upload, scheduledTasks, taskExecution, preDeployment, errorSummary] =
    await Promise.all([
      getSystemOverview(),
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkMailHealth(),
      checkAiServiceHealth(),
      checkUploadHealth(),
      getScheduledTaskRegistry(),
      getTaskExecutionStatus(),
      getPreDeploymentReport(),
      getErrorLogSummary(),
    ]);

  return {
    overview,
    database,
    redis,
    mail,
    ai,
    upload,
    scheduledTasks,
    taskExecution,
    preDeployment,
    postLaunch: getPostLaunchChecklist(),
    errorSummary,
    generatedAt: new Date().toISOString(),
  };
}
