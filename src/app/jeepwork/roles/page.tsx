"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

type RoleGroup = {
  role: "super_admin";
  label: string;
  users: {
    id: string;
    email: string;
    createdAt: string;
    profile: { username: string | null; displayName: string | null } | null;
    stats: { sessionCount: number; shortLinkCount: number };
  }[];
};

type ActionState = { loading: boolean; message: string; isError: boolean };

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "user") return "普通用户";
  return role;
}

export default function JeepworkRolesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const logout = useJeepworkLogout(router);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [action, setAction] = useState<ActionState>({ loading: false, message: "", isError: false });
  const [modal, setModal] = useState<
    { type: "none" }
    | { type: "changeRole"; targetId: string; targetEmail: string; newRole: "super_admin" | "user" }
  >({ type: "none" });

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
        if (cancelled) return;
        if (result.success && result.user?.role === "super_admin") {
          setUser(result.user);
        } else if (result.success && result.user) {
          router.push("/jeepwork");
        } else {
          router.push("/jeepwork/login");
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const superAdminResponse = await fetch("/api/jeepwork/users?role=super_admin&page=1", { cache: "no-store" });
      const superAdminJson = (await superAdminResponse.json()) as {
        success?: boolean;
        data?: { users?: RoleGroup["users"] };
      };

      if (!superAdminResponse.ok || superAdminJson.success !== true) {
        setError("加载角色列表失败");
        return;
      }

      setGroups([
        {
          role: "super_admin",
          label: "超级管理员",
          users: superAdminJson.data?.users ?? [],
        },
      ]);
    } catch {
      setError("加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadGroups();
  }, [user, loadGroups]);

  async function handleRoleChange() {
    if (modal.type === "none") return;
    setAction({ loading: true, message: "", isError: false });
    try {
      const response = await fetch("/api/jeepwork/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.targetId, role: modal.newRole }),
      });
      const json = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || json.success !== true) {
        setAction({ loading: false, message: json.error?.message || "操作失败", isError: true });
      } else {
        setAction({ loading: false, message: `已将 ${modal.targetEmail} 设为 ${roleLabel(modal.newRole)}`, isError: false });
        void loadGroups();
      }
    } catch {
      setAction({ loading: false, message: "网络错误", isError: true });
    }
    setModal({ type: "none" });
  }

  return (
    <AdminShell
      currentPageLabel="角色管理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "Roles",
        title: "角色管理",
        subtitle: "平台后台只保留超级管理员；普通用户的角色变更统一在用户管理中完成。",
        highlight: "#8C612E",
      }}
    >
      {action.message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${action.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"}`}>
          {action.message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载角色列表…
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#B42318]">{error}</p>
          <button
            type="button"
            onClick={() => void loadGroups()}
            className="mt-4 min-h-11 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            重试
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.role} className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-[#5B6FFF] px-3 py-1 text-sm font-black text-white">
                  {group.label}
                </span>
                <span className="text-sm font-bold text-[#7A6D5E]">共 {group.users.length} 人</span>
              </div>

              {group.users.length === 0 ? (
                <p className="mt-4 text-sm text-[#7A6D5E]">暂无 {group.label}</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {group.users.map((item) => {
                    const isSelf = user?.email?.toLowerCase() === item.email.toLowerCase();
                    return (
                      <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-[#E8DCCB] bg-[#FFF9F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all font-bold text-[#2B241E]">{item.email}</p>
                          <p className="mt-1 text-xs text-[#7A6D5E]">
                            注册时间：{formatDate(item.createdAt)}
                            {item.profile?.username ? ` · @${item.profile.username}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isSelf ? (
                            <span className="rounded-2xl bg-[#E6F0D8] px-4 py-2 text-sm font-bold text-[#355126]">
                              当前登录账号
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setModal({ type: "changeRole", targetId: item.id, targetEmail: item.email, newRole: "user" })}
                                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
                              >
                                降为普通用户
                              </button>
                              <Link
                                href={`/jeepwork/users/${item.id}`}
                                className="inline-flex min-h-10 items-center rounded-2xl border border-[#5B6FFF] bg-white px-4 text-sm font-bold text-[#5B6FFF]"
                              >
                                查看详情
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          <section className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#7A6D5E]">角色权限说明</h2>
            <div className="mt-4">
              <div className="rounded-2xl bg-[#5B6FFF]/5 p-4">
                <p className="font-black text-[#5B6FFF]">超级管理员（super_admin）</p>
                <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                  唯一平台后台角色，可管理用户、主页、举报、AI、支付配置、审计和系统健康。
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {modal.type === "changeRole" ? (
        <ConfirmModal
          isOpen={true}
          dangerLevel="warn"
          title="确认修改角色"
          description={`确定要将 ${modal.targetEmail} 设为 ${roleLabel(modal.newRole)} 吗？`}
          extraInfo="角色变更将立即生效，请谨慎操作。"
          onConfirm={handleRoleChange}
          onClose={() => setModal({ type: "none" })}
          loading={action.loading}
        />
      ) : null}
      {logout.Modal}
    </AdminShell>
  );
}
