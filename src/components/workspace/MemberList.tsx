"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Eye, Loader2, Mail, RotateCcw, Shield, Trash2, User, UserPlus, Users } from "lucide-react";
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from "@/lib/workspace/client-types";
import {
  INVITATION_STATUS_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  canGrantRole,
  canManageMember,
  roleAtLeast,
} from "@/lib/workspace/client-types";

interface MemberListProps {
  workspaceId: string;
  workspaceRole: WorkspaceRole | null;
  members: WorkspaceMember[];
  onMemberChange: (member: WorkspaceMember) => void;
  onMemberAdd: (member: WorkspaceMember) => void;
  onMemberRemove: (memberId: string) => void;
}

function getRoleIcon(role: WorkspaceRole) {
  if (role === "owner") return Shield;
  if (role === "admin") return Users;
  if (role === "viewer") return Eye;
  return User;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemberList({
  workspaceId,
  workspaceRole,
  members,
  onMemberChange,
  onMemberRemove,
}: MemberListProps) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "owner">>("member");
  const [submitting, setSubmitting] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canInvite = roleAtLeast(workspaceRole, "admin");
  const inviteRoles = useMemo(
    () => (["admin", "member", "viewer"] as const).filter((item) => canGrantRole(workspaceRole, item)),
    [workspaceRole],
  );

  const loadInvitations = useCallback(async () => {
    if (!canInvite) return;
    setLoadingInvitations(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, { cache: "no-store" });
      const data = await response.json();
      if (data.success) {
        setInvitations(data.invitations ?? []);
      } else {
        setError(data.error || "邀请列表加载失败。");
      }
    } catch {
      setError("邀请列表加载失败，请稍后重试。");
    } finally {
      setLoadingInvitations(false);
    }
  }, [canInvite, workspaceId]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (!inviteRoles.includes(role)) {
      setRole(inviteRoles[0] || "member");
    }
  }, [inviteRoles, role]);

  async function submitInvitation(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!email.trim()) {
      setError("请输入受邀邮箱。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "邀请发送失败。");
        await loadInvitations();
        return;
      }
      setEmail("");
      setRole("member");
      setMessage(data.message || "邀请邮件已发送。");
      await loadInvitations();
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeInvitation(invitation: WorkspaceInvitation) {
    if (!window.confirm(`确定撤销发给 ${invitation.email} 的邀请吗？`)) return;
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id, action: "revoke" }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "撤销邀请失败。");
        return;
      }
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setMessage("邀请已撤销。");
    } catch {
      setError("网络错误，请稍后重试。");
    }
  }

  async function updateMember(
    member: WorkspaceMember,
    action: "disable" | "enable" | "remove" | "update_role",
    nextRole?: WorkspaceRole,
  ) {
    if (action === "remove" && !window.confirm(`确定移除 ${member.email} 吗？`)) return;
    setMemberActionId(member.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, action, role: nextRole }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "成员操作失败。");
        return;
      }
      if (action === "remove") {
        onMemberRemove(member.id);
        setMessage("成员已移除，个人Link168账号不受影响。");
      } else if (action === "disable") {
        onMemberChange({ ...member, status: "disabled" });
        setMessage("成员已禁用。");
      } else if (action === "enable") {
        onMemberChange({ ...member, status: "active" });
        setMessage("成员已恢复。");
      } else if (nextRole) {
        onMemberChange({ ...member, role: nextRole });
        setMessage("成员角色已更新。");
      }
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setMemberActionId(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      {message ? (
        <p className="rounded-2xl bg-[var(--ui-success-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-brand)]">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{error}</p>
      ) : null}

      {canInvite ? (
        <section className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4 shadow-sm sm:rounded-[28px] sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--ui-success-soft)] text-[var(--ui-brand)]">
              <UserPlus className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--ui-brand)]">邮箱邀请</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">
                可邀请未注册邮箱。邀请7天有效，对方登录或注册邀请邮箱并主动接受后才获得企业访问权。
              </p>
            </div>
          </div>

          <form onSubmit={submitInvitation} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
              className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 text-sm text-[var(--ui-ink)] outline-none focus:border-[var(--ui-success)]"
              autoComplete="email"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, "owner">)}
              className="min-h-11 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 text-sm font-bold text-[var(--ui-ink)]"
            >
              {inviteRoles.map((item) => (
                <option key={item} value={item}>{ROLE_LABELS[item]}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting || inviteRoles.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ui-success)] px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              发送邀请
            </button>
          </form>
        </section>
      ) : null}

      <section className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4 shadow-sm sm:rounded-[28px] sm:p-6">
        <p className="text-sm font-black text-[var(--ui-brand)]">正式成员</p>
        <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">
          只有已接受邀请的成员才能访问企业数据。禁用或移除不会注销个人账号。
        </p>

        <div className="mt-4 grid min-w-0 gap-3">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--ui-line)] p-8 text-center text-sm text-[var(--ui-muted)]">
              还没有正式成员。
            </div>
          ) : members.map((member) => {
            const RoleIcon = getRoleIcon(member.role);
            const manageable = canManageMember(workspaceRole, member.role);
            const busy = memberActionId === member.id;
            return (
              <article key={member.id} className="min-w-0 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-page)] p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--ui-surface)] text-[var(--ui-brand)]">
                    <RoleIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--ui-ink)]">{member.email}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-[var(--ui-surface)] px-2 py-1 text-[var(--ui-brand)]">{ROLE_LABELS[member.role]}</span>
                      <span className="rounded-full bg-[var(--ui-surface)] px-2 py-1 text-[var(--ui-muted)]">{STATUS_LABELS[member.status]}</span>
                    </div>
                  </div>

                  {manageable ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {member.status === "active" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateMember(member, "disable")}
                          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--ui-line)] px-3 text-xs font-black text-[var(--ui-warning)]"
                        >
                          <Ban className="size-3.5" />禁用
                        </button>
                      ) : member.status === "disabled" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateMember(member, "enable")}
                          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--ui-line)] px-3 text-xs font-black text-[var(--ui-success)]"
                        >
                          <RotateCcw className="size-3.5" />恢复
                        </button>
                      ) : null}

                      {member.status === "active" ? (
                        <select
                          value={member.role}
                          disabled={busy}
                          onChange={(event) => void updateMember(member, "update_role", event.target.value as WorkspaceRole)}
                          className="min-h-9 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-2 text-xs font-black text-[var(--ui-ink)]"
                        >
                          {(["admin", "member", "viewer"] as WorkspaceRole[])
                            .filter((item) => item === member.role || canGrantRole(workspaceRole, item))
                            .map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
                        </select>
                      ) : null}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateMember(member, "remove")}
                        className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--ui-danger)]/20 px-3 text-xs font-black text-[var(--ui-danger)]"
                      >
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        移除
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {canInvite ? (
        <section className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4 shadow-sm sm:rounded-[28px] sm:p-6">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--ui-brand)]">待处理邀请</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">邀请未接受前不会进入正式成员列表，也没有企业数据访问权。</p>
            </div>
            <button
              type="button"
              onClick={() => void loadInvitations()}
              disabled={loadingInvitations}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--ui-line)] px-3 text-xs font-black text-[var(--ui-muted)]"
            >
              <RotateCcw className={`size-3.5 ${loadingInvitations ? "animate-spin" : ""}`} />刷新
            </button>
          </div>

          <div className="mt-4 grid min-w-0 gap-3">
            {loadingInvitations && invitations.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--ui-muted)]">
                <Loader2 className="size-4 animate-spin" />加载邀请中
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--ui-line)] p-8 text-center text-sm text-[var(--ui-muted)]">
                暂无待处理邀请。
              </div>
            ) : invitations.map((invitation) => (
              <article key={invitation.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-page)] p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--ui-info-soft)] text-[var(--ui-info)]">
                  <Mail className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[var(--ui-ink)]">{invitation.email}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">
                    {ROLE_LABELS[invitation.role]} · {INVITATION_STATUS_LABELS[invitation.status]} · 截止 {formatDate(invitation.expiresAt)}
                  </p>
                  {invitation.status === "delivery_failed" ? (
                    <p className="mt-1 text-xs font-bold text-[var(--ui-danger)]">邮件未成功发送，请重新邀请。</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void revokeInvitation(invitation)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--ui-danger)]/20 px-3 text-xs font-black text-[var(--ui-danger)]"
                >
                  <Trash2 className="size-3.5" />撤销
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
