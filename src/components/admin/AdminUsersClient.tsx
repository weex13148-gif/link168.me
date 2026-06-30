"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmModal, type ConfirmModalDangerLevel, type ConfirmModalProps } from "@/components/admin/ConfirmModal";

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile: { id: string; username: string; displayName: string | null; isPublic: boolean; createdAt: string } | null;
  stats: { sessionCount: number; shortLinkCount: number; aiUsageLogCount: number };
  _restrictions?: { type: string; isActive: boolean; reason: string | null; expiresAt: string | null }[];
};

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type UsersListData = {
  total?: number;
  page?: number;
  totalPages?: number;
  users?: UserRow[];
};

type ActionState = {
  loading: boolean;
  message: string;
  isError: boolean;
};

type ModalState =
  | { type: "none" }
  | { type: "changeRole"; userId: string; email: string; newRole: string }
  | { type: "freeze"; userId: string; email: string }
  | { type: "ban"; userId: string; email: string }
  | { type: "unfreeze"; userId: string; email: string }
  | { type: "unban"; userId: string; email: string }
  | { type: "batchFreeze"; userIds: string[]; count: number }
  | { type: "export"; userIds: string[]; count: number };

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

function pickErrorMessage<T>(payload: AdminEnvelope<T> | null, fallback: string) {
  if (payload && payload.error && typeof payload.error === "object") {
    const err = payload.error as { code?: string; message?: string };
    return err.message || err.code || fallback;
  }
  return fallback;
}

