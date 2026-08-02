// Link168 法律文档公共元数据
// 本文件供所有合规页面引用，避免硬编码不一致

export const COMPANY_NAME = "合肥造梦哈勃文化传媒有限公司";
export const COMPANY_NAME_FULL = "合肥造梦哈勃文化传媒有限公司";
export const APP_NAME = "Link168";
export const APP_URL = "https://link168.me";
export const ICP_NUMBER = "皖ICP备2026018031号-1";
export const ICP_LINK = "https://beian.miit.gov.cn/";

// 公安备案：当前无真实编号，不展示
export const GONGAN_NUMBER: string | null = null;
export const GONGAN_LINK: string | null = null;

export const COPYRIGHT_YEAR = "2026";
export const LEGAL_VERSION = "v1.0";
export const LEGAL_EFFECTIVE_DATE = "2026-07-05";
export const LEGAL_UPDATE_DATE = "2026-07-05";

// 客服信息：当前未配置真实邮箱，页面中动态判断是否展示
export const SUPPORT_EMAIL: string = "business@link168.me";

export const PUBLIC_PLANS = [
  { code: "free", name: "免费版", priceYearlyCents: 0, aiChatsPerMonth: 0 },
  { code: "plus", name: "Plus 会员", priceMonthlyCents: 6900, priceYearlyCents: 59900, aiChatsPerMonth: 800 },
  { code: "pro", name: "Pro 会员", priceMonthlyCents: 13900, priceYearlyCents: 99900, aiChatsPerMonth: 3000 },
  { code: "enterprise", name: "企业版", priceYearlyCents: 880000, aiChatsPerMonth: 15000, contactSales: true },
  { code: "enterprise_pro", name: "企业 Pro", priceYearlyCents: 1980000, aiChatsPerMonth: 50000, contactSales: true },
];

export const PAYMENT_CHANNELS = ["支付宝"];

export function formatPriceYuan(cents: number | null): string {
  if (cents === null) return "联系销售";
  if (cents === 0) return "免费";
  return `${(cents / 100).toFixed(0)} 元/年`;
}
