"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminAlertBanner } from "@/components/admin/AdminKit";
import { ConfirmModal, type ConfirmModalDangerLevel } from "@/components/admin/ConfirmModal";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

type HealthStatus = "ok" | "warn" | "error" | "unknown";
type TaskExecutionStatus = "configured" | "connected" | "running" | "degraded" | "not_configured";

interface SystemOverview {
  nodeVersion: string;
  platform: string;
  env: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

interface DatabaseHealth {
  status: HealthStatus;
  connected: boolean;
  readOnlyQuery: boolean;
  migrationStatus: string;
  connectionLatencyMs: number | null;
  error?: string;
}

interface RedisHealth {
  status: HealthStatus;
  configured: boolean;
  storeType: string;
  connectionLatencyMs: number | null;
  degradedMode: boolean;
  error?: string;
}

interface MailHealth {
  status: HealthStatus;
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpSecureMode: string | null;
  fromAddress: string | null;
  connectivityTested: boolean;
  connectivityOk: boolean | null;
}

interface AiServiceHealth {
  status: HealthStatus;
  enabled: boolean;
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  apiKeyPresent: boolean;
  assistantTaxEnabled: boolean;
  assistantLegalEnabled: boolean;
  assistantMarketEnabled: boolean;
  assistantDesignEnabled: boolean;
  assistantSocialEnabled: boolean;
}

interface UploadHealth {
  status: HealthStatus;
  directoryExists: boolean;
  directoryWritable: boolean;
  tempFileCount: number;
  totalSizeBytes: number;
  storageProvider: string;
  storageEnabled: boolean;
}

interface ScheduledTask {
  name: string;
  description: string;
  interval: string;
  enabled: boolean;
}

interface ScheduledTaskRegistry {
  tasks: ScheduledTask[];
  totalTasks: number;
}

interface TaskExecutionRecord {
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

interface TaskExecutionRegistry {
  tasks: TaskExecutionRecord[];
  totalTasks: number;
  configured: number;
  connected: number;
  running: number;
  degraded: number;
}

interface DryRunResult {
  task: string;
  affectedCount: number;
  description: string;
}

interface CleanupDryRun {
  results: DryRunResult[];
  totalAffected: number;
  cutoffDate: string;
}

interface PreDeploymentCheck {
  item: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  details?: string;
}

interface PreDeploymentReport {
  checks: PreDeploymentCheck[];
  allPassed: boolean;
  criticalFailed: boolean;
}

interface PostLaunchChecklist {
  item: string;
  description: string;
  checked: boolean;
  day: 1 | 2 | 3;
}

interface ErrorLogSummary {
  recentErrors: { timestamp: string; message: string; count: number }[];
  totalErrors24h: number;
  errorRate: "low" | "medium" | "high";
}

interface HealthReport {
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

function StatusBadge({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, { bg: string; text: string; label: string }> = {
    ok: { bg: "#E6F0D8", text: "#355126", label: "正常" },
    warn: { bg: "#FFF9E8", text: "#8C612E", label: "警告" },
    error: { bg: "#FFF1F0", text: "#B42318", label: "错误" },
    unknown: { bg: "#F2EDE3", text: "#7A6D5E", label: "未知" },
  };
  const c = colors[status] || colors.unknown;
  return (
    <span
      style={{ background: c.bg, color: c.text }}
      className="rounded-2xl px-3 py-1 text-xs font-black"
    >
      {c.label}
    </span>
  );
}

function TaskExecutionStatusBadge({ status }: { status: TaskExecutionStatus }) {
  const config: Record<TaskExecutionStatus, { bg: string; text: string; label: string }> = {
    configured: { bg: "#E6F0D8", text: "#355126", label: "已配置" },
    connected: { bg: "#E6F0D8", text: "#355126", label: "已接通" },
    running: { bg: "#E6F0D8", text: "#355126", label: "正常运行" },
    degraded: { bg: "#FFF9E8", text: "#8C612E", label: "降级运行" },
    not_configured: { bg: "#F2EDE3", text: "#7A6D5E", label: "未配置" },
  };
  const c = config[status] || config.not_configured;
  return (
    <span
      style={{ background: c.bg, color: c.text }}
      className="rounded-2xl px-3 py-1 text-xs font-black"
    >
      {c.label}
    </span>
  );
}

function SectionCard({
  title,
  eyebrow,
  highlight,
  children,
}: {
  title: string;
  eyebrow: string;
  highlight: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: highlight }}>
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-black text-[#2B241E]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F2EDE3] last:border-0">
      <span className="text-sm font-bold text-[#7A6D5E]">{label}</span>
      <span className={`text-sm font-bold text-[#2B241E] ${mono ? "font-mono" : ""}`}>
        {value ?? "-"}
      </span>
    </div>
  );
}

function ChecklistItem({
  item,
  checked,
  onChange,
}: {
  item: PostLaunchChecklist;
  checked: boolean;
  onChange: (item: string, val: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[#E8DCCB] p-4 cursor-pointer hover:bg-[#FFFDF8] transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(item.item, e.target.checked)}
        className="mt-1 size-5 rounded border-[#E8DCCB] accent-[#6F8F4E]"
      />
      <div className="flex-1">
        <p className="font-bold text-[#2B241E]">{item.item}</p>
        <p className="mt-1 text-sm text-[#7A6D5E]">{item.description}</p>
        <span className="mt-2 inline-block rounded-2xl bg-[#F2EDE3] px-2 py-0.5 text-xs font-bold text-[#7A6D5E]">
          第{item.day}天
        </span>
      </div>
    </label>
  );
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [dryRun, setDryRun] = useState<CleanupDryRun | null>(null);
  const [showDryRun, setShowDryRun] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "checks" | "checklist" | "dry-run" | "tasks">("overview");
  const [postLaunchState, setPostLaunchState] = useState<PostLaunchChecklist[]>([]);
  const [executingTask, setExecutingTask] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<Record<string, unknown> | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    dangerLevel: ConfirmModalDangerLevel;
    onConfirm: () => void | Promise<void>;
    onConfirmWithReason?: (reason: string) => void | Promise<void>;
    impactList?: string[];
    irreversibleNotice?: string;
    requireReason?: boolean;
    reasonMinLength?: number;
    reasonPlaceholder?: string;
    inputConfirmMatch?: string;
    inputPlaceholder?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const result = (await response.json()) as { success?: boolean; user?: AdminUser };
        if (!cancelled) {
          if (result.success && result.user?.role === "super_admin") {
            setUser(result.user);
          } else {
            router.push("/jeepwork");
          }
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jeepwork/system-health", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: HealthReport };
      if (json.success && json.data) {
        setReport(json.data);
        setPostLaunchState(json.data.postLaunch);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const loadDryRun = useCallback(async () => {
    try {
      const res = await fetch("/api/jeepwork/system-health?section=dry-run", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: CleanupDryRun };
      if (json.success && json.data) {
        setDryRun(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user?.role === "super_admin") {
      void loadHealth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (showDryRun && !dryRun) {
      void loadDryRun();
    }
  }, [showDryRun, dryRun, loadDryRun]);

  const logout = useJeepworkLogout(router);

  function handleChecklistChange(itemName: string, checked: boolean) {
    setPostLaunchState((prev) =>
      prev.map((p) => (p.item === itemName ? { ...p, checked } : p))
    );
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}天 ${h}小时 ${m}分钟`;
  }

  function executeTask(taskName: string) {
    if (executingTask) return;
    setConfirmModal({
      open: true,
      title: "确认执行任务",
      description: `确定要执行任务 "${taskName}" 吗？这将真实修改数据库。`,
      dangerLevel: "critical",
      impactList: [
        `将执行任务：${taskName}`,
        "数据库将被真实修改",
        "操作将写入审计日志",
      ],
      irreversibleNotice: "此操作将真实修改数据库，不可撤销",
      requireReason: true,
      reasonMinLength: 10,
      inputConfirmMatch: "CONFIRM",
      inputPlaceholder: "请输入 CONFIRM",
      onConfirm: async () => {
        /* handled by onConfirmWithReason */
      },
      onConfirmWithReason: async () => {
        setExecutingTask(taskName);
        setExecResult(null);
        try {
          let url = "";
          let method = "POST";
          if (taskName === "cleanup_unverified_emails") {
            url = "/api/jeepwork/system-health/exec-email-freeze";
          } else {
            url = `/api/jeepwork/system-health/exec-cleanup?task=${encodeURIComponent(taskName)}`;
          }
          const res = await fetch(url, { method });
          const json = await res.json() as { success?: boolean; data?: Record<string, unknown>; error?: { message?: string } };
          if (json.success && json.data) {
            setExecResult(json.data);
          } else {
            setExecResult({ error: json.error?.message || "执行失败" });
          }
          // 刷新健康数据以更新任务状态
          await loadHealth();
        } catch (err) {
          setExecResult({ error: err instanceof Error ? err.message : "网络错误" });
        }
        setExecutingTask(null);
        setConfirmModal(null);
      },
    });
  }

  if (!user) return null;

  return (
    <AdminShell
      currentPageLabel="平台运维健康中心"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "System Health",
        title: "平台运维健康中心",
        subtitle: "系统健康总览、数据库、Redis、邮件、AI服务、存储与定时任务监控。仅超级管理员可访问。",
        highlight: "#6F8F4E",
      }}
    >
      <AdminAlertBanner tone="warning" title="已知限制：限流计数存于单机内存"><p>当前限流计数存储于单机内存，多实例部署时不生效。部分健康检查为配置存在性检查，非真实服务探测。</p></AdminAlertBanner>
      {/* 标签切换 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "overview", label: "健康总览" },
          { key: "checks", label: "发布前检查" },
          { key: "checklist", label: "上线后清单" },
          { key: "tasks", label: "任务执行" },
          { key: "dry-run", label: "Dry Run" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`min-h-11 rounded-2xl px-5 text-sm font-bold transition ${
              activeTab === tab.key
                ? "bg-[#6F8F4E] text-white"
                : "border border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F5F0E7]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void loadHealth()}
          className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-5 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7]"
          disabled={loading}
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>

      {loading && !report ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E]">
          正在加载健康数据…
        </div>
      ) : null}

      {/* ========== 健康总览 ========== */}
      {activeTab === "overview" && report && (
        <div className="mt-6 grid gap-6">
          {/* 系统总览 */}
          <SectionCard title="系统总览" eyebrow="Overview" highlight="#6F8F4E">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">Node.js 版本</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">{report.overview.nodeVersion}</p>
              </div>
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">运行环境</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">{report.overview.env}</p>
              </div>
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">运行时间</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">{formatUptime(report.overview.uptime)}</p>
              </div>
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">内存使用</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">
                  {formatBytes(report.overview.memoryUsage.heapUsed)} / {formatBytes(report.overview.memoryUsage.heapTotal)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">操作系统</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">{report.overview.platform}</p>
              </div>
              <div className="rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-xs font-bold text-[#7A6D5E]">最后更新</p>
                <p className="mt-1 text-lg font-black text-[#2B241E]">
                  {new Date(report.generatedAt).toLocaleTimeString("zh-CN", { hour12: false })}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* 数据库健康 */}
          <SectionCard title="数据库健康" eyebrow="Database" highlight="#5B6FFF">
            <div className="flex items-center justify-between">
              <StatusBadge status={report.database.status} />
            </div>
            <div className="mt-4">
              <InfoRow label="连接状态" value={report.database.connected ? "已连接" : "未连接"} />
              <InfoRow label="只读模式" value={report.database.readOnlyQuery ? "是" : "否"} />
              <InfoRow label="连接延迟" value={report.database.connectionLatencyMs != null ? `${report.database.connectionLatencyMs}ms` : null} />
              <InfoRow label="迁移状态" value={report.database.migrationStatus} />
              {report.database.error && <InfoRow label="错误" value={report.database.error} />}
            </div>
          </SectionCard>

          {/* Redis健康 */}
          <SectionCard title="Redis状态" eyebrow="Redis" highlight="#8C612E">
            <div className="flex items-center justify-between">
              <StatusBadge status={report.redis.status} />
            </div>
            <div className="mt-4">
              <InfoRow label="已配置" value={report.redis.configured ? "是" : "否"} />
              <InfoRow label="存储类型" value={report.redis.storeType} />
              <InfoRow label="降级模式" value={report.redis.degradedMode ? "是（使用内存）" : "否"} />
              <InfoRow label="连接延迟" value={report.redis.connectionLatencyMs != null ? `${report.redis.connectionLatencyMs}ms` : null} />
              {report.redis.error && <InfoRow label="错误" value={report.redis.error} />}
            </div>
          </SectionCard>

          {/* 邮件服务 */}
          <SectionCard title="邮件服务" eyebrow="Mail" highlight="#315F8C">
            <div className="flex items-center justify-between">
              <StatusBadge status={report.mail.status} />
            </div>
            <div className="mt-4">
              <InfoRow label="服务启用" value={report.mail.enabled ? "是" : "否"} />
              <InfoRow label="SMTP主机" value={report.mail.smtpHost} />
              <InfoRow label="SMTP端口" value={report.mail.smtpPort} />
              <InfoRow label="SMTP用户" value={report.mail.smtpUser} />
              <InfoRow label="安全模式" value={report.mail.smtpSecureMode} />
              <InfoRow label="发件地址" value={report.mail.fromAddress} />
              <InfoRow label="连接已测试" value={report.mail.connectivityTested ? "是" : "否"} />
            </div>
          </SectionCard>

          {/* AI服务 */}
          <SectionCard title="AI服务配置" eyebrow="AI Service" highlight="#5B6FFF">
            <div className="flex items-center justify-between">
              <StatusBadge status={report.ai.status} />
            </div>
            <div className="mt-4">
              <InfoRow label="AI启用" value={report.ai.enabled ? "是" : "否"} />
              <InfoRow label="服务商" value={report.ai.provider} />
              <InfoRow label="Base URL" value={report.ai.baseUrl} />
              <InfoRow label="模型" value={report.ai.model} />
              <InfoRow label="API Key" value={report.ai.apiKeyPresent ? "已配置" : "未配置"} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "assistantTaxEnabled", label: "财税AI" },
                { key: "assistantLegalEnabled", label: "法务AI" },
                { key: "assistantMarketEnabled", label: "市场AI" },
                { key: "assistantDesignEnabled", label: "设计AI" },
                { key: "assistantSocialEnabled", label: "社媒AI" },
              ].map((agent) => (
                <div
                  key={agent.key}
                  className={`rounded-2xl px-3 py-2 text-xs font-bold ${
                    report.ai[agent.key as keyof AiServiceHealth]
                      ? "bg-[#E6F0D8] text-[#355126]"
                      : "bg-[#F2EDE3] text-[#7A6D5E]"
                  }`}
                >
                  {agent.label}: {report.ai[agent.key as keyof AiServiceHealth] ? "启用" : "关闭"}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 上传与存储 */}
          <SectionCard title="上传与文件状态" eyebrow="Storage" highlight="#8B7B68">
            <div className="flex items-center justify-between">
              <StatusBadge status={report.upload.status} />
            </div>
            <div className="mt-4">
              <InfoRow label="存储提供商" value={report.upload.storageProvider} />
              <InfoRow label="存储启用" value={report.upload.storageEnabled ? "是" : "否"} />
              <InfoRow label="目录存在" value={report.upload.directoryExists ? "是" : "否"} />
              <InfoRow label="可写" value={report.upload.directoryWritable ? "是" : "否"} />
              <InfoRow label="临时文件" value={report.upload.tempFileCount} />
              <InfoRow label="总占用" value={formatBytes(report.upload.totalSizeBytes)} />
            </div>
          </SectionCard>

          {/* 定时任务注册表 */}
          <SectionCard title="定时任务注册表" eyebrow="Scheduled Tasks" highlight="#B42318">
            <p className="text-sm text-[#7A6D5E]">共 {report.scheduledTasks.totalTasks} 个已注册任务</p>
            <div className="mt-4 grid gap-3">
              {report.scheduledTasks.tasks.map((task) => (
                <div key={task.name} className="flex items-start justify-between rounded-2xl border border-[#E8DCCB] p-4">
                  <div>
                    <p className="font-bold text-[#2B241E]">{task.name}</p>
                    <p className="mt-1 text-sm text-[#7A6D5E]">{task.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-2xl bg-[#F2EDE3] px-2 py-1 text-xs font-bold text-[#7A6D5E]">
                      {task.interval}
                    </span>
                    <p className={`mt-1 text-xs font-bold ${task.enabled ? "text-[#355126]" : "text-[#B42318]"}`}>
                      {task.enabled ? "● 运行中" : "○ 停用"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 错误与日志摘要 */}
          <SectionCard title="错误与日志摘要" eyebrow="Error Summary" highlight="#B42318">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#FFF1F0] px-4 py-2">
                <p className="text-xs font-bold text-[#B42318]">24h内错误</p>
                <p className="mt-1 text-2xl font-black text-[#B42318]">{report.errorSummary.totalErrors24h}</p>
              </div>
              <div className="rounded-2xl bg-[#F2EDE3] px-4 py-2">
                <p className="text-xs font-bold text-[#7A6D5E]">错误率</p>
                <p className="mt-1 text-2xl font-black text-[#2B241E]">
                  {report.errorSummary.errorRate === "low" ? "低" : report.errorSummary.errorRate === "medium" ? "中" : "高"}
                </p>
              </div>
            </div>
            {report.errorSummary.recentErrors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-[#7A6D5E]">最近错误类型</p>
                <div className="mt-2 grid gap-2">
                  {report.errorSummary.recentErrors.slice(0, 5).map((err, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-[#FFF1F0] px-3 py-2">
                      <span className="text-sm text-[#B42318]">{err.message}</span>
                      <span className="text-sm font-bold text-[#B42318]">×{err.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ========== 发布前检查 ========== */}
      {activeTab === "checks" && report && (
        <div className="mt-6">
          <SectionCard title="发布前检查报告" eyebrow="Pre-Deployment" highlight="#8C612E">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl px-4 py-2 ${report.preDeployment.allPassed ? "bg-[#E6F0D8]" : report.preDeployment.criticalFailed ? "bg-[#FFF1F0]" : "bg-[#FFF9E8]"}`}>
                <p className="text-xs font-bold text-[#7A6D5E]">检查结果</p>
                <p className={`mt-1 text-2xl font-black ${report.preDeployment.allPassed ? "text-[#355126]" : report.preDeployment.criticalFailed ? "text-[#B42318]" : "text-[#8C612E]"}`}>
                  {report.preDeployment.allPassed ? "全部通过" : report.preDeployment.criticalFailed ? "有严重失败" : "有警告"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2EDE3] px-4 py-2">
                <p className="text-xs font-bold text-[#7A6D5E]">通过/总计</p>
                <p className="mt-1 text-2xl font-black text-[#2B241E]">
                  {report.preDeployment.checks.filter((c) => c.status === "pass").length} / {report.preDeployment.checks.length}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {report.preDeployment.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-[#E8DCCB] p-4">
                  <span
                    className={`mt-0.5 size-6 rounded-full flex items-center justify-center text-xs font-black ${
                      check.status === "pass"
                        ? "bg-[#E6F0D8] text-[#355126]"
                        : check.status === "fail"
                          ? "bg-[#FFF1F0] text-[#B42318]"
                          : check.status === "warn"
                            ? "bg-[#FFF9E8] text-[#8C612E]"
                            : "bg-[#F2EDE3] text-[#7A6D5E]"
                    }`}
                  >
                    {check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : check.status === "warn" ? "!" : "○"}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-[#2B241E]">{check.item}</p>
                    <p className="mt-1 text-sm text-[#7A6D5E]">{check.message}</p>
                    {check.details && <p className="mt-1 text-xs text-[#B42318]">{check.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ========== 上线后清单 ========== */}
      {activeTab === "checklist" && report && (
        <div className="mt-6">
          <SectionCard title="上线后三天人工检查清单" eyebrow="Post-Launch Checklist" highlight="#6F8F4E">
            <p className="text-sm text-[#7A6D5E]">
              上线后每天需人工确认以下事项。勾选仅保存在本地，不生成文件。
            </p>
            <div className="mt-4 grid gap-3">
              {[1, 2, 3].map((day) => (
                <div key={day}>
                  <p className="mb-2 text-sm font-black text-[#2B241E]">第{day}天</p>
                  <div className="grid gap-2">
                    {postLaunchState.filter((item) => item.day === day).map((item) => (
                      <ChecklistItem
                        key={item.item}
                        item={item}
                        checked={item.checked}
                        onChange={handleChecklistChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ========== Dry Run ========== */}
      {activeTab === "dry-run" && (
        <div className="mt-6">
          <SectionCard title="Dry Run - 预计影响数量" eyebrow="Dry Run" highlight="#B42318">
            <p className="text-sm text-[#7A6D5E]">
              Dry Run 仅计算影响数量，不真实修改数据。实际清理任务请通过日志页面手动触发。
            </p>
            {!showDryRun ? (
              <button
                type="button"
                onClick={() => setShowDryRun(true)}
                className="mt-4 min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white"
              >
                运行 Dry Run
              </button>
            ) : !dryRun ? (
              <div className="mt-4 rounded-2xl bg-[#F2EDE3] p-4 text-sm font-bold text-[#7A6D5E]">正在计算…</div>
            ) : (
              <div className="mt-4">
                <div className="mb-4 flex items-center gap-4">
                  <div className="rounded-2xl bg-[#FFF1F0] px-4 py-2">
                    <p className="text-xs font-bold text-[#B42318]">预计删除总数</p>
                    <p className="mt-1 text-2xl font-black text-[#B42318]">{dryRun.totalAffected}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F2EDE3] px-4 py-2">
                    <p className="text-xs font-bold text-[#7A6D5E]">截止日期</p>
                    <p className="mt-1 text-lg font-black text-[#2B241E]">
                      {new Date(dryRun.cutoffDate).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {dryRun.results.map((result) => (
                    <div key={result.task} className="flex items-center justify-between rounded-2xl border border-[#E8DCCB] p-4">
                      <div>
                        <p className="font-bold text-[#2B241E]">{result.task}</p>
                        <p className="mt-1 text-sm text-[#7A6D5E]">{result.description}</p>
                      </div>
                      <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-sm font-black text-[#B42318]">
                        {result.affectedCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ========== 任务执行 ========== */}
      {activeTab === "tasks" && report && (
        <div className="mt-6">
          <SectionCard title="任务执行" eyebrow="Task Execution" highlight="#B42318">
            <p className="text-sm text-[#7A6D5E]">
              执行真实的清理任务。每次执行会记录成功、失败、影响数量和执行时间。
            </p>
            <div className="mt-4 flex flex-wrap gap-4 mb-4">
              <div className="rounded-2xl bg-[#E6F0D8] px-4 py-2">
                <p className="text-xs font-bold text-[#355126]">已配置</p>
                <p className="mt-1 text-2xl font-black text-[#355126]">{report.taskExecution.configured}</p>
              </div>
              <div className="rounded-2xl bg-[#E6F0D8] px-4 py-2">
                <p className="text-xs font-bold text-[#355126]">已接通</p>
                <p className="mt-1 text-2xl font-black text-[#355126]">{report.taskExecution.connected}</p>
              </div>
              <div className="rounded-2xl bg-[#E6F0D8] px-4 py-2">
                <p className="text-xs font-bold text-[#355126]">正常运行</p>
                <p className="mt-1 text-2xl font-black text-[#355126]">{report.taskExecution.running}</p>
              </div>
              <div className="rounded-2xl bg-[#FFF9E8] px-4 py-2">
                <p className="text-xs font-bold text-[#8C612E]">降级运行</p>
                <p className="mt-1 text-2xl font-black text-[#8C612E]">{report.taskExecution.degraded}</p>
              </div>
            </div>
            <div className="grid gap-4">
              {report.taskExecution.tasks.map((task) => (
                <div key={task.task} className="rounded-2xl border border-[#E8DCCB] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#2B241E]">{task.task}</p>
                        <TaskExecutionStatusBadge status={task.status} />
                      </div>
                      <p className="mt-1 text-sm text-[#7A6D5E]">{task.config.route}</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">间隔: {task.config.interval}</p>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => void executeTask(task.task)}
                        disabled={executingTask !== null || !task.config.implemented}
                        className={`min-h-9 rounded-2xl px-4 text-sm font-bold transition ${
                          !task.config.implemented
                            ? "bg-[#F2EDE3] text-[#7A6D5E] cursor-not-allowed"
                            : executingTask === task.task
                              ? "bg-[#8C612E] text-white"
                              : "bg-[#B42318] text-white hover:bg-[#991B1B]"
                        }`}
                      >
                        {executingTask === task.task ? "执行中…" : "执行"}
                      </button>
                    </div>
                  </div>
                  {task.lastRun && (
                    <div className="mt-3 rounded-xl bg-[#F7F1E7] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#7A6D5E]">上次执行</p>
                        <span className={`rounded-xl px-2 py-0.5 text-xs font-bold ${
                          task.lastRun.success ? "bg-[#E6F0D8] text-[#355126]" : "bg-[#FFF1F0] text-[#B42318]"
                        }`}>
                          {task.lastRun.success ? "成功" : "失败"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#7A6D5E]">
                        {new Date(task.lastRun.executedAt).toLocaleString("zh-CN")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {task.lastRun.deleted !== undefined && (
                          <span className="text-xs text-[#7A6D5E]">删除: <span className="font-black text-[#B42318]">{task.lastRun.deleted}</span></span>
                        )}
                        {task.lastRun.created !== undefined && (
                          <span className="text-xs text-[#7A6D5E]">创建: <span className="font-black text-[#355126]">{task.lastRun.created}</span></span>
                        )}
                        {task.lastRun.errors !== undefined && (
                          <span className="text-xs text-[#7A6D5E]">错误: <span className="font-black text-[#B42318]">{task.lastRun.errors}</span></span>
                        )}
                        {task.lastRun.executionTimeMs !== undefined && (
                          <span className="text-xs text-[#7A6D5E]">耗时: <span className="font-black text-[#2B241E]">{task.lastRun.executionTimeMs}ms</span></span>
                        )}
                      </div>
                      {task.lastRun.errorMessage && (
                        <p className="mt-1 text-xs text-[#B42318]">{task.lastRun.errorMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {execResult && (
              <div className="mt-4 rounded-2xl bg-[#F7F1E7] p-4">
                <p className="text-sm font-bold text-[#2B241E]">最近执行结果</p>
                <pre className="mt-2 overflow-auto text-xs text-[#7A6D5E] max-h-40">
                  {JSON.stringify(execResult, null, 2)}
                </pre>
              </div>
            )}
          </SectionCard>
        </div>
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.open}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          dangerLevel={confirmModal.dangerLevel}
          impactList={confirmModal.impactList}
          irreversibleNotice={confirmModal.irreversibleNotice}
          requireReason={confirmModal.requireReason}
          reasonMinLength={confirmModal.reasonMinLength}
          reasonPlaceholder={confirmModal.reasonPlaceholder}
          inputConfirmMatch={confirmModal.inputConfirmMatch}
          inputPlaceholder={confirmModal.inputPlaceholder}
          onConfirmWithReason={confirmModal.onConfirmWithReason}
          loading={!!executingTask}
        />
      )}
      {logout.Modal}
    </AdminShell>
  );
}
