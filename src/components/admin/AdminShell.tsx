"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; highlight: string; icon: string; superAdminOnly?: boolean };

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/jeepwork", label: "后台首页", highlight: "#6F8F4E", icon: "◎" },
  { href: "/jeepwork/users", label: "用户管理", highlight: "#5B6FFF", icon: "◇", superAdminOnly: true },
  { href: "/jeepwork/profiles", label: "主页管理", highlight: "#2B241E", icon: "◇" },
  { href: "/jeepwork/reports", label: "举报管理", highlight: "#B42318", icon: "!" },
  { href: "/jeepwork/settings/ai", label: "AI 配置", highlight: "#8C612E", icon: "⚙", superAdminOnly: true },
  { href: "/jeepwork/ai-safety", label: "AI 安全测试", highlight: "#8C612E", icon: "🛡", superAdminOnly: true },
  { href: "/jeepwork/ai-usage", label: "AI 用量", highlight: "#8C612E", icon: "△" },
  { href: "/jeepwork/ai-cost", label: "AI 成本", highlight: "#8C612E", icon: "￥", superAdminOnly: true },
  { href: "/jeepwork/system-health", label: "运维健康", highlight: "#6F8F4E", icon: "◈", superAdminOnly: true },
  { href: "/jeepwork/settings/api", label: "邮箱与系统配置", highlight: "#5B6FFF", icon: "⚙", superAdminOnly: true },
  { href: "/jeepwork/logs", label: "访问日志", highlight: "#5B6FFF", icon: "☰", superAdminOnly: true },
  { href: "/jeepwork/governance", label: "平台治理", highlight: "#5B6FFF", icon: "⬡", superAdminOnly: true },
  { href: "/jeepwork/roles", label: "角色管理", highlight: "#8C612E", icon: "⬢", superAdminOnly: true },
  { href: "/jeepwork/audit", label: "审计日志", highlight: "#B42318", icon: "▣", superAdminOnly: true },
];

type AdminShellProps = {
  currentPageLabel: React.ReactNode;
  currentUserEmail?: string | null;
  currentUserRole?: string | null;
  onLogout?: () => void;
  children: React.ReactNode;
  pageHeader: { eyebrow: string; title: string; subtitle?: string; highlight?: string };
};

export default function AdminShell({ currentPageLabel, currentUserEmail, currentUserRole, onLogout, children, pageHeader }: AdminShellProps) {
  const pathname = usePathname();
  const isSuperAdmin = currentUserRole === "super_admin";
  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);
  function isActive(href: string) {
    if (href === "/jeepwork") return pathname === "/jeepwork";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1920px] bg-[#F6F2EA] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <section className="flex flex-wrap items-center gap-3 rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:flex-col lg:items-stretch lg:overflow-hidden">
          <Link href="/jeepwork" className="mr-2 flex items-center gap-2 lg:mr-0 lg:px-1 lg:py-1">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#6F8F4E] text-base font-black text-white">L</span>
            <span>
              <span className="block text-sm font-black tracking-wide text-[#2B241E]">Link168 管理后台</span>
              <span className="hidden text-xs text-[#8B7B68] lg:block">电脑端管理工作台</span>
            </span>
          </Link>

          <nav aria-label="后台导航" className="flex flex-1 flex-wrap items-center gap-1 sm:gap-2 lg:min-h-0 lg:content-start lg:items-stretch lg:overflow-y-auto lg:pr-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition lg:min-h-11 lg:w-full ${
                    active
                      ? "bg-[#EEF4E7] text-[#2B241E]"
                      : "text-[#7A6D5E] hover:bg-[#F5F0E7] hover:text-[#2B241E]"
                  }`}
                >
                  <span aria-hidden className="grid size-6 place-items-center text-xs" style={{ color: item.highlight }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 lg:mt-auto lg:block lg:rounded-2xl lg:border lg:border-[#E8DCCB] lg:bg-[#FFFDF8] lg:p-3">
            {currentUserEmail ? (
              <span className="hidden truncate text-xs font-bold text-[#7A6D5E] sm:inline lg:block lg:max-w-full">
                {currentUserEmail}
              </span>
            ) : null}
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7] lg:mt-3 lg:w-full"
              >
                退出登录
              </button>
            ) : null}
          </div>
        </section>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#7A6D5E]">
            <Link href="/jeepwork" className="text-[#6F8F4E] hover:underline">管理后台</Link>
            <span aria-hidden className="text-[#B8ACA0]">›</span>
            <span className="text-[#2B241E]">{currentPageLabel}</span>
          </div>

          <section className="mt-4 rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black tracking-[0.16em]" style={{ color: pageHeader.highlight || "#6F8F4E" }}>
              {pageHeader.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#2B241E] sm:text-3xl">{pageHeader.title}</h1>
            {pageHeader.subtitle ? <p className="mt-2 max-w-5xl text-sm leading-6 text-[#7A6D5E]">{pageHeader.subtitle}</p> : null}
          </section>

          <div className="mt-6 min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
