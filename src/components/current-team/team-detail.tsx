"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { TeamSummary } from "./team-list";
import { buttonClass, cardClass, Feedback, inputClass, LoadState, roleLabel, secondaryClass, statusLabel, TeamShell, teamRequest, useTeamData } from "./shared";

type Member = { identityId: string; displayName: string; username: string; role: string; status: string; pageId: string | null; activeLeadCount?: number };
type Invitation = { id: string; role: string; status: string; expiresAt: string };
type TeamDetailData = TeamSummary & { actorIdentityId: string; members: Member[]; seatLimit: number; activeMemberCount: number; invitations: Invitation[] };
type CreatedInvitation = { id: string; token: string; role: string; expiresAt: string; delivery: string };

export function TeamDetail({ teamId }: { teamId: string }) {
  const path = `/api/current/teams/${encodeURIComponent(teamId)}`;
  const state = useTeamData<{ team: TeamDetailData }>(path);
  const [role, setRole] = useState("member");
  const [invitation, setInvitation] = useState<CreatedInvitation | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [successor, setSuccessor] = useState("");
  const pending = useRef(false);
  const router = useRouter();
  const team = state.data?.team;
  const canManage = team?.isActive && (team.role === "owner" || team.role === "admin");

  async function action(key: string, callback: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(key); setError(""); setMessage("");
    try { await callback(); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作未完成，请重试。"); }
    finally { pending.current = false; setBusy(""); }
  }

  function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void action("invite", async () => {
      const result = await teamRequest<{ invitation: CreatedInvitation }>(`${path}/members`, "POST", { action: "invite", role });
      setInvitation(result.invitation);
      setInviteUrl(`${window.location.origin}/invite/team?token=${encodeURIComponent(result.invitation.token)}`);
      setMessage("邀请链接已创建。请复制后分享给受邀人，可通过微信发送。每个链接只能使用一次。");
      state.reload();
    });
  }

  function openMemberPage(member: Member) {
    void action(`page-${member.identityId}`, async () => {
      const result = await teamRequest<{ page: { pageId: string } }>(`${path}/member-pages`, "POST", { memberIdentityId: member.identityId });
      router.push(`/console/pages/${result.page.pageId}`);
    });
  }

  async function copyInvitation() {
    try { await navigator.clipboard.writeText(inviteUrl); setMessage("邀请链接已复制，可粘贴到微信或其他聊天中分享。"); }
    catch { setError("无法自动复制。请选中下方邀请链接，手动复制后分享。"); }
  }

  return <TeamShell title={team?.name ?? "团队详情"} description="管理团队成员与主页，邀请伙伴一起展示专业服务。"><Link href="/console/team" className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-[#0B4DD8] underline underline-offset-4">查看所有团队</Link><Feedback error={error} message={message} />
    {invitation && <section className={`${cardClass} mb-5`} aria-label="新建邀请链接"><h2 className="text-lg font-bold">邀请链接已就绪</h2><p className="mt-2 text-sm leading-6 text-[#5E5A54]">邀请身份：{roleLabel(invitation.role)} · 有效期至 {formatDate(invitation.expiresAt)}。仅限一人使用，请只分享给你信任的人。</p><label className="mt-4 block text-sm font-bold">邀请链接<input value={inviteUrl} readOnly onFocus={(event) => event.target.select()} className={inputClass} /></label><button type="button" onClick={copyInvitation} className={`${secondaryClass} mt-3`}>复制链接 / 微信分享</button></section>}
    <LoadState {...state} />
    {!state.loading && !state.error && team && <div className="space-y-6">
      <section className={cardClass}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-[#5E5A54]">你的身份：{roleLabel(team.role)}</p><h2 className="mt-2 text-xl font-bold">成员席位 {team.activeMemberCount} / {team.seatLimit}</h2><p className="mt-2 text-sm leading-6 text-[#5E5A54]">{team.isActive ? "团队套餐与个人主页套餐分别管理。" : "团队已停用，暂时无法邀请成员或编辑页面。"}</p></div>{canManage && team.teamPageId && <Link href={`/console/pages/${team.teamPageId}`} className={buttonClass}>编辑团队主页</Link>}</div>{!canManage && team.role === "member" && <p className="mt-4 text-sm leading-6 text-[#5E5A54]">你可以编辑和发布自己的成员主页。团队品牌、其他成员和邀请由所有者或管理员管理。</p>}</section>
      <section aria-label="团队成员"><h2 className="mb-3 text-xl font-bold">团队成员</h2><div className="space-y-3">{team.members.map((member) => {
        const canEdit = team.isActive && member.status === "active" && (canManage || member.identityId === team.actorIdentityId);
        const canRemove = canManage && member.status === "active" && member.role !== "owner" && member.identityId !== team.actorIdentityId;
        return <article key={member.identityId} className={cardClass}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="break-words font-bold">{member.displayName || member.username || "团队成员"}{member.identityId === team.actorIdentityId ? "（你）" : ""}</h3><p className="mt-2 text-sm text-[#5E5A54]">{roleLabel(member.role)} · {statusLabel(member.status)}</p>{typeof member.activeLeadCount === "number" && canManage && <p className="mt-1 text-sm text-[#5E5A54]">待跟进咨询：{member.activeLeadCount}</p>}</div><div className="flex flex-wrap gap-2">{canEdit && (member.pageId ? <Link href={`/console/pages/${member.pageId}`} className={secondaryClass}>编辑成员主页</Link> : <button type="button" disabled={Boolean(busy)} onClick={() => openMemberPage(member)} className={secondaryClass}>{busy === `page-${member.identityId}` ? "正在准备…" : "创建成员主页"}</button>)}{canRemove && <button type="button" disabled={Boolean(busy)} onClick={() => { setRemoving(member); setSuccessor(team.ownerIdentityId); }} className={`${secondaryClass} text-[#B42318]`}>移除成员</button>}</div></div>
        {removing?.identityId === member.identityId && <form onSubmit={(event) => { event.preventDefault(); void action("remove", async () => { const result = await teamRequest<{ result: { transferredLeadCount: number } }>(`${path}/members`, "PATCH", { action: "remove", memberIdentityId: member.identityId, successorIdentityId: successor }); setRemoving(null); setMessage(`成员已移除，成员主页已停用，历史记录已保留。${typeof result.result.transferredLeadCount === "number" ? `已转交 ${result.result.transferredLeadCount} 条待跟进咨询。` : "待跟进咨询已按团队规则转交。"}`); state.reload(); }); }} className="mt-5 border-t border-[#DDD6CC] pt-5"><h4 className="font-bold">确认移除 {member.displayName || member.username}</h4><p className="mt-2 text-sm leading-6 text-[#5E5A54]">成员主页将立即停用，历史记录会保留。{typeof member.activeLeadCount === "number" ? `该成员有 ${member.activeLeadCount} 条待跟进咨询。` : "该成员的待跟进咨询将交给下方负责人。"}若所选负责人已不可用，咨询会交给团队所有者。</p><label className="mt-4 block text-sm font-bold">接手咨询的成员<select className={inputClass} value={successor} onChange={(event) => setSuccessor(event.target.value)}>{team.members.filter((candidate) => candidate.status === "active" && candidate.identityId !== member.identityId).map((candidate) => <option key={candidate.identityId} value={candidate.identityId}>{candidate.displayName || candidate.username}（{roleLabel(candidate.role)}）</option>)}</select></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={Boolean(busy)} className={secondaryClass} onClick={() => setRemoving(null)}>取消</button><button disabled={Boolean(busy)} className={`${buttonClass} bg-[#B42318] hover:bg-[#912018]`}>{busy === "remove" ? "正在移除…" : "确认移除并转交咨询"}</button></div></form>}
        </article>;
      })}</div></section>
      {canManage && <section className={cardClass}><h2 className="text-xl font-bold">邀请成员</h2><p className="mt-2 text-sm leading-6 text-[#5E5A54]">创建 7 天有效的一次性邀请链接，复制后通过微信等方式分享。受邀人需要先登录或注册，再确认加入。</p>{team.activeMemberCount >= team.seatLimit ? <p className="mt-4 rounded-[10px] bg-[#FFF0D4] p-4 text-sm leading-6 text-[#B8750B]">团队席位已满，暂时无法邀请新成员。请先调整团队套餐或释放席位。</p> : <form onSubmit={invite} className="mt-4 max-w-[560px]"><label className="block text-sm font-bold">邀请身份<select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}><option value="member">成员 — 编辑自己的成员主页</option><option value="admin">管理员 — 管理团队主页和成员</option></select></label><button disabled={Boolean(busy)} className={`${buttonClass} mt-4`}>{busy === "invite" ? "正在创建…" : "创建邀请链接"}</button></form>}
      {team.invitations.length > 0 && <div className="mt-6 border-t border-[#DDD6CC] pt-5"><h3 className="font-bold">邀请记录</h3><ul className="mt-3 space-y-3">{team.invitations.map((item) => <li key={item.id} className="flex flex-col gap-2 rounded-[10px] border border-[#DDD6CC] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-6">{roleLabel(item.role)} · {statusLabel(item.status)}<span className="block text-[#5E5A54]">到期时间：{formatDate(item.expiresAt)}</span></p>{(item.status === "pending" || item.status === "active" || item.status === "valid") && <button type="button" className={secondaryClass} disabled={Boolean(busy)} onClick={() => { void action(`revoke-${item.id}`, async () => { await teamRequest(`${path}/members`, "PATCH", { action: "revoke", invitationId: item.id }); if (invitation?.id === item.id) { setInvitation(null); setInviteUrl(""); } setMessage("邀请已撤销，原链接无法再用于加入团队。"); state.reload(); }); }}>撤销邀请</button>}</li>)}</ul></div>}</section>}
    </div>}
  </TeamShell>;
}

function formatDate(value: string) { return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" }); }
