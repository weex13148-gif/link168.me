"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  tone?: "brand" | "danger" | "accent" | "info";
  superAdminOnly?: boolean;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/jeepwork", label: "后台首页", icon: "◎" },
  { href: "/jeepwork/users", label: "用户管理", icon: "◇", tone: "info", superAdminOnly: true },
  { href: "/jeepwork/profiles", label: "主页管理", icon: "◇" },
  { href: "/jeepwork/reports", label: "举报管理", icon: "!", tone: "danger" },
  { href: "/jeepwork/competition-center", label: "比赛中心", icon: "赛", tone: "brand", superAdminOnly: true },
  { href: "/jeepwork/settings/ai", label: "AI 配置", icon: "⚙", tone: "accent", superAdminOnly: true },
  { href: "/jeepwork/ai-safety", label: "AI 安全测试", icon: "盾", tone: "accent", superAdminOnly: true },
  { href: "/jeepwork/ai-usage", label: "AI 用量", icon: "△", tone: "accent" },
  { href: "/jeepwork/ai-cost", label: "AI 成本", icon: "￥", tone: "accent", superAdminOnly: true },
  { href: "/jeepwork/system-health", label: "运维健康", icon: "◈", superAdminOnly: true },
  { href: "/jeepwork/settings/payment", label: "支付宝与收费", icon: "支", tone: "info", superAdminOnly: true },
  { href: "/jeepwork/settings/api", label: "邮箱与系统配置", icon: "⚙", tone: "info", superAdminOnly: true },
  { href: "/jeepwork/logs", label: "访问日志", icon: "☰", tone: "info", superAdminOnly: true },
  { href: "/jeepwork/governance", label: "平台治理", icon: "⬡", tone: "info", superAdminOnly: true },
  { href: "/jeepwork/roles", label: "角色管理", icon: "⬢", tone: "accent", superAdminOnly: true },
  { href: "/jeepwork/audit", label: "审计日志", icon: "▣", tone: "danger", superAdminOnly: true },
];

type AdminShellProps = {
  currentPageLabel: React.ReactNode;
  currentUserEmail?: string | null;
  currentUserRole?: string | null;
  onLogout?: () => void;
  children: React.ReactNode;
  pageHeader: { eyebrow: string; title: string; subtitle?: string; highlight?: string };
};

function toneColor(tone: NavItem["tone"]) {
  if (tone === "danger") return "var(--ui-danger)";
  if (tone === "accent") return "var(--ui-accent)";
  if (tone === "info") return "var(--ui-info)";
  return "var(--ui-brand)";
}

export default function AdminShell({ currentPageLabel, currentUserEmail, currentUserRole, onLogout, children, pageHeader }: AdminShellProps) {
  const pathname = usePathname();
  const isSuperAdmin = currentUserRole === "super_admin";
  const navItems = ALL_NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  function isActive(href: string) {
    if (href === "/jeepwork") return pathname === "/jeepwork";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <main className="ui-page py-4">
      <div className="ui-admin-container grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="ui-surface flex flex-wrap items-center gap-3 p-4 lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:flex-col lg:items-stretch lg:overflow-hidden">
          <Link href="/jeepwork" className="mr-2 flex items-center gap-3 lg:mr-0 lg:px-1 lg:py-1">
            <span className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-base font-black text-white">L</span>
            <span>
              <span className="block text-sm font-black tracking-wide text-[var(--ui-ink)]">Link168 管理后台</span>
              <span className="hidden text-xs text-[var(--ui-muted)] lg:block">系统管理工作台</span>
            </span>
          </Link>

          <nav aria-label="后台导航" className="flex flex-1 flex-wrap items-center gap-1 lg:min-h-0 lg:content-start lg:items-stretch lg:overflow-y-auto lg:pr-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold transition lg:min-h-11 lg:w-full ${
                    active
                      ? "bg-[var(--ui-brand-soft)] text-[var(--ui-ink)]"
                      : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"
                  }`}
                >
                  <span aria-hidden className="grid size-6 place-items-center text-[11px] font-black" style={{ color: toneColor(item.tone) }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 lg:mt-auto lg:block lg:rounded-[var(--ui-radius-sm)] lg:border lg:border-[var(--ui-line)] lg:bg-[var(--ui-surface-muted)] lg:p-3">
            {currentUserEmail ? (
              <span className="hidden truncate text-xs font-bold text-[var(--ui-muted)] sm:inline lg:block lg:max-w-full">
                {currentUserEmail}
              </span>
            ) : null}
            {onLogout ? (
              <button type="button" onClick={onLogout} className="ui-button-secondary min-h-10 px-4 lg:mt-3 lg:w-full">
                退出登录
              </button>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 py-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ui-muted)]">
            <Link href="/jeepwork" className="text-[var(--ui-brand)] hover:underline">管理后台</Link>
            <span aria-hidden className="text-[var(--ui-faint)]">›</span>
            <span className="text-[var(--ui-ink)]">{currentPageLabel}</span>
          </div>

          <header className="mt-5 border-b border-[var(--ui-line)] pb-5">
            <p className="ui-eyebrow" style={{ color: pageHeader.highlight || "var(--ui-brand)" }}>{pageHeader.eyebrow}</p>
            <h1 className="ui-title mt-2 text-2xl sm:text-3xl">{pageHeader.title}</h1>
            {pageHeader.subtitle ? <p className="ui-muted mt-2 max-w-5xl text-sm leading-6">{pageHeader.subtitle}</p> : null}
          </header>

          <div className="mt-6 min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
