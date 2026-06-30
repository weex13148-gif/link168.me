"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

type AdminUser = { email: string; role: string };

type RoleGroup = {
  role: string;
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
  if (role === "admin") return "管理员";
  if (role === "user") return "普通用户";
  return role;
}

const ROLE_ORDER = ["super_admin", "admin", "user"];

export default function JeepworkRolesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [action, setAction] = useState<ActionState>({ loading: false, message: "", isError: false });
  const [modal, setModal] = useState<{ type: "none" } | { type: "changeRole"; targetId: string; targetEmail: string; newRole: string }>({ type: "none" });

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

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [saRes, adminRes] = await Promise.all([
        fetch("/api/jeepwork/users?role=super_admin&page=1", { cache: "no-store" }),
        fetch("/api/jeepwork/users?role=admin&page=1", { cache: "no-store" }),
      ]);
      const saJson = (await saRes.json()) as { success?: boolean; data?: { users?: { id: string; email: string; createdAt: string; profile: { username: string | null; displayName: string | null } | null; stats: { sessionCount: number; shortLinkCount: number } }[] } };
      const adminJson = (await adminRes.json()) as { success?: boolean; data?: { users?: { id: string; email: string; createdAt: string; profile: { username: string | null; displayName: string | null } | null; stats: { sessionCount: number; shortLinkCount: number } }[] } };

      const newGroups: RoleGroup[] = [
        {
          role: "super_admin",
          label: "超级管理员",
          users: saJson.data?.users ?? [],
        },
        {
          role: "admin",
          label: "管理员",
          users: adminJson.data?.users ?? [],
        },
      ];
      setGroups(newGroups);
    } catch {
      setError("加载角色列表失败");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadGroups();
  }, [user, loadGroups]);

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

  async function handleRoleChange() {
    if (modal.type === "none") return;
    setAction({ loading: true, message: "", isError: false });
    try {
      const res = await fetch("/api/jeepwork/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.targetId, role: modal.newRole }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || json.success !== true) {
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
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Roles",
        title: "角色管理",
        subtitle: "统一查看所有管理员和超级管理员账号，进行角色分配与调整。",
        highlight: "#8C612E",
      }}
    >
      {action.message && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${action.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"}`}>
          {action.message}
        </div>
      )}

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
              <div className="flex items-center gap-3">
                <span className={`rounded-2xl px-3 py-1 text-sm font-black ${
                  group.role === "super_admin" ? "bg-[#5B6FFF] text-white" : "bg-[#8C612E] text-white"
                }`}>
                  {group.label}
                </span>
                <span className="text-sm font-bold text-[#7A6D5E]">共 {group.users.length} 人</span>
              </div>

              {group.users.length === 0 ? (
                <p className="mt-4 text-sm text-[#7A6D5E]">暂无 {group.label}</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {group.users.map((u) => {
                    const isSelf = user?.email?.toLowerCase() === u.email.toLowerCase();
                    return (
                      <div key={u.id} className="flex items-center justify-between rounded-2xl border border-[#E8DCCB] bg-[#FFF9F0] px-5 py-4">
                        <div>
                          <p className="font-bold text-[#2B241E]">{u.email}</p>
                          <p className="mt-1 text-xs text-[#7A6D5E]">
                            注册时间：{formatDate(u.createdAt)}
                            {u.profile?.username ? ` · @${u.profile.username}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelf ? (
                            <span className="rounded-2xl bg-[#E6F0D8] px-4 py-2 text-sm font-bold text-[#355126]">
                              当前登录账号
                            </span>
                          ) : (
                            <>
                              {group.role !== "super_admin" && (
                                <button
                                  type="button"
                                  onClick={() => setModal({ type: "changeRole", targetId: u.id, targetEmail: u.email, newRole: "super_admin" })}
                                  className="min-h-10 rounded-2xl bg-[#5B6FFF] px-4 text-sm font-black text-white"
                                >
                                  升为超级管理员
                                </button>
                              )}
                              {group.role !== "user" && (
                                <button
                                  type="button"
                                  onClick={() => setModal({ type: "changeRole", targetId: u.id, targetEmail: u.email, newRole: "user" })}
                                  className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
                                >
                                  降为普通用户
                                </button>
                              )}
                              <Link
                                href={`/jeepwork/users/${u.id}`}
                                className="min-h-10 rounded-2xl border border-[#5B6FFF] bg-white px-4 text-sm font-bold text-[#5B6FFF]"
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

          {/* 角色权限说明 */}
          <section className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#7A6D5E]">角色权限说明</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#5B6FFF]/5 p-4">
                <p className="font-black text-[#5B6FFF]">超级管理员（super_admin）</p>
                <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                  拥有全部后台权限：用户管理、角色分配、冻结/封禁、访问日志、审计日志、系统配置、数据清理等。
                </p>
              </div>
              <div className="rounded-2xl bg-[#8C612E]/5 p-4">
                <p className="font-black text-[#8C612E]">管理员（admin）</p>
                <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                  拥有运营权限：主页管理、举报管理、AI 用量查看。不可访问用户管理、审计日志和系统配置。
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {modal.type === "changeRole" && (
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
      )}
    </AdminShell>
  );
}
