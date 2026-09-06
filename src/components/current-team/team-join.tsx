"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { buttonClass, cardClass, Feedback, LoadState, roleLabel, secondaryClass, teamRequest, useTeamData } from "./shared";

type InvitePreview = { workspaceId: string; workspaceName: string; role: string; status: string; expiresAt: string };

export function TeamJoin({ token, loggedIn }: { token: string; loggedIn: boolean }) {
  if (!token) return <JoinShell><h1 className="text-[28px] font-bold">邀请链接不完整</h1><p className="mt-4 leading-7 text-[#5E5A54]">请使用团队所有者或管理员分享的完整链接。</p><Link href="/console/team" className={`${secondaryClass} mt-5`}>查看我的团队</Link></JoinShell>;
  return <InvitationContent token={token} loggedIn={loggedIn} />;
}

function InvitationContent({ token, loggedIn }: { token: string; loggedIn: boolean }) {
  const state = useTeamData<{ invitation: InvitePreview }>(`/api/current/teams/invitations?token=${encodeURIComponent(token)}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<string | null>(null);
  const pending = useRef(false);
  const invitation = state.data?.invitation;
  const returnTo = `/invite/team?token=${encodeURIComponent(token)}`;
  const reason: Record<string, string> = { used: "这份邀请已经使用，无法再次接受。若你已加入，可直接前往我的团队。", revoked: "这份邀请已被撤销，请联系团队所有者或管理员获取新邀请。", expired: "这份邀请已过期，请联系团队所有者或管理员获取新邀请。", unavailable: "团队暂时不可用，无法接受邀请。", role_changed: "邀请者的管理权限已发生变化，请联系团队所有者获取新邀请。" };

  async function accept() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await teamRequest<{ team: { workspaceId: string } }>("/api/current/teams/invitations", "POST", { token });
      setJoined(result.team.workspaceId);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "加入失败，请重试。";
      if (invitation && (message === "你已经是此团队成员，无需再次加入。" || message === "团队所有者无需接受本团队邀请。")) {
        setJoined(invitation.workspaceId);
      } else {
        setError(message);
      }
    }
    finally { pending.current = false; setBusy(false); }
  }

  return <JoinShell>{joined ? <><h1 className="text-[28px] font-bold">已加入团队</h1><Feedback message="团队已确认你的加入，可以开始完善自己的成员主页。" /><Link className={buttonClass} href={`/console/team/${joined}`}>进入团队</Link></> : <><h1 className="text-[28px] font-bold">团队邀请</h1><div className="mt-5"><LoadState {...state} /></div>{!state.loading && !state.error && invitation && <><h2 className="mt-5 break-words text-2xl font-bold">{invitation.workspaceName}</h2><p className="mt-3 leading-7 text-[#5E5A54]">邀请你以{roleLabel(invitation.role)}身份加入。</p><p className="mt-2 text-sm leading-6 text-[#5E5A54]">邀请到期时间：{new Date(invitation.expiresAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}</p><Feedback error={error} />{invitation.status === "pending" ? <div className="mt-6">{loggedIn ? <><p className="mb-4 text-sm leading-6 text-[#5E5A54]">确认后将使用你当前登录的账号加入。加入团队不会改变你的个人主页或个人套餐。</p><button type="button" onClick={accept} disabled={busy} className={buttonClass}>{busy ? "正在加入…" : "确认加入团队"}</button></> : <><p className="mb-4 text-sm leading-6 text-[#5E5A54]">请先登录或注册，之后返回这里确认加入。</p><div className="flex flex-col gap-3 sm:flex-row"><Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={buttonClass}>登录并加入</Link><Link href={`/register?next=${encodeURIComponent(returnTo)}`} className={secondaryClass}>注册并加入</Link></div></>}</div> : <><p role="status" className="mt-5 rounded-[10px] bg-[#FFF0D4] p-4 text-sm leading-6 text-[#B8750B]">{reason[invitation.status] ?? "这份邀请当前无法接受，请联系团队所有者或管理员。"}</p><Link href="/console/team" className={`${secondaryClass} mt-4`}>查看我的团队</Link></>}</>}</>}</JoinShell>;
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh items-start justify-center bg-[#F7F2E9] px-4 py-12 text-[#151515] sm:py-20"><section className={`${cardClass} w-full max-w-[600px]`}><Link href="/" className="mb-6 inline-flex min-h-11 items-center font-bold text-[#0B4DD8] underline underline-offset-4">Link168</Link>{children}</section></main>;
}
