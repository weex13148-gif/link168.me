import Link from "next/link";
import type { ReactNode } from "react";
import { Crown, LineChart, Palette, QrCode, ShieldCheck, Sparkles, Bot, ArrowLeft } from "lucide-react";

export type DashboardNavKey =
  | "overview"
  | "profile"
  | "content"
  | "appearance"
  | "share"
  | "account";

type NavItem = {
  key: DashboardNavKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

const navItems: NavItem[] = [
  { key: "overview", label: "经营概览", description: "数据与主页动态", icon: LineChart },
  { key: "profile", label: "我的名片", description: "头像、昵称、简介", icon: Sparkles },
  { key: "content", label: "内容与组件", description: "链接、模块、短码", icon: Crown },
  { key: "appearance", label: "样式装修", description: "主题、颜色、按钮", icon: Palette },
  { key: "share", label: "分享与二维码", description: "导出链接与二维码", icon: QrCode },
  { key: "account", label: "账户与安全", description: "账号、密码、设备", icon: ShieldCheck },
];

type DashboardSidebarProps = {
  activeNav: DashboardNavKey;
  setActiveNav: (nav: DashboardNavKey) => void;
  extra?: ReactNode;
};

export function DashboardSidebar({ activeNav, setActiveNav, extra }: DashboardSidebarProps) {
  return (
    <>
      <nav className="hidden h-full w-full flex-col gap-1 rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-3 shadow-[0_18px_55px_rgba(86,68,46,0.08)] lg:flex">
        <div className="mb-2 flex items-center gap-2 px-3 pt-1">
          <div className="grid size-9 place-items-center rounded-2xl bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20">
            <Sparkles aria-hidden className="link168-nav-icon" />
          </div>
          <div>
            <p className="text-sm font-black text-[#2B241E]">Link168 名片编辑</p>
            <p className="text-xs text-[#7A6D5E]">编辑主页，实时预览</p>
          </div>
        </div>

        <div className="grid gap-1">
          {navItems.map(({ key, label, description, icon: Icon }) => {
            const isActive = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNav(key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  isActive
                    ? "bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20"
                    : "text-[#3F5F31] hover:bg-[#F2E7D8]"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                    isActive ? "bg-white/15 text-white" : "bg-[#F7F1E7] text-[#6F8F4E]"
                  }`}
                >
                  <Icon aria-hidden className="link168-nav-icon" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{label}</span>
                  <span className={`block text-xs ${isActive ? "text-white/80" : "text-[#7A6D5E]"}`}>
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-[#E8DCCB] pt-3">
          <Link
            href="/workbench"
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[#7A6D5E] transition hover:bg-[#F2E7D8] hover:text-[#3F5F31]"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span>返回 AI 工作台</span>
          </Link>
        </div>

        {extra ? <div className="mt-3 border-t border-[#E8DCCB] pt-3">{extra}</div> : null}
      </nav>

      <nav className="flex items-center justify-around lg:hidden">
        {navItems.slice(0, 5).map(({ key, label, icon: Icon }) => {
          const isActive = activeNav === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveNav(key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                isActive ? "text-[#6F8F4E]" : "text-[#7A6D5E]"
              }`}
            >
              <Icon aria-hidden className="size-5" />
              <span className="text-[10px] font-black">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export const dashboardNavKeys: DashboardNavKey[] = navItems.map((item) => item.key);
