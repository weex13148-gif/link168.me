"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import {
  AdminAlertBanner,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminStatusBadgeFromCode,
} from "@/components/admin/AdminKit";

type AdminUser = { email: string; role: string };
type Summary = {
  counts: {
    totalUsers: number;
    todayUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    paidUsers: number;
    pendingReports: number;
    activeRestrictions: number;
    todayMailCount: number;
    todayMailFailures: number;
    todayAiCalls: number;
  };
  services: Record<string, { status: string; label: string }>;
};

const shortcuts = [
  { href: "/jeepwork/users", title: "用户与会员", description: "搜索客户，手动添加、续期、调整或注销会员" },
  { href: "/jeepwork/settings/api", title: "邮箱与系统配置", description: "验证码、忘记密码、AI、支付与存储" },
  { href: "/jeepwork/logs", title: "访问与安全日志", description: "登录、会话、管理员操作和原始 IP" },
  { href: "/jeepwork/reports", title: "举报管理", description: "处理用户举报和违规主页" },
  { href: "/jeepwork/profiles", title: "主页管理", description: "搜索、隐藏和恢复公开主页" },
  { href: "/jeepwork/showcase", title: "比赛展示中心", description: "管理演示页面和访问控制" },
];

const serviceLabels: Record<string, string> = {
  database: "数据库",
  mail: "邮箱服务",
  ai: "AI 服务",
  storage: "上传与存储",
  payment: "支付服务",
};

