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
  { href: "/jeepwork/users", title: "用户与会员", description: "搜索用户，处理会员、限制、封禁和账号状态" },
  { href: "/jeepwork/profiles", title: "名片管理", description: "查看、隐藏或恢复公开经营名片" },
  { href: "/jeepwork/reports", title: "举报管理", description: "处理违规内容、举报和内容安全事件" },
  { href: "/jeepwork/settings/payment", title: "支付配置", description: "检查支付宝配置、订单和商业化参数" },
  { href: "/jeepwork/ai-usage", title: "AI 用量", description: "查看 AI 调用、额度和异常消耗" },
  { href: "/jeepwork/system-health", title: "系统健康", description: "检查数据库、邮件、支付、存储和定时任务状态" },
];

const serviceLabels: Record<string, string> = {
  database: "数据库",
  mail: "邮件服务",
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
      const meResult = (await meResponse.json()) as { success?: boolean; user?: AdminUser };
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
      const result = (await response.json()) as { success?: boolean; data?: Summary; error?: { message?: string } };
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

  useEffect(() => {
    void load();
  }, [load]);

  async function onLogout() {
    setLoggingOut(true);
    await fetch("/api/jeepwork/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/jeepwork/login");
    router.refresh();
  }

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AdminShell
      currentPageLabel="后台首页"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : () => setLogoutOpen(true)}
      pageHeader={{
        eyebrow: "平台治理",
        title: "Link168 Jeepwork",
        subtitle: "集中处理用户、名片、举报、订单、AI 用量和系统健康，不再承载展示中心或比赛演示路线。",
        highlight: "var(--ui-brand)",
      }}
    >
      <div className="grid gap-6">
        {isSuperAdmin ? (
          <AdminAlertBanner tone="warning" title="V2 方向提示">
            本分支只保留经营名片 SaaS 的平台治理能力。展示中心、比赛中心和企业 AI 独立产品线已从活动入口移除。
          </AdminAlertBanner>
        ) : null}

        {error ? <AdminErrorState description={error} onRetry={() => void load()} /> : null}

        {!isSuperAdmin && !loading ? (
          <AdminCard
            title="管理员工作台"
            description="当前账号可以处理普通用户、名片和举报。系统配置、角色、安全日志和原始 IP 仅超级管理员可见。"
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
                <button type="button" onClick={() => void load()} className="ui-button-secondary min-h-10 px-4 text-xs">
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
                    <dt className="text-xs font-black text-[var(--ui-muted)]">付费用户</dt>
                    <dd className="mt-2 text-3xl font-black text-[var(--ui-ink)]">{summary.counts.paidUsers}</dd>
                    <p className="ui-muted mt-2 text-xs">会员版和企业版</p>
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
                  description="点击刷新数据按钮重新加载。"
                  actionLabel="立即刷新"
                  onAction={() => void load()}
                />
              ) : null}
            </AdminCard>

            {summary ? (
              <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <AdminCard title="需要关注" description="优先处理会影响用户使用和商业闭环的问题" bodyClassName="p-0">
                  <div className="divide-y divide-[var(--ui-line)]">
                    <Link href="/jeepwork/reports" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span>
                        <strong className="block text-sm">待处理举报</strong>
                        <span className="ui-muted mt-1 block text-xs">检查违规名片和用户举报</span>
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
                  <p className="mt-3 text-sm font-black text-[var(--ui-brand)]">进入管理</p>
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
