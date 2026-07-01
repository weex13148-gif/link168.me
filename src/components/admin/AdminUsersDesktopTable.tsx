"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type UserSummary = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPublic: boolean;
  } | null;
  membership: {
    planCode: string;
    status: string;
    currentPeriodEnd: string | null;
  };
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  restrictions: Array<{ type: string; reason: string | null; expiresAt: string | null }>;
};

type SummaryData = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  users: UserSummary[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  return "普通用户";
}

function planLabel(planCode: string) {
  const code = planCode.toLowerCase();
  if (code.includes("enterprise")) return "企业版";
  if (code.includes("plus") || code.includes("pro") || code.includes("member")) return "会员版";
  return "免费版";
}

function accountStatus(user: UserSummary) {
  const types = user.restrictions.map((item) => item.type);
  if (types.includes("BANNED")) return { label: "已封禁", className: "bg-[#FFF1F0] text-[#B42318]" };
  if (types.includes("ADMIN_FREEZE")) return { label: "已冻结", className: "bg-[#FFF7E8] text-[#8C612E]" };
  if (types.includes("EMAIL_UNVERIFIED")) return { label: "邮箱待验证限制", className: "bg-[#FFF7E8] text-[#8C612E]" };
  return { label: "正常", className: "bg-[#EEF4E7] text-[#355126]" };
}

export default function AdminUsersDesktopTable() {
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<SummaryData>({ page: 1, pageSize: 30, total: 0, totalPages: 1, users: [] });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (keyword.trim()) params.set("q", keyword.trim());
      if (role) params.set("role", role);
      const response = await fetch(`/api/jeepwork/users/summary?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as { success?: boolean; data?: SummaryData; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) {
        setError(result.error?.message || "用户总览加载失败。");
        return;
      }
      setData(result.data);
    } catch {
      setError("网络连接失败，无法加载用户总览。");
    } finally {
      setLoading(false);
    }
  }, [keyword, page, role]);

  useEffect(() => { void load(); }, [load]);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  return (
    <section className="grid gap-4">
      <form onSubmit={search} className="grid gap-3 rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[minmax(260px,1fr)_190px_auto] sm:items-end">
        <label className="grid gap-2 text-sm font-black text-[#2B241E]">
          搜索用户
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="邮箱、用户名或显示名称" className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal outline-none focus:border-[#6F8F4E]" />
        </label>
        <label className="grid gap-2 text-sm font-black text-[#2B241E]">
          用户角色
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal outline-none">
            <option value="">全部角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
            <option value="super_admin">超级管理员</option>
          </select>
        </label>
        <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60">{loading ? "加载中…" : "搜索"}</button>
      </form>

      {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

      <div className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4">
          <div>
            <h2 className="font-black text-[#2B241E]">用户总览</h2>
            <p className="mt-1 text-xs text-[#7A6D5E]">共 {data.total} 名用户 · 第 {data.page} / {data.totalPages} 页</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#3F5F31] disabled:opacity-50">刷新</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full text-left text-sm">
            <thead className="bg-[#F7F3EC] text-xs font-black text-[#6F6255]">
              <tr>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">邮箱验证</th>
                <th className="px-4 py-3">会员等级</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">账号状态</th>
                <th className="px-4 py-3">注册时间</th>
                <th className="px-4 py-3">最近登录</th>
                <th className="px-4 py-3">最近 IP</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="text-[#3F352C]">
              {loading ? <tr><td colSpan={9} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">正在加载用户数据…</td></tr> : null}
              {!loading && data.users.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">暂无匹配用户</td></tr> : null}
              {!loading ? data.users.map((user) => {
                const status = accountStatus(user);
                return (
                  <tr key={user.id} className="border-t border-[#EEE5D8] align-top">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[210px] items-center gap-3">
                        {user.profile?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.profile.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                        ) : <span className="grid size-9 place-items-center rounded-full bg-[#EEF4E7] font-black text-[#4F6D37]">{user.email.slice(0, 1).toUpperCase()}</span>}
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-black" title={user.email}>{user.email}</p>
                          <p className="mt-1 text-xs text-[#7A6D5E]">{user.profile ? `@${user.profile.username}${user.profile.displayName ? ` · ${user.profile.displayName}` : ""}` : "尚未创建主页"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{user.emailVerified ? <span className="rounded-full bg-[#EEF4E7] px-2.5 py-1 text-xs font-black text-[#355126]">已验证</span> : <span className="rounded-full bg-[#FFF7E8] px-2.5 py-1 text-xs font-black text-[#8C612E]">未验证</span>}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-xs font-black text-[#334E9E]">{planLabel(user.membership.planCode)}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">{roleLabel(user.role)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${status.className}`}>{status.label}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{user.lastLoginIp || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[150px] gap-2">
                        {user.profile ? <Link href={`/${user.profile.username}`} target="_blank" className="rounded-lg border border-[#E8DCCB] bg-white px-3 py-2 text-xs font-black text-[#3F5F31]">查看主页</Link> : null}
                        <a href="#advanced-user-management" className="rounded-lg bg-[#6F8F4E] px-3 py-2 text-xs font-black text-white">更多操作</a>
                      </div>
                    </td>
                  </tr>
                );
              }) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E8DCCB] px-5 py-4">
          <button type="button" disabled={data.page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">上一页</button>
          <button type="button" disabled={data.page >= data.totalPages || loading} onClick={() => setPage((value) => Math.min(data.totalPages, value + 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">下一页</button>
        </div>
      </div>
    </section>
  );
}
