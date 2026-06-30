"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Briefcase, Building2, Bot, Users, LineChart, Crown, ShieldCheck, LayoutDashboard, Sparkles, Pencil } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof User;
  highlight: string;
  tone: string;
};

const CARD_EDITOR_ITEM: NavItem = {
  href: "/dashboard",
  label: "名片编辑器",
  icon: Pencil,
  highlight: "#6F8F4E",
  tone: "bg-[#DDE8CD] text-[#3F5F31]",
};

const NAV_ITEMS: NavItem[] = [
  { href: "/workbench", label: "工作台", icon: LayoutDashboard, highlight: "#6F8F4E", tone: "bg-[#F7F1E7] text-[#3F5F31]" },
  { href: "/workbench/card", label: "AI 名片助手", icon: User, highlight: "#6F8F4E", tone: "bg-[#F7F1E7] text-[#3F5F31]" },
  { href: "/workbench/products", label: "产品与服务", icon: Briefcase, highlight: "#2563EB", tone: "bg-[#EAF3FF] text-[#2563EB]" },
  { href: "/workbench/leads", label: "客户线索", icon: Users, highlight: "#B42318", tone: "bg-[#FFE6E2] text-[#B42318]" },
  { href: "/workbench/analytics", label: "数据中心", icon: LineChart, highlight: "#5B6FFF", tone: "bg-[#E8E6FF] text-[#3D48B8]" },
  { href: "/workbench/account", label: "账号与安全", icon: ShieldCheck, highlight: "#2B241E", tone: "bg-[#F5F0E6] text-[#2B241E]" },
];

const BETA_ITEMS: NavItem[] = [
  { href: "/workbench/ai", label: "五大 AI 助手", icon: Sparkles, highlight: "#8C612E", tone: "bg-[#F6E7C8] text-[#8C612E]" },
  { href: "/workbench/ai-service", label: "AI 客服", icon: Bot, highlight: "#8C612E", tone: "bg-[#F6E7C8] text-[#8C612E]" },
];

const PLANNED_ITEMS: NavItem[] = [
  { href: "/workbench/enterprise", label: "企业资料库", icon: Building2, highlight: "#2B241E", tone: "bg-[#F7F1E7] text-[#2B241E]" },
  { href: "/workbench/membership", label: "会员与订阅", icon: Crown, highlight: "#8C612E", tone: "bg-[#F6E7C8] text-[#8C612E]" },
];

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

            <div className="mt-4">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6D5E]">规划中</p>
              <nav aria-label="规划中功能" className="grid gap-1">
                {PLANNED_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.href}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-[#A89A8B] opacity-70"
                    >
                      <span className={`grid size-8 place-items-center rounded-xl ${item.tone}`}>
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto rounded-full bg-[#E8DCCB] px-1.5 py-0.5 text-[9px] font-black text-[#7A6D5E]">即将</span>
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
              <p className="text-xs font-black text-[#7A6D5E]">Link168 V1 已上线</p>
              <p className="mt-1 text-sm font-bold text-[#3F5F31]">名片 · 产品 · 线索 · 数据</p>
              <p className="mt-2 text-xs text-[#7A6D5E]">五大 AI 助手与企业功能正在内测，敬请期待。</p>
            </div>
          </div>
        </aside>

        {/* 主内容 */}
        <main className="min-w-0 flex-1">
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
    </div>
  );
}
