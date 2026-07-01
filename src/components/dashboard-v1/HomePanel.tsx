"use client";

import Link from "next/link";
import { Check, ChevronRight, Circle, Copy, ExternalLink, Link2, Palette, QrCode, Share2, UserRound } from "lucide-react";
import type { DashboardLink, DashboardProfile, DashboardTab, DashboardUser } from "@/components/dashboard-v1/types";
import { isTemporaryUsername } from "@/components/dashboard-v1/types";

export function HomePanel({
  user,
  profile,
  links,
  publicUrl,
  onNavigate,
  onCopy,
  onShare,
  onQr,
}: {
  user: DashboardUser;
  profile: DashboardProfile | null;
  links: DashboardLink[];
  publicUrl: string;
  onNavigate: (tab: DashboardTab) => void;
  onCopy: () => void;
  onShare: () => void;
  onQr: () => void;
}) {
  const activeLinks = links.filter((link) => link.is_active);
  const checklist = [
    { label: "设置公开主页地址", done: Boolean(profile && !isTemporaryUsername(profile.username)), tab: "profile" as const },
    { label: "上传头像并填写名片资料", done: Boolean(profile?.avatar_url && profile.display_name), tab: "profile" as const },
    { label: "至少添加一个公开链接", done: activeLinks.length > 0, tab: "links" as const },
    { label: "完成邮箱验证", done: user.emailVerified, tab: "account" as const },
  ];
  const completeCount = checklist.filter((item) => item.done).length;
  const recentLinks = links.slice(0, 4);

  return (
    <div className="grid gap-5">
      <section className="ui-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="ui-eyebrow">我的公开主页</p>
            {publicUrl ? (
              <>
                <h1 className="mt-2 break-all text-2xl ui-title sm:text-3xl">{publicUrl}</h1>
                <p className="mt-2 text-sm ui-muted">主页已生成。资料和链接保存后，访客会看到最新公开内容。</p>
              </>
            ) : (
              <>
                <h1 className="mt-2 text-2xl ui-title sm:text-3xl">还差一步即可公开</h1>
                <p className="mt-2 text-sm ui-muted">先设置一个容易记住的主页地址，例如 link168.me/abao。</p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {publicUrl ? (
              <>
                <button type="button" onClick={onCopy} className="ui-button-secondary"><Copy className="size-4" />复制地址</button>
                <Link href={publicUrl} target="_blank" className="ui-button-secondary"><ExternalLink className="size-4" />打开主页</Link>
                <button type="button" onClick={onShare} className="ui-button-primary"><Share2 className="size-4" />分享</button>
              </>
            ) : (
              <button type="button" onClick={() => onNavigate("profile")} className="ui-button-primary"><UserRound className="size-4" />设置公开地址</button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ui-eyebrow">完成进度</p>
              <h2 className="mt-1 text-xl ui-title">让主页具备分享条件</h2>
            </div>
            <span className="rounded-full bg-[var(--ui-brand-soft)] px-3 py-1 text-sm font-black text-[var(--ui-brand-hover)]">{completeCount}/4</span>
          </div>

          <div className="mt-5 grid gap-2">
            {checklist.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate(item.tab)} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-4 text-left transition hover:border-[color:var(--ui-brand)]/35">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${item.done ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-faint)]"}`}>
                  {item.done ? <Check className="size-4" /> : <Circle className="size-3" />}
                </span>
                <span className={`flex-1 text-sm font-black ${item.done ? "text-[var(--ui-muted)] line-through" : "text-[var(--ui-ink)]"}`}>{item.label}</span>
                <ChevronRight className="size-4 text-[var(--ui-faint)]" />
              </button>
            ))}
          </div>
        </section>

        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ui-eyebrow">最近链接</p>
              <h2 className="mt-1 text-xl ui-title">当前公开内容</h2>
            </div>
            <button type="button" onClick={() => onNavigate("links")} className="text-sm font-black text-[var(--ui-brand-hover)]">管理全部</button>
          </div>

          <div className="mt-5 grid gap-2">
            {recentLinks.length ? recentLinks.map((link) => (
              <div key={link.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"><Link2 className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{link.title}</p>
                  <p className="truncate text-xs text-[var(--ui-muted)]">{link.url}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${link.is_active ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{link.is_active ? "公开" : "隐藏"}</span>
              </div>
            )) : (
              <button type="button" onClick={() => onNavigate("links")} className="grid min-h-36 place-items-center rounded-xl border border-dashed border-[var(--ui-line)] bg-white text-center">
                <span><Link2 className="mx-auto size-6 text-[var(--ui-brand)]" /><strong className="mt-2 block text-sm">添加第一个链接</strong><span className="mt-1 block text-xs text-[var(--ui-muted)]">把网站、社交媒体或服务入口放到主页</span></span>
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => onNavigate("profile")} className="ui-surface flex min-h-20 items-center gap-3 p-4 text-left transition hover:-translate-y-0.5">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"><UserRound className="size-5" /></span>
          <span><strong className="block text-sm">编辑名片资料</strong><span className="mt-1 block text-xs ui-muted">头像、名称和简介</span></span>
        </button>
        <button type="button" onClick={() => onNavigate("appearance")} className="ui-surface flex min-h-20 items-center gap-3 p-4 text-left transition hover:-translate-y-0.5">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[#8C612E]"><Palette className="size-5" /></span>
          <span><strong className="block text-sm">选择主题</strong><span className="mt-1 block text-xs ui-muted">调整主页展示风格</span></span>
        </button>
        <button type="button" onClick={onQr} disabled={!publicUrl} className="ui-surface flex min-h-20 items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-info-soft)] text-[var(--ui-info)]"><QrCode className="size-5" /></span>
          <span><strong className="block text-sm">主页二维码</strong><span className="mt-1 block text-xs ui-muted">用于名片、海报和线下分享</span></span>
        </button>
      </section>
    </div>
  );
}
