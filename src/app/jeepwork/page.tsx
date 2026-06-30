"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

type AdminUser = { email: string; role: string };

export default function JeepworkHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            router.push("/jeepwork/login");
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

  async function onLogout() {
    const confirmed = window.confirm("确定要退出管理员后台吗？");
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，仍然做前端跳转
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  const isSuper = user?.role === "super_admin";

  return (
    <AdminShell
      currentPageLabel="后台首页"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Admin Console",
        title: "内部工作台",
        subtitle: "统一管理用户、主页、举报、AI 用量与第三方配置。",
        highlight: "#6F8F4E",
      }}
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/jeepwork/reports"
          className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">Reports</p>
          <h2 className="mt-2 text-lg font-black text-[#2B241E]">举报管理</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">处理用户提交的内容举报、隐藏违规主页。</p>
          <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入举报管理 →</p>
        </Link>
        <Link
          href="/jeepwork/profiles"
          className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6F8F4E]">Profiles</p>
          <h2 className="mt-2 text-lg font-black text-[#2B241E]">主页管理</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">搜索、隐藏或恢复公开主页、下架链接。</p>
          <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入主页管理 →</p>
        </Link>
        <Link
          href="/jeepwork/ai-usage"
          className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8C612E]">AI Usage</p>
          <h2 className="mt-2 text-lg font-black text-[#2B241E]">AI 用量统计</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">查看用户 AI 调用情况、Agent 与日期分布。</p>
          <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入 AI 用量 →</p>
        </Link>
        {isSuper ? (
          <Link
            href="/jeepwork/governance"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#5B6FFF" }}>Governance</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">平台治理</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">角色权限边界、高风险操作分级与审计策略。</p>
            <p className="mt-4 text-sm font-bold text-[#5B6FFF] group-hover:underline">进入平台治理 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/roles"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#8C612E" }}>Roles</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">角色管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">统一管理所有管理员与超级管理员账号。</p>
            <p className="mt-4 text-sm font-bold text-[#8C612E] group-hover:underline">进入角色管理 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/audit"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#B42318" }}>Audit</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">审计日志</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">查看所有管理员操作的完整审计记录。</p>
            <p className="mt-4 text-sm font-bold text-[#B42318] group-hover:underline">进入审计日志 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/users"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#5B6FFF" }}>Users</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">用户管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">修改用户角色与权限、重置密码。</p>
            <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入用户管理 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/settings/api"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#8B7B68" }}>Settings</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">系统配置</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">管理第三方 API、邮件、短信、存储等配置。</p>
            <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入系统配置 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/system-health"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#6F8F4E" }}>Ops Center</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">运维健康中心</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">系统健康总览、数据库、Redis、邮件、AI服务、存储监控与Dry Run。</p>
            <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入运维中心 →</p>
          </Link>
        ) : null}
        {isSuper ? (
          <Link
            href="/jeepwork/showcase"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#315F8C" }}>Showcase</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">比赛展示中心</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">管理 /showcase 开关、访问密码、展示分区与评委访问日志。</p>
            <p className="mt-4 text-sm font-bold text-[#6F8F4E] group-hover:underline">进入比赛展示 →</p>
          </Link>
        ) : null}
      </section>

      <section className="mt-8 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 text-sm leading-6 text-[#7A6D5E] shadow-sm">
        <p className="font-black text-[#2B241E]">操作提示</p>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>红色按钮为敏感操作（删除、隐藏、提升权限），点击后需要二次确认。</li>
          <li>所有操作均会留下操作日志，请谨慎操作。</li>
          <li>如页面数据为空，请先在相应页面查看筛选条件。</li>
        </ul>
      </section>
    </AdminShell>
  );
}
