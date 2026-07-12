import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock3, Mail, ShieldCheck } from "lucide-react";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { getWorkspaceInvitationPreview } from "@/lib/workspace/invitations";
import { ROLE_LABELS } from "@/lib/workspace/client-types";
import AcceptWorkspaceInvitationButton from "@/components/workspace/AcceptWorkspaceInvitationButton";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function WorkspaceInvitationPage({ params }: PageProps) {
  const { token } = await params;
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/workspace-invitations/${token}`)}`);
  }

  const invitation = await getWorkspaceInvitationPreview(token);
  const currentEmail = user.email.trim().toLowerCase();

  if (!invitation) {
    return (
      <main className="min-h-screen bg-[var(--ui-page)] px-4 py-12">
        <section className="mx-auto max-w-xl rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-black text-[var(--ui-ink)]">邀请不存在</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ui-muted)]">邀请链接可能填写错误，或对应记录已被删除。</p>
          <Link href="/console/account/enterprise" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ui-ink)] px-5 text-sm font-black text-white">
            返回企业工作空间
          </Link>
        </section>
      </main>
    );
  }

  const isPending = invitation.status === "pending";
  const isExpired = invitation.expiresAt <= new Date().toISOString();
  const matchesEmail = invitation.email === currentEmail;
  const canAccept = isPending && !isExpired && invitation.workspace.isActive && matchesEmail;

  return (
    <main className="min-h-screen bg-[var(--ui-page)] px-4 py-12">
      <section className="mx-auto max-w-xl rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ui-success-soft)] text-[var(--ui-brand)]">
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-brand)]">Link168 企业邀请</p>
            <h1 className="mt-1 break-words text-2xl font-black text-[var(--ui-ink)]">加入 {invitation.workspace.name}</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--ui-page)] p-4">
            <Mail className="size-5 shrink-0 text-[var(--ui-brand)]" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--ui-muted)]">受邀邮箱</p>
              <p className="truncate text-sm font-black text-[var(--ui-ink)]">{invitation.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--ui-page)] p-4">
            <ShieldCheck className="size-5 shrink-0 text-[var(--ui-brand)]" />
            <div>
              <p className="text-xs font-bold text-[var(--ui-muted)]">企业角色</p>
              <p className="text-sm font-black text-[var(--ui-ink)]">{ROLE_LABELS[invitation.role as "admin" | "member" | "viewer"]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--ui-page)] p-4">
            <Clock3 className="size-5 shrink-0 text-[var(--ui-brand)]" />
            <div>
              <p className="text-xs font-bold text-[var(--ui-muted)]">有效期</p>
              <p className="text-sm font-black text-[var(--ui-ink)]">{new Date(invitation.expiresAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        </div>

        {!matchesEmail ? (
          <p className="mt-5 rounded-2xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--ui-danger)]">
            当前登录邮箱是 {user.email}。请退出后使用受邀邮箱 {invitation.email} 登录或注册。
          </p>
        ) : null}
        {!isPending ? (
          <p className="mt-5 rounded-2xl bg-[var(--ui-surface-muted)] px-4 py-3 text-sm font-bold text-[var(--ui-muted)]">该邀请已使用、已撤销或当前不可用。</p>
        ) : null}
        {isExpired ? (
          <p className="mt-5 rounded-2xl bg-[var(--ui-warning-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-warning)]">邀请已过期，请联系企业管理员重新发送。</p>
        ) : null}
        {!invitation.workspace.isActive ? (
          <p className="mt-5 rounded-2xl bg-[var(--ui-warning-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-warning)]">该企业工作空间当前已停用。</p>
        ) : null}

        <AcceptWorkspaceInvitationButton token={token} disabled={!canAccept} />
        <p className="mt-4 text-center text-xs leading-5 text-[var(--ui-muted)]">接受前不会获得企业数据访问权；接受后个人Link168账号仍保持独立。</p>
      </section>
    </main>
  );
}
