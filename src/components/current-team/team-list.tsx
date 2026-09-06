"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonClass, cardClass, Feedback, inputClass, LoadState, roleLabel, TeamShell, teamRequest, useTeamData } from "./shared";

export type TeamSummary = { workspaceId: string; name: string; slug: string | null; role: string; ownerIdentityId: string; isActive: boolean; teamPageId: string | null };

export function TeamList() {
  const state = useTeamData<{ teams: TeamSummary[] }>("/api/current/teams");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const createKey = useRef<string | null>(null);
  const router = useRouter();
  const owned = state.data?.teams.filter((team) => team.role === "owner") ?? [];
  const joined = state.data?.teams.filter((team) => team.role !== "owner") ?? [];

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    createKey.current ??= crypto.randomUUID();
    try {
      const result = await teamRequest<{ team: { workspaceId: string } }>("/api/current/teams", "POST", { name: name.trim(), slug: slug.trim(), idempotencyKey: createKey.current });
      router.push(`/console/team/${result.team.workspaceId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败，请重试。"); }
    finally { pending.current = false; setBusy(false); }
  }

  return <TeamShell title="我的团队" description="在这里管理团队主页、成员和邀请，也可以切换到你加入的团队。"><LoadState {...state} />{!state.loading && !state.error && state.data && <div className="space-y-6">
    {owned.length > 0 ? <TeamGroup title="我创建的团队" teams={owned} /> : <section className={cardClass}><h2 className="text-xl font-bold">创建我的团队</h2><p className="mt-2 text-sm leading-6 text-[#5E5A54]">建立统一的业务主页，邀请伙伴加入。每个账号最多创建一个自己的团队；你仍可加入其他团队。团队套餐与个人主页套餐分别管理。</p><form onSubmit={create} className="mt-5 max-w-[560px] space-y-5"><label className="block text-sm font-bold">团队名称<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} autoComplete="organization" /></label><label className="block text-sm font-bold">团队公开地址标识<input required minLength={3} maxLength={30} value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClass} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="team-slug-help" /></label><p id="team-slug-help" className="text-sm leading-6 text-[#5E5A54]">使用 3–30 位英文字母、数字或连字符，首尾不能是连字符，例如 studio-design。提交时会检查地址是否可用。</p><Feedback error={error} /><button disabled={busy} className={buttonClass}>{busy ? "正在创建…" : "创建团队"}</button></form></section>}
    <TeamGroup title="我加入的团队" teams={joined} />
  </div>}</TeamShell>;
}

function TeamGroup({ title, teams }: { title: string; teams: TeamSummary[] }) {
  return <section aria-label={title}><h2 className="mb-3 text-xl font-bold">{title}</h2>{teams.length === 0 ? <div className={cardClass}><p className="text-sm leading-6 text-[#5E5A54]">你还没有加入其他团队。收到团队邀请链接后，打开链接即可查看并接受邀请。</p></div> : <div className="grid gap-4 sm:grid-cols-2">{teams.map((team) => <article key={team.workspaceId} className={cardClass}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#F7E7C4] px-3 py-1 text-xs font-bold">{roleLabel(team.role)}</span><span className="text-sm text-[#5E5A54]">{team.isActive ? "正常" : "已停用"}</span></div><h3 className="mt-4 break-words text-xl font-bold">{team.name}</h3><Link className="mt-4 inline-flex min-h-12 items-center text-sm font-bold text-[#0B4DD8] underline underline-offset-4" href={`/console/team/${team.workspaceId}`}>查看团队</Link></article>)}</div>}</section>;
}
