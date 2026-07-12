import {
  Bot,
  Home,
  Palette,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  CONSOLE_SECTION_ROUTES,
  isConsoleSectionActive,
  type ConsoleSectionKey,
  type ConsoleSectionRoute,
} from "@/components/layout/console-route-policy";

export type NavStatus = "live" | "beta" | "planned";

export type SharedNavItem = ConsoleSectionRoute & {
  key: ConsoleSectionKey;
  icon: LucideIcon;
  tone: string;
  status: NavStatus;
  group: "core" | "growth" | "ai" | "settings";
  badge?: string;
  badgeTone?: string;
};

const ICONS: Record<ConsoleSectionKey, LucideIcon> = {
  home: Home,
  card: Palette,
  customers: Users,
  ai: Bot,
  account: UserCog,
};

const TONES: Record<ConsoleSectionKey, string> = {
  home: "bg-[var(--ui-surface-muted)] text-[var(--ui-brand)]",
  card: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]",
  customers: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
  ai: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]",
  account: "bg-[var(--ui-surface-muted)] text-[var(--ui-ink)]",
};

const GROUPS: Record<ConsoleSectionKey, SharedNavItem["group"]> = {
  home: "core",
  card: "core",
  customers: "growth",
  ai: "ai",
  account: "settings",
};

export const CONSOLE_PRIMARY_NAV: SharedNavItem[] = CONSOLE_SECTION_ROUTES.map((section) => ({
  ...section,
  icon: ICONS[section.key],
  tone: TONES[section.key],
  status: "live",
  group: GROUPS[section.key],
}));

/**
 * 兼容旧Shell的导出名称。所有用户侧Shell必须只渲染这五个一级分类。
 */
export const SHARED_NAV_ITEMS = CONSOLE_PRIMARY_NAV;
export const SHARED_MOBILE_NAV = CONSOLE_PRIMARY_NAV;
export const WORKBENCH_NAV_ITEMS = CONSOLE_PRIMARY_NAV;
export const WORKBENCH_EXTRA_ITEMS: SharedNavItem[] = [];

export function isSharedNavItemActive(
  pathname: string | null | undefined,
  item: SharedNavItem,
): boolean {
  return isConsoleSectionActive(pathname, item);
}
