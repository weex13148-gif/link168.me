export type MainlineNavId = "home" | "card" | "customers" | "ai" | "me";

export type MainlinePrimaryRoute = {
  id: MainlineNavId;
  label: "首页" | "名片" | "客户" | "AI" | "我的";
  href:
    | "/console"
    | "/dashboard"
    | "/workbench/leads"
    | "/workbench/ai"
    | "/workbench/account";
};

export const MAINLINE_PRIMARY_ROUTES = [
  { id: "home", label: "首页", href: "/console" },
  { id: "card", label: "名片", href: "/dashboard" },
  { id: "customers", label: "客户", href: "/workbench/leads" },
  { id: "ai", label: "AI", href: "/workbench/ai" },
  { id: "me", label: "我的", href: "/workbench/account" },
] as const satisfies readonly MainlinePrimaryRoute[];

export type MainlineOrdinaryPlanFact = {
  code: "free" | "plus" | "pro";
  name: "Free" | "Plus" | "Pro";
  availability: "当前可用" | "价格、权益与支付核验中";
  purchaseState: "无需购买" | "暂未开放购买";
  features: readonly string[];
};

export const MAINLINE_ORDINARY_PLAN_FACTS = [
  {
    code: "free",
    name: "Free",
    availability: "当前可用",
    purchaseState: "无需购买",
    features: ["无限链接", "基础主题与二维码", "保留 Link168 品牌"],
  },
  {
    code: "plus",
    name: "Plus",
    availability: "价格、权益与支付核验中",
    purchaseState: "暂未开放购买",
    features: ["方案正在核验", "开放时提供完整权益说明"],
  },
  {
    code: "pro",
    name: "Pro",
    availability: "价格、权益与支付核验中",
    purchaseState: "暂未开放购买",
    features: ["方案正在核验", "开放时提供完整权益说明"],
  },
] as const satisfies readonly MainlineOrdinaryPlanFact[];

const PLUS_CODES = new Set([
  "plus",
  "member_basic",
  "member_plus",
  "starter",
]);
const PRO_CODES = new Set([
  "pro",
  "enterprise",
  "enterprise_pro",
  "enterprise_pro_plus",
  "internal_test",
]);
const FUTURE_CODES = new Set([
  "enterprise",
  "enterprise_pro",
  "enterprise_pro_plus",
]);

export function toMainlinePlanLabel(
  value: string | null | undefined,
): "Free" | "Plus" | "Pro" {
  const normalized = (value || "free").trim().toLowerCase();
  if (PLUS_CODES.has(normalized)) return "Plus";
  if (PRO_CODES.has(normalized)) return "Pro";
  return "Free";
}

export function isFuturePlanCode(value: string | null | undefined): boolean {
  return FUTURE_CODES.has((value || "").trim().toLowerCase());
}
