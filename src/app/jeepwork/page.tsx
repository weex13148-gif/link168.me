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
  { href: "/jeepwork/users", title: "用户管理", description: "查看邮箱验证、会员、账号状态和最近登录。" },
  { href: "/jeepwork/settings/api", title: "邮箱与系统配置", description: "配置注册验证码、忘记密码、AI、支付与存储。" },
  { href: "/jeepwork/logs", title: "访问与安全日志", description: "查看登录、会话、管理员操作和原始 IP。" },
  { href: "/jeepwork/reports", title: "举报管理", description: "处理用户举报和违规主页。" },
  { href: "/jeepwork/profiles", title: "主页管理", description: "搜索、隐藏、恢复公开主页和链接。" },
  { href: "/jeepwork/showcase", title: "比赛展示中心", description: "管理比赛展示页面、访问密码和演示内容。" },
];

function statusClass(status: string) {
  if (status === "available" || status === "enabled" || status === "configured") return "bg-[#EEF4E7] text-[#355126]";
  if (status === "incomplete") return "bg-[#FFF7E8] text-[#8C612E]";
  return "bg-[#F3F1ED] text-[#6F6255]";
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

  const countCards = summary ? [
    { label: "用户总数", value: summary.counts.totalUsers, detail: `今日新增 ${summary.counts.todayUsers}` },
    { label: "邮箱已验证", value: summary.counts.verifiedUsers, detail: `未验证 ${summary.counts.unverifiedUsers}` },
    { label: "付费用户", value: summary.counts.paidUsers, detail: "当前有效会员与企业用户" },
    { label: "待处理举报", value: summary.counts.pendingReports, detail: "需要管理员处理" },
    { label: "有效限制记录", value: summary.counts.activeRestrictions, detail: "冻结、封禁或安全限制" },
    { label: "今日邮件", value: summary.counts.todayMailCount, detail: `失败 ${summary.counts.todayMailFailures}` },
    { label: "今日 AI 调用", value: summary.counts.todayAiCalls, detail: "按实际调用日志统计" },
  ] : [];

  return (
    <AdminShell
      currentPageLabel="管理后台首页"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "管理总览",
        title: "Link168 管理后台",
        subtitle: "查看真实用户、邮箱、会员、举报和系统配置状态。没有检测能力的服务不会显示虚假的“正常”。",
        highlight: "#6F8F4E",
      }}
    >
      <div className="grid gap-6">
        {message ? <p className="rounded-2xl bg-[#FFF7E8] px-4 py-3 text-sm font-bold text-[#8C612E]">{message}</p> : null}

        {user?.role === "super_admin" ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {loading ? <div className="col-span-full rounded-[24px] border border-[#E8DCCB] bg-white p-10 text-center font-bold text-[#7A6D5E]">正在加载真实统计…</div> : null}
              {!loading ? countCards.map((card) => (
                <article key={card.label} className="rounded-[22px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
                  <p className="text-xs font-black text-[#7A6D5E]">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-[#2B241E]">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-[#8B7B68]">{card.detail}</p>
                </article>
              )) : null}
            </section>

            {summary ? (
              <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-[#2B241E]">系统配置状态</h2>
                    <p className="mt-1 text-sm text-[#7A6D5E]">这里只反映真实连接或配置状态，不代表所有外部服务都已经完成业务验收。</p>
                  </div>
                  <button type="button" onClick={() => void load()} className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#3F5F31]">刷新状态</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {Object.entries(summary.services).map(([key, service]) => {
                    const labels: Record<string, string> = { database: "数据库", mail: "邮箱服务", ai: "AI 服务", storage: "上传与存储", payment: "支付服务" };
                    return (
                      <div key={key} className="rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
                        <p className="text-xs font-black text-[#7A6D5E]">{labels[key] || key}</p>
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClass(service.status)}`}>{service.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">管理员工作台</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">当前账号可处理主页与举报。系统配置、用户角色和安全日志仅超级管理员可见。</p>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-[#2B241E]">常用管理入口</h2>
            <p className="mt-1 text-sm text-[#7A6D5E]">按日常管理任务快速进入对应页面。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts.filter((item) => user?.role === "super_admin" || ["/jeepwork/reports", "/jeepwork/profiles"].includes(item.href)).map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
                <h3 className="text-lg font-black text-[#2B241E]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{item.description}</p>
                <p className="mt-4 text-sm font-black text-[#6F8F4E] group-hover:underline">进入管理 →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-dashed border-[#D8CCBD] bg-white p-5 text-sm leading-6 text-[#7A6D5E] shadow-sm">
          <p className="font-black text-[#2B241E]">操作说明</p>
          <p className="mt-2">冻结、封禁、删除和权限提升属于敏感操作，需要二次确认并写入管理员审计日志。</p>
        </section>
      </div>
    </AdminShell>
  );
}
