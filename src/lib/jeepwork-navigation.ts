export type JeepworkNavTone = "brand" | "danger" | "accent" | "info";

export type JeepworkNavItem = {
  href: string;
  label: string;
  icon: string;
  tone?: JeepworkNavTone;
  requiredRole: "super_admin";
};

export type JeepworkNavGroup = {
  id: string;
  label: string;
  tone: JeepworkNavTone;
  items: JeepworkNavItem[];
};

export const JEEPWORK_NAV_GROUPS: JeepworkNavGroup[] = [
  {
    id: "overview",
    label: "总览",
    tone: "brand",
    items: [
      { href: "/jeepwork", label: "后台首页", icon: "◎", requiredRole: "super_admin" },
    ],
  },
  {
    id: "users-enterprise",
    label: "用户与企业",
    tone: "info",
    items: [
      { href: "/jeepwork/users", label: "用户管理", icon: "◇", tone: "info", requiredRole: "super_admin" },
      { href: "/jeepwork/profiles", label: "主页管理", icon: "◇", requiredRole: "super_admin" },
      { href: "/jeepwork/roles", label: "角色权限", icon: "⬢", tone: "accent", requiredRole: "super_admin" },
    ],
  },
  {
    id: "content-governance",
    label: "内容与治理",
    tone: "danger",
    items: [
      { href: "/jeepwork/reports", label: "举报管理", icon: "!", tone: "danger", requiredRole: "super_admin" },
    ],
  },
  {
    id: "ai-governance",
    label: "AI 治理",
    tone: "accent",
    items: [
      { href: "/jeepwork/ai-usage", label: "AI 用量", icon: "△", tone: "accent", requiredRole: "super_admin" },
      { href: "/jeepwork/ai-safety", label: "AI 安全测试", icon: "盾", tone: "accent", requiredRole: "super_admin" },
      { href: "/jeepwork/settings/ai", label: "AI 配置", icon: "⚙", tone: "accent", requiredRole: "super_admin" },
    ],
  },
  {
    id: "payment-commerce",
    label: "支付与商业化",
    tone: "info",
    items: [
      { href: "/jeepwork/settings/payment", label: "支付宝与收费", icon: "支", tone: "info", requiredRole: "super_admin" },
    ],
  },
  {
    id: "security-audit",
    label: "安全与审计",
    tone: "danger",
    items: [
      { href: "/jeepwork/audit", label: "审计日志", icon: "▣", tone: "danger", requiredRole: "super_admin" },
      { href: "/jeepwork/logs", label: "访问日志", icon: "☰", tone: "info", requiredRole: "super_admin" },
    ],
  },
  {
    id: "system-ops",
    label: "系统与运维",
    tone: "brand",
    items: [
      { href: "/jeepwork/system-health", label: "运维健康", icon: "◈", requiredRole: "super_admin" },
      { href: "/jeepwork/settings/api", label: "邮箱与系统配置", icon: "⚙", tone: "info", requiredRole: "super_admin" },
    ],
  },
];
