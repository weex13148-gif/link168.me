import crypto from "crypto";

const PRICES: Record<string, { monthly: number | null; yearly: number | null }> = {
  free: { monthly: 0, yearly: 0 },
  plus: { monthly: null, yearly: 18800 },
  member_basic: { monthly: null, yearly: 18800 },
  member_plus: { monthly: null, yearly: 18800 },
  pro: { monthly: null, yearly: 38800 },
  enterprise: { monthly: null, yearly: 128000 },
  enterprise_pro_plus: { monthly: null, yearly: 268000 },
  internal_test: { monthly: 1, yearly: 1 },
};

export const PLAN_CODES = {
  FREE: "free",
  PLUS: "plus",
  MEMBER_BASIC: "member_basic",
  MEMBER_PLUS: "member_plus",
  PRO: "pro",
  ENTERPRISE: "enterprise",
  ENTERPRISE_PRO_PLUS: "enterprise_pro_plus",
  INTERNAL_TEST: "internal_test",
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  features: string[];
  limits: {
    products: number;
    knowledgeDocs: number;
    aiChatsPerMonth: number;
    aiCreditsGrant: number;
    teamSeats: number;
    customDomain: boolean;
    removeBranding: boolean;
    prioritySupport: boolean;
  };
  highlight?: boolean;
  contactSales?: boolean;
  legacy?: boolean;
};

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  free: {
    code: "free",
    name: "免费版",
    description: "免费建立公开主页，开启基础经营",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "CNY",
    features: [
      "1 个公开主页",
      "无限添加链接",
      "基础二维码与免费主题",
      "基础访问数据",
      "AI 功能演示，不产生真实调用",
    ],
    limits: {
      products: 3,
      knowledgeDocs: 0,
      aiChatsPerMonth: 0,
      aiCreditsGrant: 0,
      teamSeats: 1,
      customDomain: false,
      removeBranding: false,
      prioritySupport: false,
    },
  },
  plus: {
    code: "plus",
    name: "Plus",
    description: "让主页拥有基础 AI 资料助理",
    priceMonthly: PRICES.plus.monthly,
    priceYearly: PRICES.plus.yearly,
    currency: "CNY",
    features: [
      "无限链接与中英文主页",
      "基础访客 AI 助理窗口",
      "基础资料与文件交付",
      "更多主题与高级二维码",
      "90 天访问与点击数据",
      "隐藏 Link168 品牌标识",
    ],
    limits: {
      products: 10,
      knowledgeDocs: 3,
      aiChatsPerMonth: 300,
      aiCreditsGrant: 300,
      teamSeats: 1,
      customDomain: false,
      removeBranding: true,
      prioritySupport: false,
    },
  },
  member_basic: {
    code: "member_basic",
    name: "Plus（旧版兼容）",
    description: "旧会员基础版自动按 Plus 权益兼容",
    priceMonthly: PRICES.member_basic.monthly,
    priceYearly: PRICES.member_basic.yearly,
    currency: "CNY",
    features: [
      "无限链接与中英文主页",
      "基础访客 AI 助理窗口",
      "基础资料与文件交付",
      "更多主题与高级二维码",
      "90 天访问与点击数据",
      "隐藏 Link168 品牌标识",
    ],
    limits: {
      products: 10,
      knowledgeDocs: 3,
      aiChatsPerMonth: 300,
      aiCreditsGrant: 300,
      teamSeats: 1,
      customDomain: false,
      removeBranding: true,
      prioritySupport: false,
    },
    legacy: true,
  },
  member_plus: {
    code: "member_plus",
    name: "Plus 会员",
    description: "让主页拥有基础 AI 资料助理",
    priceMonthly: PRICES.member_plus.monthly,
    priceYearly: PRICES.member_plus.yearly,
    currency: "CNY",
    features: [
      "无限链接与中英文主页",
      "基础访客 AI 助理窗口",
      "基础资料与文件交付",
      "更多主题与高级二维码",
      "90 天访问与点击数据",
      "隐藏 Link168 品牌标识",
    ],
    limits: {
      products: 10,
      knowledgeDocs: 3,
      aiChatsPerMonth: 300,
      aiCreditsGrant: 300,
      teamSeats: 1,
      customDomain: false,
      removeBranding: true,
      prioritySupport: false,
    },
    legacy: true,
  },
  pro: {
    code: "pro",
    name: "Pro 年付",
    description: "面向创作者、销售与个体经营者的 AI 获客主页",
    priceMonthly: PRICES.pro.monthly,
    priceYearly: PRICES.pro.yearly,
    currency: "CNY",
    highlight: true,
    features: [
      "产品与服务模块展示",
      "客户线索收集与整理",
      "有限 AI 接待（2000 Credits/月）",
      "知识库文档管理",
      "高级数据统计与导出",
      "优先客服支持",
    ],
    limits: {
      products: 50,
      knowledgeDocs: 20,
      aiChatsPerMonth: 2000,
      aiCreditsGrant: 2000,
      teamSeats: 1,
      customDomain: false,
      removeBranding: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    code: "enterprise",
    name: "企业版",
    description: "企业级品牌主页与定制化服务",
    priceMonthly: PRICES.enterprise.monthly,
    priceYearly: PRICES.enterprise.yearly,
    currency: "CNY",
    contactSales: true,
    features: [
      "企业品牌主页定制",
      "独立域名绑定",
      "多名团队成员协作",
      "品牌主题与去标识",
      "企业级知识库与 AI 客服",
      "专属客户经理支持",
    ],
    limits: {
      products: 200,
      knowledgeDocs: 100,
      aiChatsPerMonth: 10000,
      aiCreditsGrant: 10000,
      teamSeats: 3,
      customDomain: true,
      removeBranding: true,
      prioritySupport: true,
    },
  },
  enterprise_pro_plus: {
    code: "enterprise_pro_plus",
    name: "企业专业 Plus",
    description: "多产品、多成员和企业级 AI 工作空间",
    priceMonthly: PRICES.enterprise_pro_plus.monthly,
    priceYearly: PRICES.enterprise_pro_plus.yearly,
    currency: "CNY",
    features: [
      "包含企业会员全部功能",
      "最多 10 名企业成员",
      "最多 3 个独立域名名额",
      "多产品与多知识空间",
      "高级客服顾问与操作日志",
      "企业初始化与优先服务",
    ],
    limits: {
      products: 1000,
      knowledgeDocs: 500,
      aiChatsPerMonth: 50000,
      aiCreditsGrant: 50000,
      teamSeats: 10,
      customDomain: true,
      removeBranding: true,
      prioritySupport: true,
    },
    legacy: true,
  },
  internal_test: {
    code: "internal_test",
    name: "内部测试",
    description: "仅限 super_admin 验证支付闭环",
    priceMonthly: PRICES.internal_test.monthly,
    priceYearly: PRICES.internal_test.yearly,
    currency: "CNY",
    features: ["全部会员功能", "支付回调测试", "内部验收专用"],
    limits: {
      products: -1,
      knowledgeDocs: -1,
      aiChatsPerMonth: -1,
      aiCreditsGrant: 10000,
      teamSeats: -1,
      customDomain: true,
      removeBranding: true,
      prioritySupport: true,
    },
    legacy: true,
  },
};

