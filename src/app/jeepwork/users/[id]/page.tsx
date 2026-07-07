"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { ConfirmModal, type ConfirmModalDangerLevel } from "@/components/admin/ConfirmModal";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";
import { AdminCard, AdminErrorState, AdminLoadingState, AdminStatusBadgeFromCode } from "@/components/admin/AdminKit";

type AdminUser = { email: string; role: string };

type UserRestriction = {
  id: string;
  type: string;
  reason: string | null;
  source: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  clearedAt: string | null;
  createdAt: string;
};

type UsernameHistoryEntry = {
  id: string;
  username: string;
  normalizedUsername: string;
  createdAt: string;
};

type AuditLogEntry = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  success: boolean;
  metadataRaw: string | null;
  ipHash: string | null;
  createdAt: string;
};

type UserDetail = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  profile: { id: string; username: string | null; displayName: string | null; isPublic: boolean; createdAt: string } | null;
  usernameHistory: UsernameHistoryEntry[];
  restrictions: UserRestriction[];
  stats: { sessionCount: number; shortLinkCount: number; aiUsageLogCount: number };
  recentAuditLogs: AuditLogEntry[];
};

type ModalState =
  | { type: "none" }
  | { type: "freeze" }
  | { type: "ban" }
  | { type: "unfreeze"; restrictionId: string }
  | { type: "unban"; restrictionId: string }
  | { type: "changeRole"; newRole: string };

type ActionResult = { message: string; isError: boolean };

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatDateShort(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { hour12: false });
}

function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  if (role === "user") return "普通用户";
  return role;
}

function restrictionTypeLabel(type: string) {
  if (type === "ADMIN_FREEZE") return "管理员冻结";
  if (type === "BANNED") return "永久封禁";
  if (type === "EMAIL_UNVERIFIED") return "邮箱未验证";
  if (type === "SECURITY_RISK") return "安全风险";
  return type;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    "admin.freeze_user": "冻结用户",
    "admin.unfreeze_user": "解除冻结",
    "admin.ban_user": "封禁用户",
    "admin.update_user_role": "修改角色",
    "admin.reset_user_password": "重置密码",
    "admin.view_original_ip": "查看原始IP",
    "admin.data_cleanup": "数据清理",
  };
  return map[action] || action;
}