export default function JeepworkHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
      const meResult = await meResponse.json() as { success?: boolean; user?: AdminUser };
      if (!meResponse.ok || !meResult.success || !meResult.user) {
        router.replace("/jeepwork/login");
        return;
      }
      setUser(meResult.user);

      if (meResult.user.role !== "super_admin") {
        setSummary(null);
        return;
      }

      const response = await fetch("/api/jeepwork/summary", { cache: "no-store" });
      const result = await response.json() as { success?: boolean; data?: Summary; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) {
        setError(result.error?.message || "管理总览加载失败。");
        return;
      }
      setSummary(result.data);
    } catch {
      setError("网络连接失败，无法加载管理总览。");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function onLogout() {
    setLoggingOut(true);
    await fetch("/api/jeepwork/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/jeepwork/login");
    router.refresh();
  }

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AdminShell
      currentPageLabel="管理后台首页"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : () => setLogoutOpen(true)}
      pageHeader={{
        eyebrow: "运营工作台",
        title: "Link168 管理后台",
        subtitle: "查看用户、邮箱、会员、举报和系统配置状态，并处理需要关注的事项。",
        highlight: "var(--ui-brand)",
      }}
    >
      <div className="grid gap-6">
        {/* 已知限制：后台已知后端缺口，统一展示在总览顶部 */}
        {isSuperAdmin ? (
          <AdminAlertBanner tone="warning" title="已知限制：以下能力为后续 P0 项，当前仅为 UI 展示">
            <ul className="space-y-1">
              <li>· AI 成本页仅展示 Credit 计数，未对接真实供应商账单</li>
              <li>· 退款流程仅更新本地订单状态，未调用支付宝接口</li>
              <li>· 会员到期降级无定时任务，需人工触发</li>
              <li>· 限流计数存于单机内存，多实例部署时不生效</li>
            </ul>
          </AdminAlertBanner>
        ) : null}

        {error ? <AdminErrorState description={error} onRetry={() => void load()} /> : null}

        {!isSuperAdmin && !loading ? (
          <AdminCard
            title="管理员工作台"
            description="当前账号可以处理普通客户会员、主页与举报。系统配置、用户角色、安全日志和原始 IP 仅超级管理员可见。"
          >
            <p className="text-sm leading-6 text-[var(--ui-muted)]">
              如需进入高级管理区域，请联系超级管理员开通权限。
            </p>
          </AdminCard>
        ) : null}

        {isSuperAdmin ? (
          <>
            <AdminCard
              title="运营数据"
              description="来自当前数据库和业务日志"
              actions={
                <button
                  type="button"
                  onClick={() => void load()}
                  className="ui-button-secondary min-h-10 px-4 text-xs"
                >
                  刷新数据
                </button>
              }
              bodyClassName="p-0"
            >
              {loading ? (
                <AdminLoadingState />
              ) : summary ? (
                <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
                  <div className="border-b border-[var(--ui-line)] p-5 sm:border-r xl:border-b-0">
                    <dt className="text-xs font-black text-[var(--ui-muted)]">用户总数</dt>
                    <dd className="mt-2 text-3xl font-black text-[var(--ui-ink)]">{summary.counts.totalUsers}</dd>
                    <p className="ui-muted mt-2 text-xs">今日新增 {summary.counts.todayUsers}</p>
                  </div>
                  <div className="border-b border-[var(--ui-line)] p-5 xl:border-b-0 xl:border-r">
                    <dt className="text-xs font-black text-[var(--ui-muted)]">邮箱已验证</dt>
                    <dd className="mt-2 text-3xl font-black text-[var(--ui-ink)]">{summary.counts.verifiedUsers}</dd>
                    <p className="ui-muted mt-2 text-xs">未验证 {summary.counts.unverifiedUsers}</p>
                  </div>
                  <div className="border-b border-[var(--ui-line)] p-5 sm:border-r sm:border-b-0 xl:border-r">
                    <dt className="text-xs font-black text-[var(--ui-muted)]">有效付费用户</dt>
                    <dd className="mt-2 text-3xl font-black text-[var(--ui-ink)]">{summary.counts.paidUsers}</dd>
                    <p className="ui-muted mt-2 text-xs">会员版与企业版</p>
                  </div>
                  <div className="p-5">
                    <dt className="text-xs font-black text-[var(--ui-muted)]">今日 AI 调用</dt>
                    <dd className="mt-2 text-3xl font-black text-[var(--ui-ink)]">{summary.counts.todayAiCalls}</dd>
                    <p className="ui-muted mt-2 text-xs">按实际调用日志统计</p>
                  </div>
                </dl>
              ) : !error ? (
                <AdminEmptyState
                  title="暂无运营数据"
                  description="点击右上角刷新数据按钮重新加载。"
                  actionLabel="立即刷新"
                  onAction={() => void load()}
                />
              ) : null}
            </AdminCard>

            {summary ? (
              <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <AdminCard title="需要关注" description="优先处理会影响用户使用的问题" bodyClassName="p-0">
                  <div className="divide-y divide-[var(--ui-line)]">
                    <Link href="/jeepwork/reports" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span>
                        <strong className="block text-sm">待处理举报</strong>
                        <span className="ui-muted mt-1 block text-xs">检查违规主页和用户举报</span>
                      </span>
                      <span className="text-xl font-black text-[var(--ui-danger)]">{summary.counts.pendingReports}</span>
                    </Link>
                    <Link href="/jeepwork/users" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span>
                        <strong className="block text-sm">邮箱未验证用户</strong>
                        <span className="ui-muted mt-1 block text-xs">关注注册和验证码完成率</span>
                      </span>
                      <span className="text-xl font-black text-[var(--ui-accent)]">{summary.counts.unverifiedUsers}</span>
                    </Link>
                    <Link href="/jeepwork/logs" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span>
                        <strong className="block text-sm">有效限制记录</strong>
                        <span className="ui-muted mt-1 block text-xs">冻结、封禁或安全限制</span>
                      </span>
                      <span className="text-xl font-black text-[var(--ui-info)]">{summary.counts.activeRestrictions}</span>
                    </Link>
                    <Link href="/jeepwork/settings/api" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span>
                        <strong className="block text-sm">今日邮件失败</strong>
                        <span className="ui-muted mt-1 block text-xs">今日发送 {summary.counts.todayMailCount} 封</span>
                      </span>
                      <span className="text-xl font-black text-[var(--ui-danger)]">{summary.counts.todayMailFailures}</span>
                    </Link>
                  </div>
                </AdminCard>

                <AdminCard title="系统配置状态" description="只显示真实连接或配置情况" bodyClassName="p-0">
                  <div className="divide-y divide-[var(--ui-line)]">
                    {Object.entries(summary.services).map(([key, service]) => (
                      <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm font-bold text-[var(--ui-ink)]">{serviceLabels[key] || key}</span>
                        <AdminStatusBadgeFromCode status={service.status} fallbackLabel={service.label} />
                      </div>
                    ))}
                  </div>
                </AdminCard>
              </div>
            ) : null}

            {/* 更多指标区块：暂无数据的数据项 */}
            <AdminCard
              title="更多指标"
              description="以下指标暂无数据"
              accent="warning"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">活跃用户（近 7 日）</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">企业数量</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">订单概况</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">AI 调用概况（聚合）</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">/showcase 当前状态</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-4 py-3">
                  <p className="text-xs font-black text-[var(--ui-muted)]">系统服务状态（聚合）</p>
                  <p className="mt-1 text-xs text-[var(--ui-faint)]">暂无数据</p>
                </div>
              </div>
            </AdminCard>
          </>
        ) : null}

        <AdminCard title="管理入口" description="进入具体业务页面处理任务" bodyClassName="p-0">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts
              .filter((item) => isSuperAdmin || ["/jeepwork/users", "/jeepwork/reports", "/jeepwork/profiles"].includes(item.href))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-[var(--ui-line)] p-5 transition hover:bg-[var(--ui-surface-muted)] sm:border-r xl:[&:nth-child(3n)]:border-r-0"
                >
                  <h3 className="font-black text-[var(--ui-ink)]">{item.title}</h3>
                  <p className="ui-muted mt-2 text-sm leading-6">{item.description}</p>
                  <p className="mt-3 text-sm font-black text-[var(--ui-brand)]">进入管理 →</p>
                </Link>
              ))}
          </div>
        </AdminCard>
      </div>

      <ConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={onLogout}
        loading={loggingOut}
        title="退出管理员后台"
        description="确定要退出当前管理员会话吗？退出后需要重新登录才能继续操作后台。"
        dangerLevel="warn"
      />
    </AdminShell>
  );
}
