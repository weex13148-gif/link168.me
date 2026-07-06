"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil } from "lucide-react";
import { SHARED_NAV_ITEMS, WORKBENCH_EXTRA_ITEMS, SHARED_MOBILE_NAV, type SharedNavItem } from "@/components/layout/console-navigation";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Pencil;
  highlight: string;
  tone: string;
};

const CARD_EDITOR_ITEM: NavItem = {
  href: "/dashboard",
  label: "名片装修",
  icon: Pencil,
  highlight: "#6F8F4E",
  tone: "bg-[#DDE8CD] text-[#3F5F31]",
};

// 从共享导航配置生成 Workbench 侧栏项
function toWorkbenchNav(item: SharedNavItem): NavItem {
  return {
    href: item.href,
    label: item.label,
    icon: item.icon as unknown as typeof Pencil,
    highlight: "#6F8F4E",
    tone: item.tone,
  };
}

const NAV_ITEMS: NavItem[] = [
  ...WORKBENCH_EXTRA_ITEMS.map(toWorkbenchNav),
  ...SHARED_NAV_ITEMS.filter((i) => i.href.startsWith("/workbench") && i.href !== "/workbench" && i.status === "live" && i.group !== "ai").map(toWorkbenchNav),
];

const BETA_ITEMS: NavItem[] = SHARED_NAV_ITEMS.filter((i) => i.status === "beta" && i.href.startsWith("/workbench")).map(toWorkbenchNav);

export default function WorkbenchShell({
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

  return (
    <div className="min-h-dvh w-full bg-[#F7F1E7]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-start">
        {/* 桌面端侧边导航 + 移动端顶部快捷 */}
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100dvh-32px)] lg:w-[280px] lg:shrink-0">
          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-4 shadow-sm lg:p-5">
            <Link href="/workbench" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-2xl bg-[#6F8F4E] text-white text-base font-black">L</span>
              <div>
                <p className="text-sm font-black tracking-wide text-[#2B241E]">Link168 工作台</p>
                <p className="text-[11px] font-semibold text-[#7A6D5E]">名片 · 产品 · AI 客服</p>
              </div>
            </Link>

            <nav aria-label="客户工作台导航" className="mt-4 grid gap-1 sm:mt-5">
              {/* 名片编辑器入口 */}
              {(() => {
                const Icon = CARD_EDITOR_ITEM.icon;
                const active = pathname === CARD_EDITOR_ITEM.href || pathname?.startsWith(CARD_EDITOR_ITEM.href);
                return (
                  <Link
                    href={CARD_EDITOR_ITEM.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                      active ? "bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20" : "bg-[#DDE8CD] text-[#3F5F31] hover:bg-[#C8D9B8]"
                    }`}
                  >
                    <span className={`grid size-8 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : CARD_EDITOR_ITEM.tone}`}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="truncate">{CARD_EDITOR_ITEM.label}</span>
                    <span className="ml-auto rounded-full bg-[#FFFDF8] px-1.5 py-0.5 text-[9px] font-black text-[#6F8F4E]">推荐</span>
                  </Link>
                );
              })()}

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/workbench" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                      active ? "bg-[#2B241E] text-white shadow-sm" : "text-[#3F5F31] hover:bg-[#F7F1E7]"
                    }`}
                  >
                    <span className={`grid size-8 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : item.tone}`}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#C9824B]">内测中</p>
              <nav aria-label="内测功能" className="grid gap-1">
                {BETA_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/workbench" && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition opacity-90 ${
                        active ? "bg-[#8C612E] text-white shadow-sm" : "text-[#5F5347] hover:bg-[#F7F1E7]"
                      }`}
                    >
                      <span className={`grid size-8 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : item.tone}`}>
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto rounded-full bg-[#F6E7C8] px-1.5 py-0.5 text-[9px] font-black text-[#8C612E]">Beta</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
              <p className="text-xs font-black text-[#7A6D5E]">Link168 工作台</p>
              <p className="mt-1 text-sm font-bold text-[#3F5F31]">名片 · 产品 · 线索 · 数据</p>
              <p className="mt-2 text-xs text-[#7A6D5E]">AI 助手与企业工作空间已开放使用。</p>
            </div>
          </div>
        </aside>

        {/* 主内容 */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
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

      {/* D12: 移动端底部导航 - 使用 SHARED_MOBILE_NAV */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-white/96 px-1 py-1 backdrop-blur lg:hidden safe-area-pb"
        aria-label="手机端工作台导航"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1 px-2">
          {SHARED_MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/console" && item.href !== "/dashboard" && pathname?.startsWith(item.href));
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
        </div>
      </nav>
    </div>
  );
}
