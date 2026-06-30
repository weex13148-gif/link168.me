import crypto from "crypto";

// ===== 套餐价格来源 =====
/**
 * 价格策略说明：
 * - 价格必须来自主 PRD (docs/product/PRODUCT_CANONICAL_V1.md)
 * - 如主 PRD 中尚未最终确认具体价格，使用 null 表示"价格待正式发布"
 * - 禁止在代码中自行编写价格
 */

// 主 PRD 确认的价格（单位：分）
const PRD_CONFIRMED_PRICES: Record<string, { monthly: number | null; yearly: number | null }> = {
  free: { monthly: 0, yearly: 0 },
  // 会员基础版：主 PRD 确认 188 元/年
  member_basic: { monthly: null, yearly: 18800 }, // 188 元 = 18800 分
  // Plus 版：主 PRD 标注"价格待正式发布"
  member_plus: { monthly: null, yearly: null },
  // 企业版：联系销售
  enterprise: { monthly: null, yearly: null },
  // 内部测试套餐：0.01 元
  internal_test: { monthly: 1, yearly: 1 },
};

export const PLAN_CODES = {
  FREE: "free",
  MEMBER_BASIC: "member_basic",
  MEMBER_PLUS: "member_plus",
  ENTERPRISE: "enterprise",
  INTERNAL_TEST: "internal_test",
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

export type PlanFeature = {
  label: string;
  included: boolean;
};

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  // 价格（分），null 表示待正式发布
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
};

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  free: {
    code: "free",
    name: "免费版",
    description: "基础经营名片，开启你的线上展示",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "CNY",
    features: [
      "1 张经营名片",
      "基础经营组件（联系/链接/文字/图片/标题）",
      "基础分享页模板",
      "基础配色与字体",
      "二维码下载",
      "基础访问统计",
      "Link168 品牌露出页脚",
      "50 次/月 AI 咨询（预览）",
    ],
    limits: {
      products: 3,
      knowledgeDocs: 5,
      aiChatsPerMonth: 50,
      aiCreditsGrant: 0,
      teamSeats: 1,
      customDomain: false,
      removeBranding: false,
      prioritySupport: false,
    },
  },
  member_basic: {
    code: "member_basic",
    name: "会员基础版",
    description: "AI 页面设计与高级自定义装修",
    priceMonthly: PRD_CONFIRMED_PRICES.member_basic.monthly,
    priceYearly: PRD_CONFIRMED_PRICES.member_basic.yearly,
    currency: "CNY",
    features: [
      "3 张经营名片",
      "每年 3 次完整 AI 页面设计",
      "自定义背景图片",
      "渐变背景",
      "卡片样式与按钮样式自定义",
      "高级经营组件（商品/预约/资料/微信客服）",
      "单个插件密码保护",
      "更完整访问数据",
      "品牌露出弱化",
      "200 次/月 AI 咨询",
    ],
    limits: {
      products: 10,
      knowledgeDocs: 20,
      aiChatsPerMonth: 200,
      aiCreditsGrant: 200,
      teamSeats: 1,
      customDomain: false,
      removeBranding: true,
      prioritySupport: false,
    },
  },
  member_plus: {
    code: "member_plus",
    name: "会员 Plus",
    description: "AI 经营与客户转化，五大 Agent 加持",
    priceMonthly: PRD_CONFIRMED_PRICES.member_plus.monthly,
    priceYearly: PRD_CONFIRMED_PRICES.member_plus.yearly,
    currency: "CNY",
    highlight: true,
    features: [
      "10 张经营名片",
      "无限 AI 页面设计次数",
      "五大 AI Agent 基础能力",
      "标准 AI 销售顾问",
      "客户线索与经营档案",
      "高级数据与报表",
      "更多 AI 页面设计额度",
      "2,000 次/月 AI 咨询",
      "优先客服支持",
    ],
    limits: {
      products: 50,
      knowledgeDocs: 100,
      aiChatsPerMonth: 2000,
      aiCreditsGrant: 2000,
      teamSeats: 3,
      customDomain: false,
      removeBranding: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    code: "enterprise",
    name: "企业版",
    description: "企业知识库、长期记忆、团队能力",
    priceMonthly: null,
    priceYearly: null,
    currency: "CNY",
    contactSales: true,
    features: [
      "不限名片数量",
      "不限 AI 咨询额度",
      "企业知识库",
      "企业长期记忆",
      "企业团队能力（多用户协作）",
      "高级数据与专属 AI 销售顾问",
      "自定义域名与备案支持",
      "专属客户经理",
      "定制服务",
    ],
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
  },
  internal_test: {
    code: "internal_test",
    name: "内部测试",
    description: "仅限 super_admin 使用，用于支付流程测试",
    priceMonthly: PRD_CONFIRMED_PRICES.internal_test.monthly,
    priceYearly: PRD_CONFIRMED_PRICES.internal_test.yearly,
    currency: "CNY",
    features: [
      "全部会员功能",
      "无限 AI 咨询额度",
      "全部组件权限",
      "内部测试用",
    ],
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
  },
};

export const PLAN_ORDER: PlanCode[] = ["free", "member_basic", "member_plus", "enterprise"];

/**
 * 判断价格是否已确认
 */
export function isPriceConfirmed(planCode: PlanCode, billingCycle: "monthly" | "yearly"): boolean {
  const plan = getPlanDefinition(planCode);
  if (plan.contactSales) return false; // 企业版不在线支付
  return billingCycle === "yearly" ? plan.priceYearly !== null : plan.priceMonthly !== null;
}

/**
 * 获取格式化价格字符串
 */
export function formatPrice(planCode: PlanCode, billingCycle: "monthly" | "yearly"): string {
  const plan = getPlanDefinition(planCode);
  if (plan.contactSales) return "联系销售";
  
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (price === null) return "价格待正式发布";
  
  if (price === 0) return "免费";
  return `${(price / 100).toFixed(0)} 元`;
}

/**
 * 获取套餐定义（带价格来源说明）
 */
export function getPlanDefinition(planCode: string): PlanDefinition {
  return PLAN_DEFINITIONS[planCode as PlanCode] ?? PLAN_DEFINITIONS.free;
}

/**
 * 获取套餐价格（分）
 * @throws 如果价格尚未确认
 */
export function getPlanPrice(plan: PlanDefinition, billingCycle: "monthly" | "yearly"): number {
  if (plan.contactSales) {
    throw new Error("企业版请联系销售定制，不支持在线支付");
  }
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (price === null) {
    throw new Error(`套餐 ${plan.name} 的${billingCycle === "yearly" ? "年付" : "月付"}价格尚未确认，请联系客服`);
  }
  return price;
}

/**
 * 生成唯一订单号
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `L${timestamp}${random}`;
}