export const PLAN_ORDER: PlanCode[] = [
  "free",
  "plus",
  "member_plus",
  "pro",
  "enterprise",
  "enterprise_pro_plus",
];

export const PUBLIC_PLAN_ORDER: PlanCode[] = [
  "free",
  "plus",
  "pro",
  "enterprise",
];

export function isPriceConfirmed(planCode: PlanCode, billingCycle: "monthly" | "yearly"): boolean {
  const plan = getPlanDefinition(planCode);
  if (plan.contactSales) return false;
  return billingCycle === "yearly" ? plan.priceYearly !== null : plan.priceMonthly !== null;
}

export function formatPriceDisplay(planCode: PlanCode, billingCycle: "monthly" | "yearly"): string {
  const plan = getPlanDefinition(planCode);
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (price === null) {
    if (plan.contactSales) return "联系销售";
    return "不可用";
  }
  if (price === 0) return "免费";
  const period = billingCycle === "yearly" ? "/年" : "/月";
  const base = `${(price / 100).toFixed(0)} 元${period}`;
  if (plan.contactSales) return `${base} 起`;
  return base;
}

export function getPlanPriceCents(planCode: PlanCode, billingCycle: "monthly" | "yearly"): number | null {
  const plan = getPlanDefinition(planCode);
  if (plan.contactSales) return null;
  return billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

export function getPlanDefinition(planCode: string): PlanDefinition {
  return PLAN_DEFINITIONS[planCode as PlanCode] ?? PLAN_DEFINITIONS.free;
}

export function getPlanPrice(plan: PlanDefinition, billingCycle: "monthly" | "yearly"): number {
  if (plan.contactSales) throw new Error("该套餐暂不支持在线购买");
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (price === null) throw new Error(`${plan.name} 当前仅支持年付`);
  return price;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `L${timestamp}${random}`;
}

export const AI_RECEPTION_ADDON = {
  code: "ai_reception_addon_100",
  name: "AI 接待通用加油包",
  description: "100 次 AI 接待会话额度，90 天有效",
  priceCents: 990,
  quantity: 100,
  unit: "session",
  validityDays: 90,
} as const;