export default function AdminUsersClient({ currentUserEmail }: { currentUserEmail?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<ActionState>({ loading: false, message: "", isError: false });
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalReason, setModalReason] = useState("");
  const [modalExpiresAt, setModalExpiresAt] = useState("");

  const selectableUserIds = users.map((u) => u.id);
  const allSelected = selectableUserIds.length > 0 && selectableUserIds.every((id) => selectedUserIds.has(id));
  const someSelected = selectableUserIds.some((id) => selectedUserIds.has(id)) && !allSelected;

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (keyword.trim()) params.set("q", keyword.trim());
    if (roleFilter) params.set("role", roleFilter);

    try {
      const response = await fetch(`/api/jeepwork/users?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as AdminEnvelope<UsersListData> | null;

      if (!response.ok || payload?.success !== true || !payload?.data) {
        setError(pickErrorMessage(payload, "加载用户列表失败"));
        setLoading(false);
        return;
      }
      const data = payload.data as UsersListData;
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
      setLoading(false);
    } catch {
      setError("网络错误，无法加载用户列表。");
      setLoading(false);
    }
  }, [page, keyword, roleFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUserIds));
    }
  }

  function openBatchFreeze() {
    const ids = selectableUserIds.filter((id) => selectedUserIds.has(id));
    if (ids.length === 0) return;
    setModal({ type: "batchFreeze", userIds: ids, count: ids.length });
    setModalReason("");
  }

  function openExport() {
    const ids = selectableUserIds.filter((id) => selectedUserIds.has(id));
    if (ids.length === 0) return;
    setModal({ type: "export", userIds: ids, count: ids.length });
  }

  async function handleModalAction() {
    setModalLoading(true);
    setAction({ loading: true, message: "", isError: false });

    try {
      if (modal.type === "changeRole") {
        const response = await fetch("/api/jeepwork/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: modal.userId, role: modal.newRole }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "更新角色失败"), isError: true });
        } else {
          setAction({ loading: false, message: payload.data.message || "角色更新成功", isError: false });
          await load();
        }
      } else if (modal.type === "freeze") {
        if (!modalReason.trim()) {
          setAction({ loading: false, message: "请输入冻结原因", isError: true });
          setModalLoading(false);
          return;
        }
        const response = await fetch(`/api/jeepwork/users/${modal.userId}/restrictions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "freeze", reason: modalReason.trim(), expiresAt: modalExpiresAt || undefined }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "冻结失败"), isError: true });
        } else {
          setAction({ loading: false, message: payload.data.message || "用户已冻结", isError: false });
          await load();
        }
      } else if (modal.type === "ban") {
        if (!modalReason.trim()) {
          setAction({ loading: false, message: "请输入封禁原因", isError: true });
          setModalLoading(false);
          return;
        }
        const response = await fetch(`/api/jeepwork/users/${modal.userId}/restrictions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ban", reason: modalReason.trim() }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "封禁失败"), isError: true });
        } else {
          setAction({ loading: false, message: payload.data.message || "用户已封禁", isError: false });
          await load();
        }
      } else if (modal.type === "unfreeze") {
        if (!modalReason.trim()) {
          setAction({ loading: false, message: "请输入解除原因", isError: true });
          setModalLoading(false);
          return;
        }
        const response = await fetch(`/api/jeepwork/users/${modal.userId}/restrictions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unfreeze", reason: modalReason.trim() }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "解除冻结失败"), isError: true });
        } else {
          setAction({ loading: false, message: payload.data.message || "已解除冻结", isError: false });
          await load();
        }
      } else if (modal.type === "unban") {
        if (!modalReason.trim()) {
          setAction({ loading: false, message: "请输入解除原因", isError: true });
          setModalLoading(false);
          return;
        }
        const response = await fetch(`/api/jeepwork/users/${modal.userId}/restrictions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unban", reason: modalReason.trim() }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "解除封禁失败"), isError: true });
        } else {
          setAction({ loading: false, message: payload.data.message || "已解除封禁", isError: false });
          await load();
        }
      } else if (modal.type === "batchFreeze") {
        if (!modalReason.trim()) {
          setAction({ loading: false, message: "请输入批量冻结原因", isError: true });
          setModalLoading(false);
          return;
        }
        const response = await fetch("/api/jeepwork/users/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch_freeze", reason: modalReason.trim(), userIds: modal.userIds }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ message?: string; frozenCount?: number; skippedCount?: number }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "批量冻结失败"), isError: true });
        } else {
          const d = payload.data;
          setAction({ loading: false, message: d.message || `已冻结 ${d.frozenCount} 名用户`, isError: false });
          setSelectedUserIds(new Set());
          await load();
        }
      } else if (modal.type === "export") {
        const response = await fetch("/api/jeepwork/users/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "export", userIds: modal.userIds }),
        });
        const payload = (await response.json()) as AdminEnvelope<{ csv?: string; filename?: string }> | null;
        if (!response.ok || payload?.success !== true || !payload?.data) {
          setAction({ loading: false, message: pickErrorMessage(payload, "导出失败"), isError: true });
        } else {
          const csv = payload.data?.csv || "";
          const filename = payload.data?.filename || `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setAction({ loading: false, message: `已导出 ${modal.count} 名用户`, isError: false });
          setSelectedUserIds(new Set());
        }
      }
    } catch {
      setAction({ loading: false, message: "网络错误", isError: true });
    }

    setModalLoading(false);
    setModalReason("");
    setModalExpiresAt("");
    setModal({ type: "none" });
  }

  function isFrozen(user: UserRow) {
    return user._restrictions?.some((r) => r.type === "ADMIN_FREEZE" && r.isActive);
  }

  function isBanned(user: UserRow) {
    return user._restrictions?.some((r) => r.type === "BANNED" && r.isActive);
  }

  function openChangeRole(user: UserRow, newRole: string) {
    setModal({ type: "changeRole", userId: user.id, email: user.email, newRole });
  }

  function openFreeze(user: UserRow) {
    setModal({ type: "freeze", userId: user.id, email: user.email });
    setModalReason("");
    setModalExpiresAt("");
  }

  function openBan(user: UserRow) {
    setModal({ type: "ban", userId: user.id, email: user.email });
    setModalReason("");
  }

  function openUnfreeze(user: UserRow) {
    setModal({ type: "unfreeze", userId: user.id, email: user.email });
    setModalReason("");
  }

  function openUnban(user: UserRow) {
    setModal({ type: "unban", userId: user.id, email: user.email });
    setModalReason("");
  }

  const getModalConfig = (): ConfirmModalProps | null => {
    switch (modal.type) {
      case "changeRole":
        return {
          isOpen: true,
          dangerLevel: "warn",
          title: "确认修改角色",
          description: `确定要将用户 ${modal.email} 的角色修改为 ${roleLabel(modal.newRole)} 吗？`,
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "freeze":
        return {
          isOpen: true,
          dangerLevel: "warn",
          title: "确认冻结用户",
          description: `确定要冻结用户 ${modal.email} 吗？冻结期间该用户的主页将无法访问。`,
          extraInfo: "冻结原因（必填）将在审计日志中记录。",
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "ban":
        return {
          isOpen: true,
          dangerLevel: "critical",
          title: "确认永久封禁",
          description: `确定要永久封禁用户 ${modal.email} 吗？此操作会立即禁止该用户登录，其用户名将被永久保留。`,
          extraInfo: "⚠ 永久封禁后，用户名将被永久保留并禁止再注册。解除封禁需要超级管理员确认。",
          inputConfirmMatch: "CONFIRM_BAN",
          inputPlaceholder: "请输入 CONFIRM_BAN 确认",
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "unfreeze":
        return {
          isOpen: true,
          dangerLevel: "warn",
          title: "确认解除冻结",
          description: `确定要解除对用户 ${modal.email} 的冻结状态吗？`,
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "unban":
        return {
          isOpen: true,
          dangerLevel: "danger",
          title: "确认解除封禁",
          description: `确定要解除对用户 ${modal.email} 的封禁吗？`,
          extraInfo: "解除封禁后，该用户将恢复正常登录能力。",
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "batchFreeze":
        return {
          isOpen: true,
          dangerLevel: "warn",
          title: "确认批量冻结",
          description: `确定要冻结选中的 ${modal.count} 名用户吗？冻结期间这些用户的主页将无法访问。`,
          extraInfo: "⚠ 请先在下方表单填写批量冻结原因（必填），再点击\"确认\"执行。跳过已有冻结记录的用户。",
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      case "export":
        return {
          isOpen: true,
          dangerLevel: "warn",
          title: "确认导出用户",
          description: `确定要导出选中的 ${modal.count} 名用户数据吗？`,
          extraInfo: "导出为 CSV 文件，包含邮箱、用户名、注册时间等信息。",
          onConfirm: handleModalAction,
          onClose: () => setModal({ type: "none" }),
          loading: modalLoading,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div className="grid gap-6">
      {action.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            action.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"
          }`}
        >
          {action.loading ? "处理中…" : action.message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">邮箱 / 用户名</span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
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
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
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
          className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </section>

      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FFF9E8] p-4">
          <p className="text-sm font-bold text-[#8C612E]">当前页数量</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{users.length}</p>
        </div>
        <div className="rounded-2xl bg-[#E6F0D8] p-4">
          <p className="text-sm font-bold text-[#355126]">总用户数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{total}</p>
        </div>
        <div className="rounded-2xl bg-[#F2EDE3] p-4">
          <p className="text-sm font-bold text-[#7A6D5E]">当前页 / 总页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">
            {page} / {totalPages}
          </p>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载用户列表…
        </div>
      ) : null}

      {!loading && users.length === 0 && !error ? (
        <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#2B241E]">暂无匹配的用户</p>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">请修改筛选条件或刷新页面后重试。</p>
        </div>
      ) : null}

      {/* 批量操作工具栏 */}
      {!loading && users.length > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#5B6FFF] bg-[#F0F2FF] p-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleSelectAll}
                className="size-5 rounded border-[#5B6FFF] accent-[#5B6FFF]"
              />
              <span className="text-sm font-bold text-[#2B241E]">
                {someSelected || allSelected ? `已选择 ${selectedUserIds.size} / ${users.length}` : "全选"}
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openBatchFreeze}
              disabled={selectedUserIds.size === 0 || action.loading}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-50"
            >
              批量冻结
            </button>
            <button
              type="button"
              onClick={openExport}
              disabled={selectedUserIds.size === 0 || action.loading}
              className="min-h-10 rounded-2xl bg-[#5B6FFF] px-4 text-sm font-black text-white disabled:opacity-50"
            >
              导出 CSV
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        {users.map((userItem) => (
          <article key={userItem.id} className={`rounded-[28px] border bg-white p-5 shadow-sm transition ${selectedUserIds.has(userItem.id) ? "border-[#5B6FFF] ring-2 ring-[#5B6FFF]/20" : "border-[#E8DCCB]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(userItem.id)}
                  onChange={() => toggleUserSelection(userItem.id)}
                  className="mt-1 size-5 rounded border-[#5B6FFF] accent-[#5B6FFF]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">
                      角色：{roleLabel(userItem.role)}
                    </span>
                    {isBanned(userItem) ? (
                      <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">
                        已封禁
                      </span>
                    ) : isFrozen(userItem) ? (
                      <span className="rounded-2xl bg-[#FFF7E8] px-3 py-1 text-xs font-black text-[#8C612E]">
                        已冻结
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 truncate text-lg font-black text-[#2B241E]">{userItem.email}</p>
                  <p className="mt-1 text-sm leading-6 text-[#6B5D4F]">注册时间：{formatDate(userItem.createdAt)}</p>
                  {userItem.profile ? (
                    <p className="mt-1 text-sm leading-6 text-[#6B5D4F]">
                      主页：<span className="font-bold">@{userItem.profile.username}</span>
                      {userItem.profile.displayName ? ` · ${userItem.profile.displayName}` : ""}
                      {userItem.profile.isPublic ? " · 公开" : " · 已隐藏"}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">该用户尚未创建主页。</p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                    会话 {userItem.stats.sessionCount} · 短链 {userItem.stats.shortLinkCount} · AI 日志 {userItem.stats.aiUsageLogCount}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* 第一行：详情 + 角色操作 */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/jeepwork/users/${userItem.id}`}
                    className="min-h-10 rounded-2xl border border-[#5B6FFF] bg-white px-4 text-sm font-bold text-[#5B6FFF] hover:bg-[#5B6FFF] hover:text-white"
                  >
                    查看详情
                  </Link>

                  {currentUserEmail && userItem.email.toLowerCase() === currentUserEmail.toLowerCase() ? (
                    <span className="rounded-2xl bg-[#E6F0D8] px-4 py-2 text-sm font-bold text-[#355126]">
                      当前账号
                    </span>
                  ) : (
                    <>
                      {userItem.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => openChangeRole(userItem, "admin")}
                          disabled={action.loading}
                          className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-3 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                        >
                          设为管理员
                        </button>
                      )}
                      {userItem.role !== "super_admin" && (
                        <button
                          type="button"
                          onClick={() => openChangeRole(userItem, "super_admin")}
                          disabled={action.loading}
                          className="min-h-10 rounded-2xl bg-[#8C612E] px-3 text-sm font-black text-white disabled:opacity-60"
                        >
                          升为超级管理员
                        </button>
                      )}
                      {userItem.role !== "user" && (
                        <button
                          type="button"
                          onClick={() => openChangeRole(userItem, "user")}
                          disabled={action.loading}
                          className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-3 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                        >
                          恢复普通用户
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* 第二行：冻结/封禁/解冻操作 */}
                <div className="flex flex-wrap items-center gap-2">
                  {isBanned(userItem) ? (
                    <button
                      type="button"
                      onClick={() => openUnban(userItem)}
                      disabled={action.loading}
                      className="min-h-10 rounded-2xl bg-[#8C612E] px-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      解除封禁
                    </button>
                  ) : isFrozen(userItem) ? (
                    <button
                      type="button"
                      onClick={() => openUnfreeze(userItem)}
                      disabled={action.loading}
                      className="min-h-10 rounded-2xl bg-[#6F8F4E] px-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      解除冻结
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openFreeze(userItem)}
                        disabled={action.loading}
                        className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-3 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                      >
                        冻结用户
                      </button>
                      <button
                        type="button"
                        onClick={() => openBan(userItem)}
                        disabled={action.loading}
                        className="min-h-10 rounded-2xl bg-[#B42318] px-3 text-sm font-black text-white disabled:opacity-60"
                      >
                        永久封禁
                      </button>
                    </>
                  )}
                </div>

                <span className="rounded-2xl bg-[#F2F0EC] px-3 py-1 text-xs text-[#7A6D5E]">
                  重置密码已停用
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* 冻结/封禁原因输入区域（显示在操作区下方） */}
      {(modal.type === "freeze" || modal.type === "ban" || modal.type === "unfreeze" || modal.type === "unban" || modal.type === "batchFreeze") && (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#2B241E]">
            {modal.type === "freeze" ? "冻结" : modal.type === "ban" ? "封禁" : modal.type === "unfreeze" ? "解除冻结" : modal.type === "unban" ? "解除封禁" : "批量冻结"} — 填写原因
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder="输入原因（必填，将记录到审计日志）"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
            />
            {modal.type === "freeze" && (
              <input
                type="datetime-local"
                value={modalExpiresAt}
                onChange={(e) => setModalExpiresAt(e.target.value)}
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
              />
            )}
            <button
              type="button"
              onClick={() => void handleModalAction()}
              disabled={modalLoading || !modalReason.trim()}
              className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-50"
            >
              {modalLoading ? "处理中…" : "确认"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#7A6D5E]">
            {modal.type === "freeze" && "留空过期时间则为永久冻结，需管理员手动解除。"}
            {modal.type === "ban" && "封禁为永久操作，需输入 CONFIRM_BAN 确认。"}
          </p>
        </div>
      )}

      {!loading && totalPages > 1 ? (
        <section className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || action.loading}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages || action.loading}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            下一页
          </button>
        </section>
      ) : null}

      {/* Confirm Modal for role changes and unban */}
      {modalConfig && <ConfirmModal {...modalConfig} />}
    </div>
  );
}
