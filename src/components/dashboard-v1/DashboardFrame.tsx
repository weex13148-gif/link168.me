"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Home,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  Palette,
  QrCode,
  Share2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { DashboardTab, SaveState } from "@/components/dashboard-v1/types";

const primaryItems: Array<{ key: DashboardTab; label: string; icon: typeof Home }> = [
  { key: "home", label: "我的主页", icon: Home },
  { key: "profile", label: "名片资料", icon: UserRound },
  { key: "links", label: "我的链接", icon: Link2 },
  { key: "appearance", label: "主题装修", icon: Palette },
  { key: "share", label: "分享与二维码", icon: QrCode },
  { key: "account", label: "账户与安全", icon: ShieldCheck },
];

const mobilePrimary: DashboardTab[] = ["home", "links", "profile", "appearance"];

function SaveStatus({ state }: { state: SaveState }) {
  const config = {
    saved: { text: "已保存", className: "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" },
    dirty: { text: "有未保存修改", className: "bg-[var(--ui-accent-soft)] text-[#8C612E]" },
    saving: { text: "正在保存", className: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]" },
    error: { text: "保存失败", className: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]" },
  }[state];

  return <span className={`hidden rounded-full px-3 py-1.5 text-xs font-black sm:inline-flex ${config.className}`}>{config.text}</span>;
}

export function DashboardFrame({
  activeTab,
  setActiveTab,
  userEmail,
  planLabel,
  saveState,
  onShare,
  onLogout,
  children,
  preview,
}: {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  userEmail: string;
  planLabel: string;
  saveState: SaveState;
  onShare: () => void;
  onLogout: () => void;
  children: ReactNode;
  preview: ReactNode;
}) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  function selectTab(tab: DashboardTab) {
    setActiveTab(tab);
    setMoreOpen(false);
  }

  return (
    <main className="ui-page min-h-dvh overflow-x-hidden pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[color:var(--ui-surface)]/96 backdrop-blur">
        <div className="ui-admin-container flex min-h-16 items-center justify-between gap-4">
          <button type="button" onClick={() => selectTab("home")} className="shrink-0" aria-label="返回我的主页">
            <BrandLogo size="header" className="!w-[118px]" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <SaveStatus state={saveState} />
            <button type="button" onClick={() => selectTab("account")} className="hidden min-h-9 items-center gap-2 rounded-xl border border-[var(--ui-line)] bg-white px-3 text-xs font-black text-[var(--ui-muted)] sm:inline-flex">
              <Crown className="size-4 text-[var(--ui-accent)]" />
              {planLabel}
            </button>
            <button type="button" onClick={onShare} className="ui-button-primary min-h-10 px-3 sm:px-4">
              <Share2 className="size-4" />
              <span className="hidden sm:inline">分享主页</span>
            </button>
            <button type="button" onClick={onLogout} className="grid size-10 place-items-center rounded-xl border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] hover:text-[var(--ui-danger)]" title="退出登录" aria-label="退出登录">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="ui-admin-container grid gap-5 py-5 lg:grid-cols-[224px_minmax(0,1fr)_auto] lg:gap-6 lg:py-7">
        <aside className="hidden lg:block">
          <div className="sticky top-24 grid gap-4">
            <nav className="ui-surface p-3" aria-label="用户后台导航">
              <div className="mb-2 px-3 py-2">
                <p className="truncate text-sm font-black text-[var(--ui-ink)]" title={userEmail}>{userEmail}</p>
                <p className="mt-1 text-xs text-[var(--ui-muted)]">{planLabel}</p>
              </div>
              <div className="grid gap-1">
                {primaryItems.map(({ key, label, icon: Icon }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectTab(key)}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-black transition ${active ? "bg-[var(--ui-brand)] text-white" : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"}`}
                    >
                      <Icon className="size-4.5 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="ui-surface-plain p-4 text-xs leading-6 text-[var(--ui-muted)]">
              <div className="flex items-center gap-2 font-black text-[var(--ui-ink)]"><LayoutGrid className="size-4 text-[var(--ui-brand)]" />Link168 主页编辑器</div>
              <p className="mt-2">资料、链接、主题和分享入口都在这里完成，不再使用短码或未开放模块。</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0">{children}</section>

        <aside className={`hidden min-w-0 lg:block ${previewOpen ? "w-[350px] xl:w-[370px]" : "w-11"}`}>
          <div className="sticky top-24">
            {previewOpen ? (
              <div className="ui-surface relative p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--ui-ink)]">实时预览</p>
                    <p className="text-xs text-[var(--ui-muted)]">仅显示已经保存的公开内容</p>
                  </div>
                  <button type="button" onClick={() => setPreviewOpen(false)} className="grid size-9 place-items-center rounded-xl border border-[var(--ui-line)] bg-white text-[var(--ui-muted)]" aria-label="收起预览" title="收起预览">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                {preview}
              </div>
            ) : (
              <button type="button" onClick={() => setPreviewOpen(true)} className="grid min-h-36 w-11 place-items-center rounded-xl border border-[var(--ui-line)] bg-white text-[var(--ui-brand)] shadow-[var(--ui-shadow-sm)]" aria-label="展开预览" title="展开预览">
                <ChevronLeft className="size-4" />
                <span className="[writing-mode:vertical-rl] text-xs font-black tracking-widest">展开预览</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ui-line)] bg-[color:var(--ui-surface)]/96 px-2 py-2 backdrop-blur lg:hidden safe-area-pb" aria-label="手机端后台导航">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {mobilePrimary.map((key) => {
            const item = primaryItems.find((entry) => entry.key === key)!;
            const Icon = item.icon;
            const active = activeTab === key;
            return (
              <button key={key} type="button" onClick={() => selectTab(key)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black ${active ? "text-[var(--ui-brand)]" : "text-[var(--ui-muted)]"}`}>
                <Icon className="size-5" />
                {item.label}
              </button>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black ${activeTab === "share" || activeTab === "account" ? "text-[var(--ui-brand)]" : "text-[var(--ui-muted)]"}`}>
            <Menu className="size-5" />
            更多
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-3 lg:hidden" onClick={() => setMoreOpen(false)} role="presentation">
          <section className="w-full rounded-[24px] bg-[var(--ui-surface)] p-4 shadow-[var(--ui-shadow-lg)]" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="更多功能">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">更多功能</h2>
              <button type="button" onClick={() => setMoreOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => selectTab("share")} className="flex min-h-13 items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-4 text-left font-black"><QrCode className="size-5 text-[var(--ui-brand)]" />分享与二维码</button>
              <button type="button" onClick={() => selectTab("account")} className="flex min-h-13 items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-4 text-left font-black"><ShieldCheck className="size-5 text-[var(--ui-brand)]" />账户与安全</button>
              <button type="button" onClick={onLogout} className="flex min-h-13 items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-4 text-left font-black text-[var(--ui-danger)]"><LogOut className="size-5" />退出登录</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
