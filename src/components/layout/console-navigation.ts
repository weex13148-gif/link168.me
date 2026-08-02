import {
  BarChart3,
  Bot,
  Building2,
  Crown,
  FileText,
  Home,
  Link2,
  Package,
  Palette,
  UserCog,
  Users,
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

export const PRIMARY_NAV_ITEMS: SharedNavItem[] = [
  { href: "/console", label: "概览", icon: Home, tone: "bg-[#F7F1E7] text-[#3F5F31]", status: "live", group: "core" },
  { href: "/console/card", label: "名片", icon: Palette, tone: "bg-[#DDE8CD] text-[#3F5F31]", status: "live", group: "core" },
  { href: "/console/leads", label: "客户", icon: Users, tone: "bg-[#FFE6E2] text-[#B42318]", status: "live", group: "growth" },
  { href: "/console/analytics", label: "经营数据", icon: BarChart3, tone: "bg-[#E8E6FF] text-[#3D48B8]", status: "live", group: "growth" },
  { href: "/console/ai-reception", label: "AI 接待", icon: Bot, tone: "bg-[#F6E7C8] text-[#8C612E]", status: "beta", group: "ai", badge: "Beta", badgeTone: "bg-[#F6E7C8] text-[#8C612E]" },
];

export const SECONDARY_NAV_ITEMS: SharedNavItem[] = [
  { href: "/console/products", label: "产品与服务", icon: Package, tone: "bg-[#EAF3FF] text-[#2563EB]", status: "live", group: "core" },
  { href: "/console/knowledge", label: "知识库", icon: FileText, tone: "bg-[#DDE8CD] text-[#3F5F31]", status: "live", group: "ai" },
  { href: "/console/short-links", label: "短链接", icon: Link2, tone: "bg-[#E8E6FF] text-[#3D48B8]", status: "live", group: "growth" },
  { href: "/console/membership", label: "会员与额度", icon: Crown, tone: "bg-[#F6E7C8] text-[#8C612E]", status: "live", group: "settings" },
  { href: "/console/enterprise", label: "企业", icon: Building2, tone: "bg-[#EAF3FF] text-[#2563EB]", status: "live", group: "settings" },
  { href: "/console/account", label: "账号", icon: UserCog, tone: "bg-[#F5F0E6] text-[#2B241E]", status: "live", group: "settings" },
];

export const SHARED_NAV_ITEMS: SharedNavItem[] = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
];

export const SHARED_MOBILE_NAV: SharedNavItem[] = [
  PRIMARY_NAV_ITEMS[0],
  PRIMARY_NAV_ITEMS[1],
  PRIMARY_NAV_ITEMS[2],
  SECONDARY_NAV_ITEMS.find((item) => item.href === "/console/account")!,
];

export const WORKBENCH_NAV_ITEMS = SECONDARY_NAV_ITEMS;
export const WORKBENCH_EXTRA_ITEMS: SharedNavItem[] = [];