export default function JeepworkUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [actionLoading, setActionLoading] = useState(false);
  const logout = useJeepworkLogout(router);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Auth check
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

  const loadDetail = useCallback(async () => {
    if (!resolvedParams) return;
    setLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/jeepwork/users/${resolvedParams.id}`, { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: UserDetail; error?: { message?: string } };
      if (!res.ok || json.success !== true || !json.data) {
        setDetailError(json.error?.message || "加载用户详情失败");
        setLoading(false);
        return;
      }
      setDetail(json.data);
    } catch {
      setDetailError("网络错误，无法加载用户详情。");
    }
    setLoading(false);
  }, [resolvedParams]);

  useEffect(() => {
    if (resolvedParams) {
      void loadDetail();
    }
  }, [resolvedParams, loadDetail]);

  async function handleModalConfirm(reason: string) {
    setActionLoading(true);
    setActionResult(null);

    try {
      if (modal.type === "freeze" || modal.type === "ban") {
        const action = modal.type;
        const res = await fetch(`/api/jeepwork/users/${resolvedParams?.id}/restrictions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        });
        const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
        if (!res.ok || json.success !== true) {
          setActionResult({ message: json.error?.message || "操作失败", isError: true });
        } else {
          setActionResult({ message: action === "ban" ? "用户已封禁" : "用户已冻结", isError: false });
          void loadDetail();
        }
      } else if (modal.type === "unfreeze") {
        const res = await fetch(`/api/jeepwork/users/${resolvedParams?.id}/restrictions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unfreeze", reason, restrictionId: modal.restrictionId }),
        });
        const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
        if (!res.ok || json.success !== true) {
          setActionResult({ message: json.error?.message || "操作失败", isError: true });
        } else {
          setActionResult({ message: "已解除冻结", isError: false });
          void loadDetail();
        }
      } else if (modal.type === "unban") {
        const res = await fetch(`/api/jeepwork/users/${resolvedParams?.id}/restrictions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unban", reason, restrictionId: modal.restrictionId }),
        });
        const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
        if (!res.ok || json.success !== true) {
          setActionResult({ message: json.error?.message || "操作失败", isError: true });
        } else {
          setActionResult({ message: "已解除封禁", isError: false });
          void loadDetail();
        }
      } else if (modal.type === "changeRole") {
        const res = await fetch("/api/jeepwork/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: resolvedParams?.id, role: modal.newRole }),
        });
        const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
        if (!res.ok || json.success !== true) {
          setActionResult({ message: json.error?.message || "操作失败", isError: true });
        } else {
          setActionResult({ message: `角色已更新为 ${roleLabel(modal.newRole)}`, isError: false });
          void loadDetail();
        }
      }
    } catch {
      setActionResult({ message: "网络错误", isError: true });
    }

    setActionLoading(false);
    setModal({ type: "none" });
  }

  const activeFreeze = detail?.restrictions.find((r) => r.type === "ADMIN_FREEZE" && r.isActive);
  const activeBan = detail?.restrictions.find((r) => r.type === "BANNED" && r.isActive);

  const currentRole = detail?.role || "";
  const isSelf = user?.email && detail?.email && user.email.toLowerCase() === detail.email.toLowerCase();

  const getModalProps = () => {
    switch (modal.type) {
      case "freeze":
        return {
          isOpen: true,
          dangerLevel: "warn" as ConfirmModalDangerLevel,
          title: "确认冻结用户",
          description: `确定要冻结用户 ${detail?.email} 吗？冻结期间该用户的主页将无法访问。`,
          impactList: [
            "该用户的主页将立即不可访问",
            "该用户将无法登录后台",
            "需管理员手动解除冻结才能恢复",
          ],
          irreversibleNotice: "冻结将持续到管理员手动解除为止",
          requireReason: true,
          reasonMinLength: 10,
          reasonPlaceholder: "请说明冻结原因，例如：经核查确认存在违规行为。",
          onConfirmWithReason: handleModalConfirm,
          onClose: () => setModal({ type: "none" }),
          singleButton: false,
          loading: actionLoading,
        };
      case "ban":
        return {
          isOpen: true,
          dangerLevel: "critical" as ConfirmModalDangerLevel,
          title: "确认永久封禁",
          description: `确定要永久封禁用户 ${detail?.email} 吗？此操作会立即禁止该用户登录，其用户名将被永久保留并禁止再注册。`,
          impactList: [
            "该用户将立即被禁止登录",
            "用户名将被永久保留并禁止再注册",
            "解除封禁需要超级管理员确认",
          ],
          irreversibleNotice: "这是永久性操作，请谨慎确认",
          inputConfirmMatch: "CONFIRM_BAN",
          inputPlaceholder: "请输入 CONFIRM_BAN",
          requireReason: true,
          reasonMinLength: 10,
          reasonPlaceholder: "请说明封禁原因，例如：经核查确认存在严重违规行为。",
          onConfirmWithReason: handleModalConfirm,
          onClose: () => setModal({ type: "none" }),
          singleButton: false,
          loading: actionLoading,
        };
      case "unfreeze":
        return {
          isOpen: true,
          dangerLevel: "warn" as ConfirmModalDangerLevel,
          title: "确认解除冻结",
          description: `确定要解除对用户 ${detail?.email} 的冻结状态吗？`,
          impactList: ["该用户的主页将恢复访问", "该用户将可以重新登录"],
          requireReason: true,
          reasonMinLength: 10,
          reasonPlaceholder: "请说明解除冻结的原因。",
          onConfirmWithReason: handleModalConfirm,
          onClose: () => setModal({ type: "none" }),
          singleButton: false,
          loading: actionLoading,
        };
      case "unban":
        return {
          isOpen: true,
          dangerLevel: "danger" as ConfirmModalDangerLevel,
          title: "确认解除封禁",
          description: `确定要解除对用户 ${detail?.email} 的封禁吗？`,
          impactList: ["该用户将可以重新登录", "用户名历史记录保留"],
          irreversibleNotice: "解除后该用户可立即恢复使用",
          requireReason: true,
          reasonMinLength: 10,
          reasonPlaceholder: "请说明解除封禁的原因，例如：经申诉核实确认无违规。",
          onConfirmWithReason: handleModalConfirm,
          onClose: () => setModal({ type: "none" }),
          singleButton: false,
          loading: actionLoading,
        };
      case "changeRole":
        return {
          isOpen: true,
          dangerLevel: "warn" as ConfirmModalDangerLevel,
          title: `确认修改角色`,
          description: `确定要将 ${detail?.email} 的角色修改为 ${roleLabel(modal.newRole)} 吗？`,
          impactList: [
            `角色将变更为：${roleLabel(modal.newRole)}`,
            "该用户的权限范围将立即改变",
            "此操作将写入审计日志",
          ],
          requireReason: true,
          reasonMinLength: 10,
          reasonPlaceholder: "请说明修改角色的原因。",
          onConfirmWithReason: handleModalConfirm,
          onClose: () => setModal({ type: "none" }),
          singleButton: false,
          loading: actionLoading,
        };
      default:
        return null;
    }
  };

  const modalProps = getModalProps();

  if (!resolvedParams) return null;

  return (
    <AdminShell
      currentPageLabel={
        <span>
          <Link href="/jeepwork/users" className="text-[#6F8F4E] hover:underline">用户管理</Link>
          <span className="mx-2 text-[#B8ACA0]">›</span>
          <span>用户详情</span>
        </span>
      }
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "User Detail",
        title: detail ? `用户详情 — ${detail.email}` : "用户详情",
        subtitle: "查看用户信息、冻结记录、操作历史。",
        highlight: "#5B6FFF",
      }}
    >
      {actionResult && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${actionResult.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"}`}>
          {actionResult.message}
        </div>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载用户详情…
        </div>
      ) : detailError ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#B42318]">{detailError}</p>
          <button
            type="button"
            onClick={() => void loadDetail()}
            className="mt-4 min-h-11 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            重试
          </button>
        </div>
      ) : detail ? (
        <div className="grid gap-6">
          {/* 基本信息卡片 */}
          <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-[#5B6FFF] px-3 py-1 text-xs font-black text-white">
                {roleLabel(detail.role)}
              </span>
              {detail.isSystem && (
                <span className="rounded-2xl bg-[#2B241E] px-3 py-1 text-xs font-black text-[#FFF9F0]">系统账号</span>
              )}
              {activeBan ? (
                <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">已封禁</span>
              ) : activeFreeze ? (
                <span className="rounded-2xl bg-[#FFF9E8] px-3 py-1 text-xs font-black text-[#8C612E]">已冻结</span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-[#7A6D5E]">邮箱</p>
                <p className="mt-1 truncate text-base font-black text-[#2B241E]">{detail.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#7A6D5E]">邮箱验证</p>
                <p className="mt-1 text-base font-black text-[#2B241E]">{detail.emailVerified ? "已验证" : "未验证"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#7A6D5E]">注册时间</p>
                <p className="mt-1 text-base font-black text-[#2B241E]">{formatDate(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#7A6D5E]">最后更新</p>
                <p className="mt-1 text-base font-black text-[#2B241E]">{formatDate(detail.updatedAt)}</p>
              </div>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#FFF9F0] p-4">
              <div className="text-center">
                <p className="text-xs font-bold text-[#7A6D5E]">会话</p>
                <p className="mt-1 text-xl font-black text-[#2B241E]">{detail.stats.sessionCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-[#7A6D5E]">短链</p>
                <p className="mt-1 text-xl font-black text-[#2B241E]">{detail.stats.shortLinkCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-[#7A6D5E]">AI 日志</p>
                <p className="mt-1 text-xl font-black text-[#2B241E]">{detail.stats.aiUsageLogCount}</p>
              </div>
            </div>

            {/* 角色变更操作 */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#E8DCCB] pt-4">
              {isSelf ? (
                <span className="rounded-2xl bg-[#E6F0D8] px-4 py-2 text-sm font-bold text-[#355126]">
                  当前登录账号 · 角色变更已禁用（系统保护）
                </span>
              ) : (
                <>
                  <p className="mr-2 text-sm font-bold text-[#7A6D5E]">修改角色：</p>
                  {currentRole !== "admin" && (
                    <button
                      type="button"
                      onClick={() => setModal({ type: "changeRole", newRole: "admin" })}
                      className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7]"
                    >
                      设为管理员
                    </button>
                  )}
                  {currentRole !== "super_admin" && (
                    <button
                      type="button"
                      onClick={() => setModal({ type: "changeRole", newRole: "super_admin" })}
                      className="min-h-10 rounded-2xl bg-[#8C612E] px-4 text-sm font-black text-white hover:bg-[#7A5525]"
                    >
                      升为超级管理员
                    </button>
                  )}
                  {currentRole !== "user" && (
                    <button
                      type="button"
                      onClick={() => setModal({ type: "changeRole", newRole: "user" })}
                      className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7]"
                    >
                      恢复普通用户
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Profile 信息 */}
          {detail.profile && (
            <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">主页信息</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-[#7A6D5E]">用户名</p>
                  <p className="mt-1 text-base font-black text-[#2B241E]">@{detail.profile.username || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#7A6D5E]">展示名</p>
                  <p className="mt-1 text-base font-black text-[#2B241E]">{detail.profile.displayName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#7A6D5E]">主页可见性</p>
                  <p className="mt-1 text-base font-black text-[#2B241E]">{detail.profile.isPublic ? "公开" : "已隐藏"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#7A6D5E]">创建时间</p>
                  <p className="mt-1 text-base font-black text-[#2B241E]">{formatDate(detail.profile.createdAt)}</p>
                </div>
              </div>
            </section>
          )}

          {/* 用户名历史 */}
          <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">用户名历史</h2>
            {detail.usernameHistory.length === 0 ? (
              <p className="text-sm text-[#7A6D5E]">暂无用户名变更记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DCCB] text-left text-xs font-bold text-[#7A6D5E]">
                      <th className="pb-2">用户名</th>
                      <th className="pb-2">规范化名</th>
                      <th className="pb-2">变更时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.usernameHistory.map((entry) => (
                      <tr key={entry.id} className="border-b border-[#F0EDE6] last:border-0">
                        <td className="py-2 font-bold text-[#2B241E]">{entry.username}</td>
                        <td className="py-2 text-[#7A6D5E]">{entry.normalizedUsername}</td>
                        <td className="py-2 text-[#7A6D5E]">{formatDateShort(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 冻结与封禁记录 */}
          <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">冻结与封禁记录</h2>
              <div className="flex flex-wrap gap-2">
                {activeBan ? null : activeFreeze ? (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "unfreeze", restrictionId: activeFreeze.id })}
                    className="min-h-10 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-black text-white"
                  >
                    解除冻结
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "freeze" })}
                      className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
                    >
                      冻结用户
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "ban" })}
                      className="min-h-10 rounded-2xl bg-[#B42318] px-4 text-sm font-black text-white"
                    >
                      永久封禁
                    </button>
                  </>
                )}
                {activeBan ? (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "unban", restrictionId: activeBan.id })}
                    className="min-h-10 rounded-2xl bg-[#8C612E] px-4 text-sm font-black text-white"
                  >
                    解除封禁
                  </button>
                ) : null}
              </div>
            </div>

            {detail.restrictions.length === 0 ? (
              <p className="text-sm text-[#7A6D5E]">暂无冻结或封禁记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DCCB] text-left text-xs font-bold text-[#7A6D5E]">
                      <th className="pb-2">类型</th>
                      <th className="pb-2">原因</th>
                      <th className="pb-2">状态</th>
                      <th className="pb-2">开始时间</th>
                      <th className="pb-2">到期时间</th>
                      <th className="pb-2">解除时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.restrictions.map((r) => (
                      <tr key={r.id} className="border-b border-[#F0EDE6] last:border-0">
                        <td className="py-2">
                          <span className={`rounded-2xl px-2 py-1 text-xs font-black ${
                            r.type === "BANNED" ? "bg-[#FFF1F0] text-[#B42318]" :
                            r.type === "ADMIN_FREEZE" ? "bg-[#FFF9E8] text-[#8C612E]" :
                            "bg-[#F2EDE3] text-[#7A6D5E]"
                          }`}>
                            {restrictionTypeLabel(r.type)}
                          </span>
                        </td>
                        <td className="py-2 text-[#2B241E]">{r.reason || "-"}</td>
                        <td className="py-2">
                          {r.isActive ? (
                            <span className="rounded-2xl bg-[#E6F0D8] px-2 py-1 text-xs font-black text-[#355126]">生效中</span>
                          ) : (
                            <span className="rounded-2xl bg-[#F2EDE3] px-2 py-1 text-xs font-black text-[#7A6D5E]">已解除</span>
                          )}
                        </td>
                        <td className="py-2 text-[#7A6D5E]">{formatDateShort(r.startsAt || r.createdAt)}</td>
                        <td className="py-2 text-[#7A6D5E]">{r.expiresAt ? formatDateShort(r.expiresAt) : "永久"}</td>
                        <td className="py-2 text-[#7A6D5E]">{r.clearedAt ? formatDateShort(r.clearedAt) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 最近操作日志 */}
          <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#5B6FFF]">最近操作日志</h2>
            {detail.recentAuditLogs.length === 0 ? (
              <p className="text-sm text-[#7A6D5E]">暂无操作记录</p>
            ) : (
              <div className="grid gap-3">
                {detail.recentAuditLogs.map((log) => (
                  <div key={log.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFF9F0] p-4">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <span className="rounded-2xl bg-[#E6F0D8] px-2 py-1 text-xs font-black text-[#355126]">成功</span>
                      ) : (
                        <span className="rounded-2xl bg-[#FFF1F0] px-2 py-1 text-xs font-black text-[#B42318]">失败</span>
                      )}
                      {log.actorRole && (
                        <span className="rounded-2xl bg-[#F2EDE3] px-2 py-1 text-xs font-black text-[#7A6D5E]">
                          {roleLabel(log.actorRole)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#2B241E]">{actionLabel(log.action)}</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">
                        操作者：{log.actorEmail || "-"} · {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* Confirm Modal */}
      {modalProps && <ConfirmModal {...modalProps} />}
      {logout.Modal}
    </AdminShell>
  );
}
