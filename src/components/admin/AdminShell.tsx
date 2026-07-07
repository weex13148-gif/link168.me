"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

type NavTone = "brand" | "danger" | "accent" | "info";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  tone?: NavTone;
  superAdminOnly?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  tone: NavTone;
  items: NavItem[];
};

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "总览",
    tone: "brand",
    items: [{ href: "/jeepwork", label: "后台首页", icon: "H" }],
  },
  {
    id: "users",
    label: "用户与名片",
    tone: "info",
    items: [
      { href: "/jeepwork/users", label: "用户管理", icon: "U", tone: "info" },
      { href: "/jeepwork/profiles", label: "名片管理", icon: "P" },
      { href: "/jeepwork/roles", label: "角色权限", icon: "R", tone: "accent", superAdminOnly: true },
    ],
  },
  {
    id: "content",
    label: "内容与治理",
    tone: "danger",
    items: [
      { href: "/jeepwork/reports", label: "举报管理", icon: "!", tone: "danger" },
      { href: "/jeepwork/governance", label: "平台治理", icon: "G", tone: "info", superAdminOnly: true },
    ],
  },
  {
    id: "commerce",
    label: "会员与订单",
    tone: "info",
    items: [
      { href: "/jeepwork/settings/payment", label: "支付配置", icon: "C", tone: "info", superAdminOnly: true },
      { href: "/jeepwork/ai-credits", label: "AI 额度", icon: "Q", tone: "accent", superAdminOnly: true },
    ],
  },
  {
    id: "ai",
    label: "AI 治理",
    tone: "accent",
    items: [
      { href: "/jeepwork/ai-usage", label: "AI 用量", icon: "A", tone: "accent" },
      { href: "/jeepwork/ai-cost", label: "AI 成本", icon: "$", tone: "accent", superAdminOnly: true },
      { href: "/jeepwork/ai-safety", label: "AI 安全测试", icon: "S", tone: "accent", superAdminOnly: true },
      { href: "/jeepwork/settings/ai", label: "AI 配置", icon: "K", tone: "accent", superAdminOnly: true },
    ],
  },
  {
    id: "security",
    label: "安全与审计",
    tone: "danger",
    items: [
      { href: "/jeepwork/audit", label: "审计日志", icon: "L", tone: "danger", superAdminOnly: true },
      { href: "/jeepwork/logs", label: "访问日志", icon: "I", tone: "info", superAdminOnly: true },
    ],
  },
  {
    id: "ops",
    label: "系统运维",
    tone: "brand",
    items: [
      { href: "/jeepwork/system-health", label: "系统健康", icon: "O", superAdminOnly: true },
      { href: "/jeepwork/settings/api", label: "邮件与系统配置", icon: "M", tone: "info", superAdminOnly: true },
    ],
  },
];

function toneColor(tone: NavTone) {
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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

  const visibleGroups = ALL_NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
    }))
    .filter((group) => group.items.length > 0);

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
            Link168 Jeepwork
          </span>
          <span className="block text-xs text-[var(--ui-muted)]">平台治理后台</span>
        </span>
      </Link>

      <nav aria-label="后台导航" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
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
          {isSuperAdmin ? "超级管理员" : currentUserRole === "admin" ? "管理员" : "已登录"}
        </p>
        {onLogout ? (
          <button type="button" onClick={onLogout} className="ui-button-secondary min-h-10 w-full text-xs">
            退出登录
          </button>
        ) : null}
      </div>
    </aside>
  );

  return (
    <main className="ui-page min-h-dvh overflow-x-hidden">
      <div className="sticky top-0 z-30 border-b border-[var(--ui-line)] bg-[var(--ui-surface)]/95 backdrop-blur lg:hidden">
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

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
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
        <div className="hidden lg:sticky lg:top-4 lg:block lg:h-[calc(100dvh-2rem)]">{sidebar}</div>

        <div className="min-w-0 py-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ui-muted)]">
            <Link href="/jeepwork" className="text-[var(--ui-brand)] hover:underline">
              管理后台
            </Link>
            <span aria-hidden className="text-[var(--ui-faint)]">
              /
            </span>
            <span className="text-[var(--ui-ink)]">{currentPageLabel}</span>
          </div>

          <header className="mt-5 border-b border-[var(--ui-line)] pb-5">
            <p className="ui-eyebrow" style={{ color: pageHeader.highlight || "var(--ui-brand)" }}>
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
