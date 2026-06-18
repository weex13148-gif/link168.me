"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type UserRow = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  isSystem: boolean;
  createdAt: string;
  profile: { id: string; username: string; displayName: string | null; isPublic: boolean; createdAt: string } | null;
  stats: { sessionCount: number; shortLinkCount: number; aiUsageLogCount: number };
};

type UsersPayload = {
  success?: boolean;
  error?: string;
  notAdmin?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  users?: UserRow[];
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (keyword.trim()) params.set("q", keyword.trim());
    if (roleFilter) params.set("role", roleFilter);

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json()) as UsersPayload;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403 || result.notAdmin) {
        setNotAdmin(true);
        setLoading(false);
        return;
      }
      if (!response.ok || !result.success) {
        setError(result.error || "加载用户列表失败");
        setLoading(false);
        return;
      }

      setUsers(result.users || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
      setLoading(false);
    } catch {
      setError("网络错误，无法加载用户列表");
      setLoading(false);
    }
  }, [page, keyword, roleFilter, router]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function updateRole(userId: string, newRole: string) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: newRole }),
    });
    const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
    if (!response.ok || !result.success) {
      setToast(result.error || "更新角色失败");
      return;
    }
    setToast(result.message || "角色更新成功");
    await load();
  }

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }
    return pages;
  }, [page, totalPages]);

  if (notAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="header" />
        </header>
        <div className="mt-8 rounded-[28px] border border-[#F2C078] bg-[#FFF7E8] p-6 shadow-sm">
          <h1 className="text-2xl font-black text-[#8C612E]">超级管理员权限不足</h1>
          <p className="mt-3 text-sm leading-6 text-[#8C612E]">只有 role=super_admin 的账号可以访问用户管理页面。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <BrandLogo size="header" />
      </header>

      <section className="mt-8 rounded-[32px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-7 shadow-[0_24px_80px_rgba(86,68,46,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6F8F4E]">User Administration</p>
        <h1 className="mt-3 text-4xl font-black text-[#2B241E]">用户列表</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">查看、搜索用户，并修改角色。内测版本仅开放 super_admin / admin / user 三级，不做复杂多角色权限体系。</p>
      </section>

      {toast ? (
        <div className="mt-6 rounded-2xl bg-[#E6F0D8] px-4 py-3 text-sm font-bold text-[#355126]">{toast}</div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="mt-6 grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">邮箱 / 主页用户名 / 显示名</span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="输入关键字进行搜索"
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">角色筛选</span>
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
          >
            <option value="">全部角色</option>
            <option value="super_admin">超级管理员</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white"
        >
          刷新
        </button>
      </section>

      <section className="mt-4 grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FFF9E8] p-4">
          <p className="text-sm font-bold text-[#8C612E]">当前页数量</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{users.length}</p>
        </div>
        <div className="rounded-2xl bg-[#E6F0D8] p-4">
          <p className="text-sm font-bold text-[#35512E]">总用户数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{total}</p>
        </div>
        <div className="rounded-2xl bg-[#F2EDE3] p-4">
          <p className="text-sm font-bold text-[#6B5D4F]">当前页 / 总页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">
            {page} / {totalPages}
          </p>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#2B241E] shadow-sm">
          正在加载用户列表…
        </div>
      ) : null}

      {!loading && users.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          暂无匹配的用户。
        </div>
      ) : null}

      <section className="mt-6 grid gap-4">
        {users.map((user) => (
          <article key={user.id} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#6B5D4F]">
                    角色：{user.role === "super_admin" ? "超级管理员" : user.role === "admin" ? "管理员" : "普通用户"}
                  </span>
                  {user.isSystem ? (
                    <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">系统账号</span>
                  ) : null}
                  {user.emailVerified ? (
                    <span className="rounded-2xl bg-[#E6F0D8] px-3 py-1 text-xs font-black text-[#35512E]">已验证邮箱</span>
                  ) : (
                    <span className="rounded-2xl bg-[#FFF7E8] px-3 py-1 text-xs font-black text-[#8C612E]">邮箱未验证</span>
                  )}
                </div>
                <p className="mt-3 truncate text-lg font-black text-[#2B241E]">{user.email}</p>
                <p className="mt-1 text-sm leading-6 text-[#6B5D4F]">
                  注册时间：{formatDate(user.createdAt)}
                </p>
                {user.profile ? (
                  <p className="mt-1 text-sm leading-6 text-[#6B5D4F]">
                    主页：<span className="font-bold text-[#2B241E]">@{user.profile.username}</span>
                    {user.profile.displayName ? ` · ${user.profile.displayName}` : ""}
                    {user.profile.isPublic ? " · 公开" : " · 已隐藏"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">该用户尚未创建主页。</p>
                )}
                <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                  会话 {user.stats.sessionCount} · 短链 {user.stats.shortLinkCount} · AI 日志 {user.stats.aiUsageLogCount}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {user.isSystem ? (
                  <span className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm font-bold text-[#7A6D5E]">系统账号不可修改</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void updateRole(user.id, "super_admin")}
                      disabled={user.role === "super_admin"}
                      className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                    >
                      升为 super_admin
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateRole(user.id, "admin")}
                      disabled={user.role === "admin"}
                      className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                    >
                      设为 admin
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateRole(user.id, "user")}
                      disabled={user.role === "user"}
                      className="min-h-11 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      恢复普通用户
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && totalPages > 1 ? (
        <section className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            上一页
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`min-h-11 rounded-2xl px-4 text-sm font-bold ${
                pageNumber === page ? "bg-[#6F8F4E] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            下一页
          </button>
        </section>
      ) : null}
    </main>
  );
}
