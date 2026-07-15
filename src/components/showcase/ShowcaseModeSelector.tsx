"use client";

import Link from "next/link";
import { ExternalLink, Gavel, Landmark, TrendingUp } from "lucide-react";
import { AUDIENCE_META, SHOWCASE_PROJECT } from "@/lib/showcase-config";

const MODES = [
  { mode: "judge" as const, icon: Gavel, label: AUDIENCE_META.judge.badge, title: AUDIENCE_META.judge.title, subtitle: AUDIENCE_META.judge.subtitle, color: AUDIENCE_META.judge.themeColor },
  { mode: "investor" as const, icon: TrendingUp, label: AUDIENCE_META.investor.badge, title: AUDIENCE_META.investor.title, subtitle: AUDIENCE_META.investor.subtitle, color: AUDIENCE_META.investor.themeColor },
  { mode: "government" as const, icon: Landmark, label: AUDIENCE_META.government.badge, title: AUDIENCE_META.government.title, subtitle: AUDIENCE_META.government.subtitle, color: AUDIENCE_META.government.themeColor },
];

export default function ShowcaseModeSelector() {
  return (
    <div className="ui-page">
      <header className="border-b border-[var(--ui-line)] bg-[var(--ui-surface)]">
        <div className="ui-container flex min-h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] font-black text-white">L</span>
            <span>
              <strong className="block text-sm">{SHOWCASE_PROJECT.name}</strong>
              <small className="text-[var(--ui-muted)]">比赛展示与外部尽调</small>
            </span>
          </Link>
          <Link href="/" target="_blank" className="ui-button-secondary text-xs">
            返回首页 <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="grid min-h-[calc(100dvh-64px-1px)] place-items-center px-4 py-10">
        <div className="w-full max-w-4xl">
          <div className="text-center">
            <p className="ui-eyebrow">{SHOWCASE_PROJECT.name} 外部尽调</p>
            <h1 className="ui-title mt-3 text-3xl sm:text-4xl">选择您的查看视角</h1>
            <p className="ui-muted mx-auto mt-4 max-w-2xl leading-7">
              三种视角共用同一套主体信息和产品状态，只改变排序与叙事重点。公司资料和发布状态来自版本配置；可编辑章节、文件与访问记录由后台比赛中心管理。
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {MODES.map(({ mode, icon: Icon, label, title, subtitle, color }) => (
              <Link
                key={mode}
                href={`/showcase/${mode}`}
                className="group relative overflow-hidden rounded-[var(--ui-radius-lg)] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 shadow-[var(--ui-shadow-sm)] transition hover:shadow-[var(--ui-shadow-md)] hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] text-white" style={{ backgroundColor: color }}>
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-black text-white" style={{ backgroundColor: color }}>
                    {label}
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-black">{title}</h2>
                <p className="ui-muted mt-2 text-sm leading-6">{subtitle}</p>
                <div className="mt-5 flex items-center gap-1 text-sm font-bold" style={{ color }}>
                  进入查看 <ExternalLink className="size-3.5" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-[var(--ui-radius-lg)] border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-6 text-center">
            <p className="text-sm font-bold text-[var(--ui-muted)]">
              运营主体：{SHOWCASE_PROJECT.company.name}
            </p>
            <p className="mt-2 text-xs text-[var(--ui-faint)]">
              版本 {SHOWCASE_PROJECT.version} · 更新于 {SHOWCASE_PROJECT.updatedAt} · {SHOWCASE_PROJECT.icp}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
