import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Crown, LineChart, Palette, QrCode, ShieldCheck, Sparkles } from "lucide-react";

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
  { key: "overview", label: "我的主页", description: "主页状态与快捷操作", icon: LineChart },
  { key: "profile", label: "名片资料", description: "头像、名称和简介", icon: Sparkles },
  { key: "content", label: "我的链接", description: "添加、编辑和排序链接", icon: Crown },
  { key: "appearance", label: "主题装修", description: "主题、颜色和按钮样式", icon: Palette },
  { key: "share", label: "分享与二维码", description: "公开地址和二维码", icon: QrCode },
  { key: "account", label: "账户与安全", description: "邮箱、密码和登录设备", icon: ShieldCheck },
];

type DashboardSidebarProps = {
  activeNav: DashboardNavKey;
  setActiveNav: (nav: DashboardNavKey) => void;
  extra?: ReactNode;
};

export function DashboardSidebar({ activeNav, setActiveNav, extra }: DashboardSidebarProps) {
  return (
    <>
      <nav className="hidden h-full w-full flex-col gap-1 rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-4 shadow-[0_18px_55px_rgba(86,68,46,0.08)] lg:flex">
        <div className="mb-3 flex items-center gap-3 px-2 pt-1">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20">
            <Sparkles aria-hidden className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black text-[#2B241E]">Link168 主页编辑器</p>
            <p className="text-xs text-[#7A6D5E]">编辑内容，右侧实时预览</p>
          </div>
        </div>

        <div className="grid gap-1.5">
          {navItems.map(({ key, label, description, icon: Icon }) => {
            const active = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNav(key)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[66px] items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  active
                    ? "bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20"
                    : "text-[#3F5F31] hover:bg-[#F2E7D8]"
                }`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-[#F7F1E7] text-[#6F8F4E]"}`}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{label}</span>
                  <span className={`mt-0.5 block text-xs leading-5 ${active ? "text-white/80" : "text-[#7A6D5E]"}`}>{description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto border-t border-[#E8DCCB] pt-3">
          <Link href="/workbench" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[#7A6D5E] transition hover:bg-[#F2E7D8] hover:text-[#3F5F31]">
            <ArrowLeft aria-hidden className="size-4" />
            <span>返回 AI 工作台</span>
          </Link>
        </div>

        {extra ? <div className="mt-3 border-t border-[#E8DCCB] pt-3">{extra}</div> : null}
      </nav>

      <nav className="flex items-center justify-around lg:hidden">
        {navItems.slice(0, 5).map(({ key, label, icon: Icon }) => {
          const active = activeNav === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveNav(key)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${active ? "text-[#6F8F4E]" : "text-[#7A6D5E]"}`}
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
