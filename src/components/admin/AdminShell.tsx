"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X, Menu } from "lucide-react";
import {
  JEEPWORK_NAV_GROUPS,
  type JeepworkNavTone,
} from "@/lib/jeepwork-navigation";

/**
 * AdminShell — /jeepwork 平台控制平面统一外壳
 *
 * 一级导航按 JEEPWORK_ADMIN_SPEC 第 3.1 节收敛为 8 个分组：
 *   总览 / 用户与企业 / 内容与治理 / AI 治理 / 支付与商业化 /
 *   外部展示 / 安全与审计 / 系统与运维
 *
 * 桌面端：左侧固定侧边栏（248px）+ 顶部面包屑与标题 + 主内容区。
 * 移动端：导航收入顶部按钮触发的全屏抽屉，主内容区全宽，表格降级为卡片。
 *
 * 路由不删除、不新增，仅调整分组与展示层级。
 */

function toneColor(tone: JeepworkNavTone) {
  if (tone === "danger") return "var(--ui-danger)";
  if (tone === "accent") return "var(--ui-accent)";
  if (tone === "info") return "var(--ui-info)";
  return "var(--ui-brand)";
}

type AdminShellProps = {
  currentPageLabel: React.ReactNode;
  currentUserEmail?: string | null;
  currentUserRole?: string | null;
  onLogout?: () => void;
  children: React.ReactNode;
  pageHeader: { eyebrow: string; title: string; subtitle?: string; highlight?: string };
};

export default function AdminShell({
  currentPageLabel,
  currentUserEmail,
  currentUserRole,
  onLogout,
  children,
  pageHeader,
}: AdminShellProps) {
  const pathname = usePathname();
  const isSuperAdmin = currentUserRole === "super_admin";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 路由切换时自动关闭移动端导航
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // 移动端导航打开时禁用 body 滚动
  useEffect(() => {
    if (!mobileNavOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  function isActive(href: string) {
    if (href === "/jeepwork") return pathname === "/jeepwork";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const visibleGroups = isSuperAdmin ? JEEPWORK_NAV_GROUPS : [];

  if (currentUserRole !== "super_admin") return null;

  const sidebar = (
    <aside className="ui-surface flex h-full flex-col overflow-hidden">
      <Link
        href="/jeepwork"
        className="flex items-center gap-3 border-b border-[var(--ui-line)] px-4 py-4"
      >
        <span className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-base font-black text-white">
          L
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black tracking-wide text-[var(--ui-ink)]">
            Link168 管理后台
          </span>
          <span className="block text-xs text-[var(--ui-muted)]">平台控制平面</span>
        </span>
      </Link>

      <nav
        aria-label="后台一级导航"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
      >
        {visibleGroups.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            <p
              className="px-3 py-1 text-[11px] font-black uppercase tracking-wider"
              style={{ color: toneColor(group.tone) }}
            >
              {group.label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-[var(--ui-brand-soft)] text-[var(--ui-ink)]"
                          : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="grid size-6 flex-shrink-0 place-items-center text-[11px] font-black"
                        style={{ color: toneColor(item.tone ?? group.tone) }}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 p-3">
        {currentUserEmail ? (
          <p className="mb-2 truncate text-xs font-bold text-[var(--ui-muted)]" title={currentUserEmail}>
            {currentUserEmail}
          </p>
        ) : null}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ui-faint)]">
          超级管理员
        </p>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="ui-button-secondary min-h-10 w-full text-xs"
          >
            退出登录
          </button>
        ) : null}
      </div>
    </aside>
  );

  return (
    <main className="ui-page min-h-dvh overflow-x-hidden">
      {/* 移动端顶栏 */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-[var(--ui-line)] bg-[var(--ui-surface)]/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/jeepwork" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-xs font-black text-white">
              L
            </span>
            <span className="text-sm font-black text-[var(--ui-ink)]">Link168 后台</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="打开后台导航"
            className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] text-[var(--ui-ink)]"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* 移动端导航抽屉 */}
      {mobileNavOpen ? (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85%] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="关闭导航"
              className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="ui-admin-container grid gap-5 py-4 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* 桌面端侧边栏 */}
        <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
          {sidebar}
        </div>

        <div className="min-w-0 py-1">
          {/* 面包屑 */}
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ui-muted)]">
            <Link href="/jeepwork" className="text-[var(--ui-brand)] hover:underline">
              管理后台
            </Link>
            <span aria-hidden className="text-[var(--ui-faint)]">
              ›
            </span>
            <span className="text-[var(--ui-ink)]">{currentPageLabel}</span>
          </div>

          {/* 页面标题 */}
          <header className="mt-5 border-b border-[var(--ui-line)] pb-5">
            <p
              className="ui-eyebrow"
              style={{ color: pageHeader.highlight || "var(--ui-brand)" }}
            >
              {pageHeader.eyebrow}
            </p>
            <h1 className="ui-title mt-2 text-2xl sm:text-3xl">{pageHeader.title}</h1>
            {pageHeader.subtitle ? (
              <p className="ui-muted mt-2 max-w-5xl text-sm leading-6">{pageHeader.subtitle}</p>
            ) : null}
          </header>

          <div className="mt-6 min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
