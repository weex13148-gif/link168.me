"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

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

function statusClass(status: string) {
  if (status === "available" || status === "enabled" || status === "configured") return "bg-[var(--ui-success-soft)] text-[var(--ui-success)]";
  if (status === "incomplete") return "bg-[var(--ui-accent-soft)] text-[#7D5B24]";
  return "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]";
}

export default function JeepworkHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
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
        setMessage(result.error?.message || "管理总览加载失败。");
        return;
      }
      setSummary(result.data);
    } catch {
      setMessage("网络连接失败，无法加载管理总览。");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function onLogout() {
    if (!window.confirm("确定要退出管理员后台吗？")) return;
    setLoggingOut(true);
    await fetch("/api/jeepwork/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/jeepwork/login");
    router.refresh();
  }

  const serviceLabels: Record<string, string> = {
    database: "数据库",
    mail: "邮箱服务",
    ai: "AI 服务",
    storage: "上传与存储",
    payment: "支付服务",
  };

  return (
    <AdminShell
      currentPageLabel="管理后台首页"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "运营工作台",
        title: "Link168 管理后台",
        subtitle: "查看用户、邮箱、会员、举报和系统配置状态，并处理需要关注的事项。",
        highlight: "var(--ui-brand)",
      }}
    >
      <div className="grid gap-6">
        {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-accent-soft)] px-4 py-3 text-sm font-bold text-[#7D5B24]">{message}</p> : null}

        {user?.role === "super_admin" ? (
          <>
            <section className="ui-surface overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--ui-line)] px-5 py-4">
                <div>
                  <h2 className="font-black text-[var(--ui-ink)]">运营数据</h2>
                  <p className="ui-muted mt-1 text-xs">来自当前数据库和业务日志</p>
                </div>
                <button type="button" onClick={() => void load()} className="ui-button-secondary min-h-10">刷新数据</button>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm font-bold text-[var(--ui-muted)]">正在加载真实数据…</div>
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
              ) : null}
            </section>

            {summary ? (
              <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="ui-surface overflow-hidden">
                  <div className="border-b border-[var(--ui-line)] px-5 py-4">
                    <h2 className="font-black text-[var(--ui-ink)]">需要关注</h2>
                    <p className="ui-muted mt-1 text-xs">优先处理会影响用户使用的问题</p>
                  </div>
                  <div className="divide-y divide-[var(--ui-line)]">
                    <Link href="/jeepwork/reports" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span><strong className="block text-sm">待处理举报</strong><span className="ui-muted mt-1 block text-xs">检查违规主页和用户举报</span></span>
                      <span className="text-xl font-black text-[var(--ui-danger)]">{summary.counts.pendingReports}</span>
                    </Link>
                    <Link href="/jeepwork/users" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span><strong className="block text-sm">邮箱未验证用户</strong><span className="ui-muted mt-1 block text-xs">关注注册和验证码完成率</span></span>
                      <span className="text-xl font-black text-[var(--ui-accent)]">{summary.counts.unverifiedUsers}</span>
                    </Link>
                    <Link href="/jeepwork/logs" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span><strong className="block text-sm">有效限制记录</strong><span className="ui-muted mt-1 block text-xs">冻结、封禁或安全限制</span></span>
                      <span className="text-xl font-black text-[var(--ui-info)]">{summary.counts.activeRestrictions}</span>
                    </Link>
                    <Link href="/jeepwork/settings/api" className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--ui-surface-muted)]">
                      <span><strong className="block text-sm">今日邮件失败</strong><span className="ui-muted mt-1 block text-xs">今日发送 {summary.counts.todayMailCount} 封</span></span>
                      <span className="text-xl font-black text-[var(--ui-danger)]">{summary.counts.todayMailFailures}</span>
                    </Link>
                  </div>
                </section>

                <section className="ui-surface overflow-hidden">
                  <div className="border-b border-[var(--ui-line)] px-5 py-4">
                    <h2 className="font-black text-[var(--ui-ink)]">系统配置状态</h2>
                    <p className="ui-muted mt-1 text-xs">只显示真实连接或配置情况</p>
                  </div>
                  <div className="divide-y divide-[var(--ui-line)]">
                    {Object.entries(summary.services).map(([key, service]) => (
                      <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                        <span className="text-sm font-bold text-[var(--ui-ink)]">{serviceLabels[key] || key}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(service.status)}`}>{service.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : (
          <section className="ui-surface p-6">
            <h2 className="text-lg font-black text-[var(--ui-ink)]">管理员工作台</h2>
            <p className="ui-muted mt-2 text-sm leading-6">当前账号可以处理普通客户会员、主页与举报。系统配置、用户角色、安全日志和原始 IP 仅超级管理员可见。</p>
          </section>
        )}

        <section className="ui-surface overflow-hidden">
          <div className="border-b border-[var(--ui-line)] px-5 py-4">
            <h2 className="font-black text-[var(--ui-ink)]">管理入口</h2>
            <p className="ui-muted mt-1 text-xs">进入具体业务页面处理任务</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts
              .filter((item) => user?.role === "super_admin" || ["/jeepwork/users", "/jeepwork/reports", "/jeepwork/profiles"].includes(item.href))
              .map((item) => (
                <Link key={item.href} href={item.href} className="border-b border-[var(--ui-line)] p-5 transition hover:bg-[var(--ui-surface-muted)] sm:border-r xl:[&:nth-child(3n)]:border-r-0">
                  <h3 className="font-black text-[var(--ui-ink)]">{item.title}</h3>
                  <p className="ui-muted mt-2 text-sm leading-6">{item.description}</p>
                  <p className="mt-3 text-sm font-black text-[var(--ui-brand)]">进入管理 →</p>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
