"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Crown,
  Home,
  LayoutGrid,
  Link2,
  LogOut,
  Palette,
  QrCode,
  Share2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { DashboardTab, SaveState } from "@/components/dashboard-v1/types";
import {
  CONSOLE_PRIMARY_NAV,
  isSharedNavItemActive,
} from "@/components/layout/console-navigation";

const primaryItems: Array<{ key: DashboardTab; label: string; icon: typeof Home }> = [
  { key: "home", label: "我的主页", icon: Home },
  { key: "profile", label: "名片资料", icon: UserRound },
  { key: "links", label: "我的链接", icon: Link2 },
  { key: "appearance", label: "主题装修", icon: Palette },
  { key: "share", label: "分享与二维码", icon: QrCode },
  { key: "stats", label: "数据中心", icon: BarChart3 },
  { key: "account", label: "账户与安全", icon: ShieldCheck },
];

function SaveStatus({ state, mobile = false }: { state: SaveState; mobile?: boolean }) {
  const config = {
    saved: {
      text: "已保存",
      dot: "bg-[var(--ui-success)]",
      className: "bg-[var(--ui-success-soft)] text-[var(--ui-success)]",
    },
    dirty: {
      text: "未保存",
      dot: "bg-[var(--ui-accent)]",
      className: "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]",
    },
    saving: {
      text: "保存中",
      dot: "bg-[var(--ui-info)]",
      className: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]",
    },
    error: {
      text: "保存失败",
      dot: "bg-[var(--ui-danger)]",
      className: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
    },
  }[state];

  if (mobile) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-black ${config.className}`}>
        <span className={`size-1.5 rounded-full ${config.dot}`} />
        {config.text}
      </span>
    );
  }

  return (
    <span className={`hidden rounded-full px-3 py-1.5 text-xs font-black sm:inline-flex ${config.className}`}>
      {config.text}
    </span>
  );
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
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    void loadNotificationCount();
  }, []);

  async function loadNotificationCount() {
    try {
      const response = await fetch("/api/notifications?summary=true");
      const data = await response.json();
      if (data?.success && data.data) {
        setUnreadCount(data.data.unread || 0);
      }
    } catch {
      // 通知数量失败不阻断名片编辑。
    }
  }

  function goToNotifications() {
    window.location.href = "/workbench/notifications";
  }

  function selectTab(tab: DashboardTab) {
    setActiveTab(tab);
  }

  return (
    <main className="ui-page min-h-dvh overflow-x-hidden pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[color:var(--ui-surface)]/96 backdrop-blur">
        <div className="ui-admin-container flex min-h-14 min-w-0 items-center justify-between gap-2 sm:min-h-16 sm:gap-4">
          <button
            type="button"
            onClick={() => selectTab("home")}
            className="shrink-0"
            aria-label="返回名片编辑首页"
          >
            <BrandLogo size="header" className="!w-[104px] sm:!w-[118px]" />
          </button>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <SaveStatus state={saveState} mobile={saveState !== "saved"} />
            <SaveStatus state={saveState} />
            <button
              type="button"
              onClick={() => selectTab("account")}
              className="hidden min-h-9 items-center gap-2 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] px-3 text-xs font-black text-[var(--ui-muted)] sm:inline-flex"
            >
              <Crown className="size-4 text-[var(--ui-accent)]" />
              {planLabel}
            </button>
            <button type="button" onClick={onShare} className="ui-button-primary min-h-10 px-3 sm:px-4">
              <Share2 className="size-4" />
              <span className="hidden sm:inline">分享主页</span>
            </button>
            <button
              type="button"
              onClick={goToNotifications}
              className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-muted)] hover:text-[var(--ui-ink)]"
              title="通知中心"
              aria-label="通知中心"
            >
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ui-danger)] px-1 text-[10px] font-black text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="hidden shrink-0 place-items-center rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-muted)] hover:text-[var(--ui-danger)] sm:grid sm:size-10"
              title="退出登录"
              aria-label="退出登录"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="ui-admin-container grid min-w-0 gap-4 py-4 sm:gap-5 sm:py-5 lg:grid-cols-[224px_minmax(0,1fr)_auto] lg:gap-6 lg:py-7">
        <aside className="hidden lg:block">
          <div className="sticky top-24 grid gap-4">
            <nav className="ui-surface p-3" aria-label="用户后台导航">
              <div className="mb-2 px-3 py-2">
                <p className="truncate text-sm font-black text-[var(--ui-ink)]" title={userEmail}>
                  {userEmail}
                </p>
                <p className="mt-1 text-xs text-[var(--ui-muted)]">{planLabel}</p>
              </div>

              <div className="mb-3 border-b border-[var(--ui-line)] pb-3">
                <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--ui-muted)]">
                  五个一级入口
                </p>
                <div className="grid gap-1">
                  {CONSOLE_PRIMARY_NAV.map((item) => {
                    const Icon = item.icon;
                    const active = isSharedNavItemActive(pathname, item);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-black transition ${
                          active
                            ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]"
                            : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--ui-muted)]">
                名片装修
              </p>
              <div className="grid gap-1">
                {primaryItems.map(({ key, label, icon: Icon }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectTab(key)}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-black transition ${
                        active
                          ? "bg-[var(--ui-brand)] text-white"
                          : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"
                      }`}
                    >
                      <Icon className="size-4.5 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="ui-surface-plain p-4 text-xs leading-6 text-[var(--ui-muted)]">
              <div className="flex items-center gap-2 font-black text-[var(--ui-ink)]">
                <LayoutGrid className="size-4 text-[var(--ui-brand)]" />
                Link168 主页编辑器
              </div>
              <p className="mt-2">资料、链接、主题和分享入口都在这里完成。</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <nav className="mb-4 overflow-x-auto pb-1 lg:hidden" aria-label="名片装修工具">
            <div className="flex w-max min-w-full gap-2">
              {primaryItems.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectTab(key)}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                      active
                        ? "border-[var(--ui-brand)] bg-[var(--ui-brand)] text-white"
                        : "border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-muted)]"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
          {children}
        </section>

        <aside className={`hidden min-w-0 lg:block ${previewOpen ? "w-[350px] xl:w-[370px]" : "w-11"}`}>
          <div className="sticky top-24">
            {previewOpen ? (
              <div className="ui-surface relative p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--ui-ink)]">实时预览</p>
                    <p className="text-xs text-[var(--ui-muted)]">仅显示已经保存的公开内容</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className="grid size-9 place-items-center rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-muted)]"
                    aria-label="收起预览"
                    title="收起预览"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                {preview}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="grid min-h-36 w-11 place-items-center rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-brand)] shadow-[var(--ui-shadow-sm)]"
                aria-label="展开预览"
                title="展开预览"
              >
                <ChevronLeft className="size-4" />
                <span className="[writing-mode:vertical-rl] text-xs font-black tracking-widest">展开预览</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ui-line)] bg-[color:var(--ui-surface)]/96 px-2 py-1 backdrop-blur lg:hidden safe-area-pb"
        aria-label="手机端控制台导航"
      >
        <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1">
          {CONSOLE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isSharedNavItemActive(pathname, item);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black transition ${
                  active
                    ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]"
                    : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
