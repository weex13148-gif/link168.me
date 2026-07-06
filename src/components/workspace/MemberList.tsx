"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, MoreHorizontal, X, Check, User, Shield, Users, Eye } from "lucide-react";
import type { WorkspaceMember, WorkspaceRole } from "@/lib/workspace/client-types";
import { ROLE_LABELS, STATUS_LABELS, roleAtLeast, canManageMember, canGrantRole } from "@/lib/workspace/client-types";

interface MemberListProps {
  workspaceId: string;
  workspaceRole: WorkspaceRole | null;
  members: WorkspaceMember[];
  onMemberChange: (member: WorkspaceMember) => void;
  onMemberAdd: (member: WorkspaceMember) => void;
  onMemberRemove: (memberId: string) => void;
}

function getRoleIcon(role: WorkspaceRole) {
  switch (role) {
    case "owner":
      return Shield;
    case "admin":
      return Users;
    case "member":
      return User;
    case "viewer":
      return Eye;
    default:
      return User;
  }
}

function getRoleColor(role: WorkspaceRole) {
  switch (role) {
    case "owner":
      return "bg-[#8C612E] text-white";
    case "admin":
      return "bg-[#6F8F4E] text-white";
    case "member":
      return "bg-[#E8DCCB] text-[#5F5347]";
    case "viewer":
      return "bg-[#F7F1E7] text-[#7A6D5E]";
    default:
      return "bg-[#F7F1E7] text-[#7A6D5E]";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-[#DDE8CD] text-[#3F5F31]";
    case "invited":
      return "bg-[#EAF3FF] text-[#2563EB]";
    case "disabled":
      return "bg-[#F7F1E7] text-[#7A6D5E]";
    case "removed":
      return "bg-[#FEE2E2] text-[#B42318]";
    default:
      return "bg-[#F7F1E7] text-[#7A6D5E]";
  }
}

interface ActionMenuProps {
  member: WorkspaceMember;
  currentRole: WorkspaceRole | null;
  onAction: (action: string, data?: { role?: WorkspaceRole }) => void;
}

function ActionMenu({ member, currentRole, onAction }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = member.role === "owner";
  const canManage = canManageMember(currentRole, member.role);
  const isDisabled = member.status === "disabled";
  const isActive = member.status === "active";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roles: WorkspaceRole[] = ["admin", "member", "viewer"];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-1.5 text-[#7A6D5E] hover:bg-[#F7F1E7] hover:text-[#2B241E]"
        aria-label="更多操作"
      >
        <MoreHorizontal className="size-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[#E8DCCB] bg-white shadow-lg">
          <ul className="py-1">
            {!isOwner && canManage && isActive && (
              <>
                <li>
                  <button
                    onClick={() => {
                      onAction("disable");
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[#B42318] hover:bg-[#FEE2E2]"
                  >
                    禁用
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onAction("remove");
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[#B42318] hover:bg-[#FEE2E2]"
                  >
                    移除
                  </button>
                </li>
                <li className="border-t border-[#F7F1E7]">
                  <p className="px-3 py-2 text-xs font-black text-[#7A6D5E]">修改角色</p>
                  {roles.map((role) => {
                    if (!canGrantRole(currentRole, role)) return null;
                    if (role === member.role) return null;
                    const Icon = getRoleIcon(role);
                    return (
                      <li key={role}>
                        <button
                          onClick={() => {
                            onAction("update_role", { role });
                            setIsOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[#2B241E] hover:bg-[#F7F1E7]"
                        >
                          <Icon className="size-4" />
                          {ROLE_LABELS[role]}
                        </button>
                      </li>
                    );
                  })}
                </li>
              </>
            )}
            {!isOwner && canManage && isDisabled && (
              <li>
                <button
                  onClick={() => {
                    onAction("enable");
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[#6F8F4E] hover:bg-[#DDE8CD]"
                >
                  恢复
                </button>
              </li>
            )}
            {!canManage && !isOwner && (
              <li>
                <p className="px-3 py-2 text-sm text-[#7A6D5E]">无权管理</p>
              </li>
            )}
            {isOwner && (
              <li>
                <p className="px-3 py-2 text-sm text-[#7A6D5E]">无法管理所有者</p>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ isOpen, title, message, confirmText, cancelText = "取消", danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white shadow-xl">
        <div className="p-5">
          <p className="text-sm font-black text-[#2B241E]">{title}</p>
          <p className="mt-2 text-sm text-[#7A6D5E]">{message}</p>
        </div>
        <div className="flex border-t border-[#E8DCCB]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-black text-[#7A6D5E] hover:bg-[#F7F1E7]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-sm font-black ${danger ? "text-[#B42318] hover:bg-[#FEE2E2]" : "text-[#6F8F4E] hover:bg-[#DDE8CD]"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberList({ workspaceId, workspaceRole, members, onMemberChange, onMemberAdd, onMemberRemove }: MemberListProps) {
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "member" as WorkspaceRole });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const canAdd = roleAtLeast(workspaceRole, "admin");
  const isOwner = workspaceRole === "owner";
  const canManage = roleAtLeast(workspaceRole, "admin");

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.email.trim()) {
      setAddError("请输入邮箱地址");
      return;
    }

    setAddLoading(true);
    setAddError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email.trim(),
          role: addForm.role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onMemberAdd(data.member);
        setAddForm({ email: "", role: "member" });
        setAddingMember(false);
      } else {
        if (data.code === "USER_NOT_FOUND") {
          setAddError("未找到该 Link168 用户，请确认邮箱是否正确。");
        } else {
          setAddError(data.error || "添加失败");
        }
      }
    } catch {
      setAddError("网络错误，请稍后重试");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleMemberAction(member: WorkspaceMember, action: string, data?: { role?: WorkspaceRole }) {
    if (action === "remove") {
      setConfirmDialog({
        isOpen: true,
        title: "移除成员",
        message: `确定要移除 ${member.email} 吗？移除后该用户将无法访问此工作空间。`,
        confirmText: "确认移除",
        danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ memberId: member.id, action: "remove" }),
            });
            const result = await res.json();
            if (result.success) {
              onMemberRemove(member.id);
            }
          } catch {}
          setConfirmDialog(null);
        },
      });
      return;
    }

    if (action === "disable") {
      setConfirmDialog({
        isOpen: true,
        title: "禁用成员",
        message: `确定要禁用 ${member.email} 吗？禁用后该用户将暂时无法访问此工作空间。`,
        confirmText: "确认禁用",
        danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ memberId: member.id, action: "disable" }),
            });
            const result = await res.json();
            if (result.success) {
              onMemberChange({ ...member, status: "disabled" });
            }
          } catch {}
          setConfirmDialog(null);
        },
      });
      return;
    }

    if (action === "enable") {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, action: "enable" }),
        });
        const result = await res.json();
        if (result.success) {
          onMemberChange({ ...member, status: "active" });
        }
      } catch {}
      return;
    }

    if (action === "update_role" && data?.role) {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, action: "update_role", role: data.role }),
        });
        const result = await res.json();
        if (result.success) {
          onMemberChange({ ...member, role: data.role });
        }
      } catch {}
      return;
    }
  }

  const activeMembers = members.filter((m) => m.status !== "removed");

  return (
    <div className="space-y-4">
      {addingMember && (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#3F5F31]">添加已有用户</p>
            <button
              onClick={() => {
                setAddingMember(false);
                setAddError(null);
                setAddForm({ email: "", role: "member" });
              }}
              className="rounded-lg p-1 text-[#7A6D5E] hover:bg-[#F7F1E7]"
            >
              <X className="size-5" />
            </button>
          </div>
          <form onSubmit={handleAddMember} className="mt-4 space-y-4">
            <label className="space-y-1.5">
              <span className="block text-xs font-black text-[#7A6D5E]">邮箱地址 *</span>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="请输入已注册的 Link168 邮箱"
                className="w-full rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-black text-[#7A6D5E]">角色</span>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as WorkspaceRole }))}
                className="w-full rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none"
              >
                {workspaceRole === "owner" && (
                  <option value="admin">管理员</option>
                )}
                <option value="member">成员</option>
                <option value="viewer">查看者</option>
              </select>
            </label>
            {addError && (
              <p className="text-xs text-[#B42318]">{addError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddingMember(false);
                  setAddError(null);
                  setAddForm({ email: "", role: "member" });
                }}
                className="flex-1 rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm font-black text-[#7A6D5E] hover:bg-[#F7F1E7]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="flex-1 rounded-xl bg-[#6F8F4E] px-3 py-2.5 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
              >
                {addLoading ? "添加中..." : "添加"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">成员列表</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">管理工作空间成员的权限和状态</p>
          </div>
          {canAdd && !addingMember && (
            <button
              onClick={() => setAddingMember(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6F8F4E] px-4 py-2 text-sm font-black text-white hover:bg-[#5E7F3F]"
            >
              <Plus className="size-4" />
              添加已有用户
            </button>
          )}
        </div>

        {activeMembers.length === 0 ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#F7F1E7]">
              <Users className="size-8 text-[#7A6D5E]" />
            </div>
            <p className="mt-4 text-sm text-[#7A6D5E]">
              {canAdd ? "还没有成员，添加已有用户开始协作。" : "工作空间暂无成员"}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-[#E8DCCB]">
                  <th className="w-1/3 px-4 py-3 text-left text-xs font-black text-[#7A6D5E]">成员</th>
                  <th className="w-1/4 px-4 py-3 text-left text-xs font-black text-[#7A6D5E]">角色</th>
                  <th className="w-1/4 px-4 py-3 text-left text-xs font-black text-[#7A6D5E]">状态</th>
                  <th className="w-1/4 px-4 py-3 text-right text-xs font-black text-[#7A6D5E]">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => {
                  const Icon = getRoleIcon(member.role);
                  const isOwnerMember = member.role === "owner";
                  const canManageThis = canManageMember(workspaceRole, member.role);
                  return (
                    <tr key={member.id} className="border-b border-[#F7F1E7]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-xl bg-[#F7F1E7] text-[#7A6D5E]">
                            <User className="size-5" />
                          </span>
                          <div>
                            <p className="font-black text-[#2B241E]">{member.email}</p>
                            {isOwnerMember && (
                              <p className="text-xs text-[#8C612E]">所有者</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${getRoleColor(member.role)}`}>
                          <Icon className="size-3" />
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${getStatusColor(member.status)}`}>
                          {STATUS_LABELS[member.status as keyof typeof STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(canManage && canManageThis) || (!isOwnerMember && canManage) ? (
                          <ActionMenu
                            member={member}
                            currentRole={workspaceRole}
                            onAction={(action, data) => handleMemberAction(member, action, data)}
                          />
                        ) : (
                          <span className="text-xs text-[#C8B89A]">
                            {isOwnerMember ? "所有者" : "无权限"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="grid gap-3 sm:hidden">
              {activeMembers.map((member) => {
                const Icon = getRoleIcon(member.role);
                const isOwnerMember = member.role === "owner";
                const canManageThis = canManageMember(workspaceRole, member.role);
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl border border-[#E8DCCB] p-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#F7F1E7] text-[#7A6D5E]">
                      <User className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-[#2B241E]">{member.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${getRoleColor(member.role)}`}>
                          <Icon className="size-3" />
                          {ROLE_LABELS[member.role]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${getStatusColor(member.status)}`}>
                          {STATUS_LABELS[member.status as keyof typeof STATUS_LABELS]}
                        </span>
                      </div>
                    </div>
                    {(canManage && canManageThis) || (!isOwnerMember && canManage) ? (
                      <ActionMenu
                        member={member}
                        currentRole={workspaceRole}
                        onAction={(action, data) => handleMemberAction(member, action, data)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
