"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, type LucideIcon } from "lucide-react";
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  SHARED_MOBILE_NAV,
  type SharedNavItem,
} from "@/components/layout/console-navigation";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  badge?: string;
  badgeTone?: string;
  group?: "core" | "growth" | "ai" | "settings";
};

function toNavItem(item: SharedNavItem): NavItem {
  return {
    href: item.href,
    label: item.label,
    icon: item.icon,
    tone: item.tone,
    badge: item.badge,
    badgeTone: item.badgeTone,
    group: item.group,
  };
}

// 桌面端一级入口（严格 5 个）
export const DESKTOP_PRIMARY_NAV: NavItem[] = PRIMARY_NAV_ITEMS.filter(
  (item) => item.status === "live" || item.status === "beta",
).map(toNavItem);

// 桌面端二级入口
export const DESKTOP_SECONDARY_NAV: NavItem[] = SECONDARY_NAV_ITEMS.filter(
  (item) => item.status === "live" || item.status === "beta",
).map(toNavItem);

export const MOBILE_BOTTOM_NAV: NavItem[] = SHARED_MOBILE_NAV.map(toNavItem);

const GROUP_LABELS: Record<string, string> = {
  core: "经营核心",
  growth: "增长与数据",
  ai: "AI 与企业",
  settings: "账户与设置",
};

function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/console") return pathname === "/console";
  return pathname.startsWith(href);
}

export default function ConsoleShell({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const groupedPrimary = DESKTOP_PRIMARY_NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = item.group || "core";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

const groupedSecondary = DESKTOP_SECONDARY_NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = item.group || "core";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const groupedAllNav = [...DESKTOP_PRIMARY_NAV, ...DESKTOP_SECONDARY_NAV].reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = item.group || "core";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-dvh w-full bg-[#F7F1E7]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-start">
        {/* 桌面端侧边导航 */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100dvh-32px)] lg:w-[280px] lg:shrink-0">
          <div className="flex h-full flex-col rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
            <Link href="/console" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-2xl bg-[#6F8F4E] text-white text-base font-black">L</span>
              <div>
                <p className="text-sm font-black tracking-wide text-[#2B241E]">Link168 控制台</p>
                <p className="text-[11px] font-semibold text-[#7A6D5E]">经营你的数字名片</p>
              </div>
            </Link>

            <div className="mt-5 flex-1 overflow-y-auto pr-1">
              {/* 一级入口（5 个） */}
              <nav aria-label="一级导航" className="grid gap-1">
                {DESKTOP_PRIMARY_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                        active
                          ? "bg-[#2B241E] text-white shadow-sm"
                          : "text-[#3F5F31] hover:bg-[#F7F1E7]"
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-xl ${
                          active ? "bg-white/15 text-white" : item.tone
                        }`}
                      >
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                            item.badgeTone || "bg-[#E8DCCB] text-[#7A6D5E]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              {/* 二级入口 */}
              <div className="mt-4 border-t border-[#E8DCCB] pt-4">
                {Object.entries(groupedSecondary).map(([group, items]) => (
                  <div key={group} className="mb-4 last:mb-0">
                    <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6D5E]">
                      {GROUP_LABELS[group] || group}
                    </p>
                    <nav aria-label={`${GROUP_LABELS[group] || group}导航`} className="grid gap-1">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                              active
                                ? "bg-[#2B241E] text-white shadow-sm"
                                : "text-[#3F5F31] hover:bg-[#F7F1E7]"
                            }`}
                          >
                            <span
                              className={`grid size-8 place-items-center rounded-xl ${
                                active ? "bg-white/15 text-white" : item.tone
                              }`}
                            >
                              <Icon aria-hidden className="size-4" />
                            </span>
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <span
                                className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                                  item.badgeTone || "bg-[#E8DCCB] text-[#7A6D5E]"
                                }`}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
              <p className="text-xs font-black text-[#7A6D5E]">Link168 控制台</p>
              <p className="mt-1 text-sm font-bold text-[#3F5F31]">名片 · 产品 · 线索 · 数据 · AI</p>
            </div>
          </div>
        </aside>

        {/* 主内容 */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          {/* 移动端顶部栏 */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link href="/console" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-[#6F8F4E] text-white text-sm font-black">L</span>
              <span className="text-sm font-black text-[#2B241E]">Link168</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-[#E8DCCB] bg-white text-[#2B241E]"
              aria-label="打开菜单"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {/* 页面标题区 */}
          <header className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
            {eyebrow ? (
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6F8F4E]">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-black text-[#2B241E] sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-[#7A6D5E]">{subtitle}</p> : null}
          </header>

          <div className="mt-6">{children}</div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-white/96 px-1 py-1 backdrop-blur lg:hidden safe-area-pb"
        aria-label="手机端控制台导航"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1 px-2">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[44px] min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black transition ${
                  active ? "bg-[#DDE8CD] text-[#3F5F31]" : "text-[#7A6D5E] hover:bg-[#F7F1E7]"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-w-[44px] min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black text-[#7A6D5E] hover:bg-[#F7F1E7]"
            aria-label="更多功能"
          >
            <Menu className="size-5" />
            更多
          </button>
        </div>
      </nav>

      {/* 移动端全屏菜单 */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/35 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-xl safe-area-pb"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="全部功能"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#2B241E]">全部功能</h2>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid size-10 place-items-center rounded-xl bg-[#F7F1E7] text-[#2B241E]"
                aria-label="关闭"
              >
                <X className="size-5" />
              </button>
            </div>

            {Object.entries(groupedAllNav).map(([group, items]) => (
              <div key={group} className="mb-5 last:mb-0">
                <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#7A6D5E]">
                  {GROUP_LABELS[group] || group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${
                          active
                            ? "bg-[#2B241E] text-white"
                            : "bg-[#F7F1E7] text-[#3F5F31]"
                        }`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                            active ? "bg-white/15 text-white" : item.tone
                          }`}
                        >
                          <Icon aria-hidden className="size-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{item.label}</p>
                          {item.badge ? (
                            <p className="text-[10px] font-bold opacity-70">{item.badge}</p>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
