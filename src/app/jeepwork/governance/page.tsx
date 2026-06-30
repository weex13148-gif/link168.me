"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { RISK_OPERATIONS, ROLE_LABELS } from "@/lib/admin-governance/permissions";

type AdminUser = { email: string; role: string };

type GovernanceStats = {
  totalUsers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalBanned: number;
  totalFrozen: number;
  totalProfiles: number;
  totalReports: number;
  recentAuditCount: number;
};

export default function JeepworkGovernancePage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

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
            if (result.user.role !== "super_admin") {
              router.push("/jeepwork");
              return;
            }
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

  // 加载治理统计
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError("");
      try {
        // 并行获取各模块统计
        const [usersRes, profilesRes, reportsRes, auditRes] = await Promise.all([
          fetch("/api/jeepwork/users?page=1", { cache: "no-store" }),
          fetch("/api/jeepwork/profiles", { cache: "no-store" }),
          fetch("/api/jeepwork/reports", { cache: "no-store" }),
          fetch("/api/jeepwork/logs?type=admin_audit&page=1", { cache: "no-store" }),
        ]);

        const usersJson = (await usersRes.json()) as { success?: boolean; data?: { total?: number } };
        const profilesJson = (await profilesRes.json()) as { success?: boolean; data?: { total?: number } };
        const reportsJson = (await reportsRes.json()) as { success?: boolean; data?: { total?: number } };
        const auditJson = (await auditRes.json()) as { success?: boolean; data?: { total?: number } };

        if (!cancelled) {
          setStats({
            totalUsers: usersJson.data?.total ?? 0,
            totalAdmins: 0, // 列表不带角色筛选，需单独API
            totalSuperAdmins: 0,
            totalBanned: 0,
            totalFrozen: 0,
            totalProfiles: profilesJson.data?.total ?? 0,
            totalReports: reportsJson.data?.total ?? 0,
            recentAuditCount: auditJson.data?.total ?? 0,
          });
        }
      } catch {
        if (!cancelled) setStatsError("无法加载统计数据");
      }
      if (!cancelled) setStatsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onLogout() {
    const confirmed = window.confirm("确定要退出管理员后台吗？");
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  const isSuper = user?.role === "super_admin";

  return (
    <AdminShell
      currentPageLabel="平台治理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Governance",
        title: "平台治理",
        subtitle: "统一管理平台治理策略、角色权限边界与高风险操作审计。",
        highlight: "#5B6FFF",
      }}
    >
      <div className="grid gap-6">
        {/* 角色权限边界 */}
        <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">角色权限边界</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">
            Link168 后台采用双角色模型：<strong className="text-[#2B241E]">超级管理员（super_admin）</strong>拥有完整权限，
            <strong className="text-[#2B241E]">管理员（admin）</strong>仅可操作运营相关模块。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8DCCB] text-left text-xs font-bold text-[#7A6D5E]">
                  <th className="pb-2 pr-4">功能</th>
                  <th className="pb-2 px-2 text-center">超级管理员</th>
                  <th className="pb-2 pl-2 text-center">管理员</th>
                </tr>
              </thead>
              <tbody className="text-[#2B241E]">
                {[
                  { label: "用户列表 / 搜索", super: true, admin: false },
                  { label: "用户详情 / 用户名历史", super: true, admin: false },
                  { label: "修改用户角色", super: true, admin: false },
                  { label: "冻结 / 解除冻结", super: true, admin: false },
                  { label: "封禁 / 解除封禁", super: true, admin: false },
                  { label: "批量操作（导出/冻结）", super: true, admin: false },
                  { label: "主页管理", super: true, admin: true },
                  { label: "举报管理", super: true, admin: true },
                  { label: "AI 用量查看", super: true, admin: true },
                  { label: "访问日志", super: true, admin: false },
                  { label: "审计日志", super: true, admin: false },
                  { label: "系统配置", super: true, admin: false },
                  { label: "比赛展示管理", super: true, admin: false },
                  { label: "数据清理（90天前）", super: true, admin: false },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-[#F0EDE6] last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                    <td className="py-2.5 px-2 text-center">{row.super ? "✓" : "—"}</td>
                    <td className="py-2.5 pl-2 text-center">{row.admin ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 高风险操作列表 */}
        <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">高风险操作分级</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">
            以下操作需要二次确认，永久封禁额外需要输入 <span className="font-black text-[#B42318]">CONFIRM_BAN</span> 确认。
          </p>
          <div className="mt-4 grid gap-3">
            {RISK_OPERATIONS.map((op) => {
              const levelColor =
                op.level === "critical" ? "bg-[#FFF1F0] text-[#B42318] border-[#F0C8C8]" :
                op.level === "danger" ? "bg-[#FFF9E8] text-[#8C612E] border-[#E8DCCB]" :
                "bg-[#E6F0D8] text-[#355126] border-[#C8D8B8]";
              const levelLabel =
                op.level === "critical" ? "最高风险" :
                op.level === "danger" ? "危险" : "警告";
              return (
                <div key={op.key} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${levelColor}`}>
                  <div className="flex-1">
                    <p className="text-sm font-black">{op.label}</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">{op.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-2xl px-2 py-1 text-xs font-black ${levelColor}`}>
                    {levelLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 快速入口 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/jeepwork/users"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B6FFF]">Users</p>
            <h3 className="mt-2 text-lg font-black text-[#2B241E]">用户管理</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">搜索用户、冻结封禁、修改角色。</p>
            <p className="mt-4 text-sm font-bold text-[#5B6FFF] group-hover:underline">进入用户管理 →</p>
          </Link>
          <Link
            href="/jeepwork/roles"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8C612E]">Roles</p>
            <h3 className="mt-2 text-lg font-black text-[#2B241E]">角色管理</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">查看所有管理员账号与权限分配。</p>
            <p className="mt-4 text-sm font-bold text-[#8C612E] group-hover:underline">进入角色管理 →</p>
          </Link>
          <Link
            href="/jeepwork/audit"
            className="group rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">Audit</p>
            <h3 className="mt-2 text-lg font-black text-[#2B241E]">审计日志</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">查看所有管理员操作的完整审计记录。</p>
            <p className="mt-4 text-sm font-bold text-[#B42318] group-hover:underline">进入审计日志 →</p>
          </Link>
        </section>

        {/* 自我保护规则 */}
        <section className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#7A6D5E]">自我保护规则</h2>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-[#7A6D5E]">
            <li>任何角色都<strong className="text-[#2B241E]">不能修改自己的角色</strong>，不能删除自己。</li>
            <li>最后一名超级管理员<strong className="text-[#2B241E]">不可被降级</strong>（PostgreSQL advisory lock 保护）。</li>
            <li>系统账号（isSystem=true）<strong className="text-[#2B241E]">不可被冻结、封禁或删除</strong>。</li>
            <li>高风险操作（冻结/封禁）需要填写原因，所有操作均记录审计日志。</li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
