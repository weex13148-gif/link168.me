/**
 * 共享导航配置 —— ConsoleShell / WorkbenchShell / DashboardFrame 共同读取
 * 确保导航名称、顺序、入口地址、状态分类在三套入口中保持一致。
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
  Building2,
  Settings,
  Home,
  PieChart,
  UserCog,
  BookOpen,
  CreditCard,
  Bell,
  type LucideIcon,
} from "lucide-react";

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
 * 统一导航项（按显示顺序排列）
 * status=live 的项目在所有 Shell 中都可作为可点击链接
 * status=beta 的项目标注 "Beta" 徽章
 * status=planned 的项目不在此列表中（已实现的功能不应标记为 planned）
 */
export const SHARED_NAV_ITEMS: SharedNavItem[] = [
  { href: "/console", label: "首页概览", icon: LayoutDashboard, tone: "bg-[var(--ui-surface-muted)] text-[var(--ui-brand)]", status: "live", group: "core" },
  { href: "/dashboard", label: "名片装修", icon: Palette, tone: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]", status: "live", group: "core", badge: "推荐", badgeTone: "bg-[var(--ui-surface)] text-[var(--ui-success)]" },
  { href: "/workbench/products", label: "产品与服务", icon: Package, tone: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]", status: "live", group: "core" },
  { href: "/workbench/leads", label: "客户线索", icon: Users, tone: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]", status: "live", group: "growth" },
  { href: "/workbench/short-links", label: "短链接", icon: Link2, tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]", status: "live", group: "growth" },
  { href: "/workbench/analytics", label: "数据分析", icon: BarChart3, tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]", status: "live", group: "growth" },
  { href: "/workbench/ai", label: "AI 助手", icon: Bot, tone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]", status: "beta", group: "ai", badge: "Beta", badgeTone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]" },
  { href: "/workbench/enterprise", label: "企业工作空间", icon: Building2, tone: "bg-[#F7F1E7] text-[var(--ui-ink)]", status: "live", group: "ai" },
  { href: "/workbench/membership", label: "会员与套餐", icon: Crown, tone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]", status: "live", group: "settings" },
  { href: "/workbench/card", label: "名片管理", icon: Palette, tone: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]", status: "live", group: "core" },
  { href: "/workbench/ai-service", label: "AI 服务配置", icon: Bot, tone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]", status: "live", group: "ai" },
  { href: "/workbench/knowledge", label: "知识库", icon: BookOpen, tone: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]", status: "live", group: "growth" },
  { href: "/workbench/account", label: "账户设置", icon: Settings, tone: "bg-[var(--ui-surface-muted)] text-[var(--ui-ink)]", status: "live", group: "settings" },
  { href: "/jeepwork", label: "管理后台", icon: LayoutDashboard, tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]", status: "live", group: "settings" },
];

/** 移动端底部导航（统一） */
export const SHARED_MOBILE_NAV: SharedNavItem[] = [
  { href: "/console", label: "首页", icon: Home, tone: "text-[var(--ui-success)]", status: "live", group: "core" },
  { href: "/dashboard", label: "名片", icon: Palette, tone: "text-[var(--ui-brand)]", status: "live", group: "core" },
  { href: "/workbench/leads", label: "客户", icon: Users, tone: "text-[var(--ui-danger)]", status: "live", group: "growth" },
  { href: "/workbench/analytics", label: "数据", icon: PieChart, tone: "text-[var(--ui-brand)]", status: "live", group: "growth" },
  { href: "/workbench/account", label: "我的", icon: UserCog, tone: "text-[var(--ui-ink)]", status: "live", group: "settings" },
];

/** WorkbenchShell 侧栏使用的子集（排除 /console 和 /dashboard，因为 WorkbenchShell 有自己的名片编辑器入口） */
export const WORKBENCH_NAV_ITEMS = SHARED_NAV_ITEMS.filter(
  (item) => item.href.startsWith("/workbench") && item.href !== "/workbench",
);

/** WorkbenchShell 需要额外显示的工作台首页和 AI 名片助手 */
export const WORKBENCH_EXTRA_ITEMS: SharedNavItem[] = [
  { href: "/workbench", label: "工作台", icon: LayoutDashboard, tone: "bg-[var(--ui-surface-muted)] text-[var(--ui-brand)]", status: "live", group: "core" },
];
