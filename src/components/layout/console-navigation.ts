/**
 * 共享导航配置 —— ConsoleShell / WorkbenchShell / DashboardFrame 共同读取
 * 确保导航名称、顺序、入口地址、状态分类在三套入口中保持一致。
 *
 * 普通用户一级入口严格限制为 5 个：首页、名片、客户、AI、我的
 * 企业入口、Jeepwork、/showcase 不得出现在普通用户导航中。
 */

import {
  LayoutDashboard,
  Palette,
  Users,
  Link2,
  BarChart3,
  Bot,
  Package,
  Crown,
  Settings,
  Home,
  PieChart,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import {
  MAINLINE_PRIMARY_ROUTES,
  type MainlineNavId,
} from "@/lib/product/mainline";

export type NavStatus = "live" | "beta" | "planned";

export type SharedNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  status: NavStatus;
  group: "core" | "growth" | "ai" | "settings";
  badge?: string;
  badgeTone?: string;
};

/**
 * 一级入口（桌面端与手机端统一只显示这 5 个）
 * 1. 首页   (/console)
 * 2. 名片   (/dashboard)
 * 3. 客户   (/workbench/leads)
 * 4. AI     (/workbench/ai)
 * 5. 我的   (/workbench/account)
 */
const PRIMARY_VIEW: Record<
  MainlineNavId,
  Pick<
    SharedNavItem,
    "icon" | "tone" | "status" | "group" | "badge" | "badgeTone"
  >
> = {
  home: {
    icon: Home,
    tone: "bg-[#F7F1E7] text-[#3F5F31]",
    status: "live",
    group: "core",
  },
  card: {
    icon: Palette,
    tone: "bg-[#DDE8CD] text-[#3F5F31]",
    status: "live",
    group: "core",
  },
  customers: {
    icon: Users,
    tone: "bg-[#FFE6E2] text-[#B42318]",
    status: "live",
    group: "growth",
  },
  ai: {
    icon: Bot,
    tone: "bg-[#F6E7C8] text-[#8C612E]",
    status: "beta",
    group: "ai",
    badge: "Beta",
    badgeTone: "bg-[#F6E7C8] text-[#8C612E]",
  },
  me: {
    icon: UserCog,
    tone: "bg-[#F5F0E6] text-[#2B241E]",
    status: "live",
    group: "settings",
  },
};

export const PRIMARY_NAV_ITEMS: SharedNavItem[] =
  MAINLINE_PRIMARY_ROUTES.map((route) => ({
    ...route,
    ...PRIMARY_VIEW[route.id],
  }));

/** 二级功能入口（仅出现在桌面端侧边栏次级区域或「更多」菜单） */
export const SECONDARY_NAV_ITEMS: SharedNavItem[] = [
  { href: "/workbench/products", label: "产品与服务", icon: Package, tone: "bg-[#EAF3FF] text-[#2563EB]", status: "live", group: "core" },
  { href: "/workbench/short-links", label: "短链接", icon: Link2, tone: "bg-[#E8E6FF] text-[#3D48B8]", status: "live", group: "growth" },
  { href: "/workbench/analytics", label: "数据分析", icon: BarChart3, tone: "bg-[#E8E6FF] text-[#3D48B8]", status: "live", group: "growth" },
  { href: "/workbench/membership", label: "会员与套餐", icon: Crown, tone: "bg-[#F6E7C8] text-[#8C612E]", status: "live", group: "settings" },
];

/** 完整导航列表（向后兼容，供 DashboardFrame 模块切换等使用） */
export const SHARED_NAV_ITEMS: SharedNavItem[] = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
];

/** 移动端底部导航（严格五入口，第四项必须是 AI） */
export const SHARED_MOBILE_NAV: SharedNavItem[] = PRIMARY_NAV_ITEMS;

/** WorkbenchShell 侧栏使用的子集（排除 /console 和 /dashboard） */
export const WORKBENCH_NAV_ITEMS = SECONDARY_NAV_ITEMS.filter(
  (item) => item.href.startsWith("/workbench") && item.href !== "/workbench",
);

/** WorkbenchShell 需要额外显示的工作台首页 */
export const WORKBENCH_EXTRA_ITEMS: SharedNavItem[] = [
  { href: "/workbench", label: "工作台", icon: LayoutDashboard, tone: "bg-[#F7F1E7] text-[#3F5F31]", status: "live", group: "core" },
];
