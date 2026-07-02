import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Pencil, Plus, Palette, Share2, ExternalLink } from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { db } from "@/lib/db";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function WorkbenchCardPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const subscription = await db.membershipSubscription.findUnique({ where: { userId: user.id }, select: { planCode: true, status: true } });
  const isPaid = subscription?.status === "active" && subscription.planCode !== "free";
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  if (!isPaid && !isAdmin) redirect("/dashboard");

  const profile = await db.profile.findUnique({ where: { userId: user.id }, include: { links: { orderBy: { position: "asc" } } } });
  if (!profile) redirect("/dashboard");

  const displayName = profile.displayName || profile.username;
  const activeLinks = profile.links.filter((l) => l.isActive);
  const publicUrl = `/${profile.username}`;
  const fallbackAvatar = <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-black text-[#2B241E] shadow-sm">{displayName.charAt(0).toUpperCase()}</span>;

  return (
    <WorkbenchShell eyebrow="AI 名片" title="我的 AI 名片" subtitle="编辑展示资料，AI 会基于你的名片信息向客户做自我介绍与服务推荐。">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#3F5F31]">名片基础信息</p><p className="mt-1 text-xs text-[#7A6D5E]">访客看到的基础资料会同步用于 AI 回答。</p></div><Link href="/dashboard" className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#DDE8CD] px-4 text-xs font-black text-[#3F5F31]"><Pencil aria-hidden className="size-4" /> 在 Dashboard 编辑</Link></div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[{ label: "显示名称", value: displayName }, { label: "用户名", value: `@${profile.username}` }, { label: "公开地址", value: publicUrl }, { label: "简介", value: profile.bio || "暂无简介" }].map((item) => <div key={item.label} className="rounded-2xl bg-[#F7F1E7] px-4 py-3"><dt className="text-xs font-semibold text-[#7A6D5E]">{item.label}</dt><dd className="mt-1 break-all text-sm font-black text-[#2B241E]">{item.value}</dd></div>)}</dl>
          </div>

          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-[#3F5F31]">名片链接与组件</p><p className="mt-1 text-xs text-[#7A6D5E]">共 {profile.links.length} 个链接，{activeLinks.length} 个已启用。</p></div><Link href="/dashboard" className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white"><Plus aria-hidden className="size-4" /> 管理链接</Link></div>
            {profile.links.length > 0 ? <ul className="mt-4 grid gap-3">{profile.links.slice(0, 6).map((link, index) => <li key={link.id} className="flex flex-wrap items-center gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-4"><span className="grid size-9 place-items-center rounded-2xl bg-white text-xs font-black text-[#7A6D5E] ring-1 ring-[#E8DCCB]">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#2B241E]">{link.title}</p><p className="truncate text-xs text-[#7A6D5E]">{link.url}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${link.isActive ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E] ring-1 ring-[#E8DCCB]"}`}>{link.isActive ? "已启用" : "已隐藏"}</span></li>)}</ul> : <div className="mt-6 text-center"><p className="text-sm text-[#7A6D5E]">还没有链接，先去 Dashboard 添加一个。</p><Link href="/dashboard" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white"><Plus aria-hidden className="size-4" /> 添加第一个链接</Link></div>}
          </div>
        </div>

        <div className="grid gap-4 content-start">
          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><Sparkles aria-hidden className="size-4 text-[#6F8F4E]" /><p className="text-sm font-black text-[#3F5F31]">实时名片预览</p></div>
            <div className="mt-4 rounded-3xl bg-gradient-to-br from-[#DDE8CD] via-[#F7F1E7] to-[#EAF3FF] p-5">
              <div className="flex items-center gap-3">{profile.avatarUrl ? <object data={profile.avatarUrl} type="image/png" className="size-14 shrink-0 overflow-hidden rounded-2xl object-cover shadow-sm">{fallbackAvatar}</object> : fallbackAvatar}<div><p className="text-base font-black text-[#2B241E]">{displayName}</p><p className="text-xs text-[#7A6D5E]">@{profile.username}</p></div></div>
              {profile.bio && <p className="mt-3 text-xs text-[#3F5F31]">{profile.bio}</p>}
              {activeLinks.length > 0 && <div className="mt-4 grid gap-2">{activeLinks.slice(0, 3).map((link) => <div key={link.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-[#E8DCCB]"><div className="min-w-0"><p className="truncate text-sm font-black text-[#2B241E]">{link.title}</p><p className="truncate text-xs text-[#7A6D5E]">{link.url}</p></div><ExternalLink aria-hidden className="size-4 shrink-0 text-[#6F8F4E]" /></div>)}</div>}
              <div className="mt-4 flex flex-wrap items-center gap-2"><Link href={publicUrl} target="_blank" className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2B241E] px-4 text-xs font-black text-white"><Share2 aria-hidden className="size-4" /> 查看公开页</Link><Link href="/dashboard" className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#3F5F31] ring-1 ring-[#E8DCCB]"><Palette aria-hidden className="size-4" /> 编辑主题</Link></div>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"><p className="text-sm font-black text-[#3F5F31]">AI 名片能力</p><p className="mt-1 text-xs text-[#7A6D5E]">AI 客服会基于你的名片和产品资料回答访客咨询。</p><ul className="mt-3 grid gap-2 text-sm">{[{ label: "AI 自我介绍", done: !!profile.bio }, { label: "产品推荐", done: true }, { label: "线索收集", done: true }].map((item) => <li key={item.label} className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3"><span className="font-bold text-[#2B241E]">{item.label}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${item.done ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#FFE6E2] text-[#B42318]"}`}>{item.done ? "已启用" : "待配置"}</span></li>)}</ul></div>
        </div>
      </section>
    </WorkbenchShell>
  );
}
