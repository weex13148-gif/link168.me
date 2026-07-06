// Showcase 外部尽调整改 —— 统一结构化配置内核
// 三种受众模式（评委 / 投资人 / 政府）共用此数据源，只改变排序和叙事。
// 价格、套餐引用正式业务配置，禁止另建冲突数据。

import { PLAN_DEFINITIONS, PUBLIC_PLAN_ORDER, formatPriceDisplay } from "@/lib/billing/plans";

// ============================================================
// 1) 项目基础信息
// ============================================================

export const SHOWCASE_PROJECT = {
  name: "Link168",
  tagline: "AI 经营名片平台",
  fullName: "Link168：面向中文创作者、小商家和一人公司的 AI 经营名片平台",
  version: "V2.1.0-showcase",
  updatedAt: "2026-07-03",
  domain: "link168.me",
  icp: "未备案", // 仅在真实备案完成后修改
  officialUrl: "https://link168.me",
  demoAccount: {
    username: "demo",
    password: "评委可向项目方索取演示账号",
    note: "演示账号仅限比赛评审使用，每日重置数据",
  },
  company: {
    name: "待补充主体名称",
    legalRep: "待补充",
    regNo: "待补充",
    contactEmail: "business@link168.me",
  },
  team: {
    leader: "项目负责人",
    size: "初创团队",
  },
} as const;

// ============================================================
// 2) 产品状态（已完成 / 内测中 / 规划中）
// ============================================================

export type ProductStatus = "completed" | "beta" | "planned" | "current" | "demo" | "pending";

export type ProductCapability = {
  name: string;
  status: ProductStatus;
  note: string;
  href?: string;
  loginRequired?: boolean;
};

export const PRODUCT_CAPABILITIES: ProductCapability[] = [
  // 已完成
  { name: "用户注册与邮箱验证", status: "completed", note: "真实六位验证码，支持找回密码", href: "/register" },
  { name: "Dashboard 名片编辑", status: "completed", note: "头像、简介、联系方式、链接管理", href: "/dashboard", loginRequired: true },
  { name: "公开主页与 Username", status: "completed", note: "自有用户名形成可分享入口", href: "/[username]" },
  { name: "链接管理与二维码", status: "completed", note: "无限链接、短链、二维码分享", href: "/dashboard", loginRequired: true },
  { name: "主题与壁纸装修", status: "completed", note: "6 款免费主题 + 高级主题", href: "/dashboard", loginRequired: true },
  { name: "访问统计（PV/UV）", status: "completed", note: "ProfileVisit 数据模型与基础数据看板", href: "/dashboard", loginRequired: true },
  { name: "Workbench 后台治理", status: "completed", note: "用户管理、举报、日志、系统配置", href: "/jeepwork", loginRequired: true },
  { name: "内容举报与审核", status: "completed", note: "前端举报入口 + 后台治理闭环", href: "/report" },
  { name: "会员与订阅系统", status: "completed", note: "套餐体系、订单、支付闭环", href: "/pricing" },
  { name: "AI 经营助理架构", status: "completed", note: "5 大 Agent 后端与前端演示入口", href: "/enterprise-ai", loginRequired: true },
  // 内测中
  { name: "AI 接待对话", status: "beta", note: "阿里云百炼后端代理，浏览器不接触 API Key", href: "/enterprise-ai", loginRequired: true },
  { name: "客户线索收集", status: "beta", note: "留资表单与 Workbench 线索看板", href: "/dashboard", loginRequired: true },
  { name: "数据分析中心", status: "beta", note: "访问来源、设备、点击热图", href: "/dashboard", loginRequired: true },
  { name: "vCard 导出与联系人", status: "beta", note: "名片信息一键导出", href: "/[username]" },
  // 规划中
  { name: "销售顾问 Agent", status: "planned", note: "客户沟通、需求判断与跟进建议", href: undefined },
  { name: "正式支付开放", status: "planned", note: "支付宝沙箱已完成，正式入口待开放", href: "/pricing" },
  { name: "企业知识库", status: "planned", note: "多产品、多知识空间", href: undefined },
  { name: "多语言 i18n", status: "planned", note: "中文、英文、日文框架已搭，待完整翻译", href: undefined },
];

export function capabilitiesByStatus(status: ProductStatus) {
  return PRODUCT_CAPABILITIES.filter((c) => c.status === status);
}

// ============================================================
// 3) 产品链接（五分钟路径）
// ============================================================

export type ExperienceStep = {
  step: number;
  title: string;
  entry: string;
  target: string;
  estimatedMinutes: number;
  status: ProductStatus;
  href?: string;
  loginRequired?: boolean;
};

export const FIVE_MINUTE_PATH: ExperienceStep[] = [
  { step: 1, title: "进入或登录", entry: "首页 /register", target: "完成注册并收到邮箱验证码", estimatedMinutes: 1, status: "completed", href: "/register" },
  { step: 2, title: "创建或查看名片", entry: "Dashboard /dashboard", target: "设置头像、用户名、简介、联系方式", estimatedMinutes: 1, status: "completed", href: "/dashboard", loginRequired: true },
  { step: 3, title: "添加模块与链接", entry: "Dashboard 链接管理", target: "添加至少两条真实链接并保存", estimatedMinutes: 1, status: "completed", href: "/dashboard", loginRequired: true },
  { step: 4, title: "选择壁纸主题", entry: "Dashboard 主题面板", target: "切换主题并实时预览", estimatedMinutes: 0.5, status: "completed", href: "/dashboard", loginRequired: true },
  { step: 5, title: "查看公开主页", entry: "/[username]", target: "确认页面在手机和桌面正常显示", estimatedMinutes: 0.5, status: "completed", href: "/demo" },
  { step: 6, title: "使用 AI 接待", entry: "/enterprise-ai", target: "选择财税/法务/市场/设计/社媒助理并提问", estimatedMinutes: 1, status: "beta", href: "/enterprise-ai", loginRequired: true },
  { step: 7, title: "模拟留资", entry: "公开主页联系模块", target: "填写联系方式并查看线索收集", estimatedMinutes: 0.5, status: "beta", href: "/demo" },
  { step: 8, title: "查看治理与后台", entry: "超级管理员后台 /jeepwork", target: "用户、举报、日志、系统配置", estimatedMinutes: 1, status: "completed", href: "/jeepwork", loginRequired: true },
];

// ============================================================
// 4) 套餐与收入来源（引用正式配置）
// ============================================================

export function getShowcasePlans() {
  return PUBLIC_PLAN_ORDER.map((code) => {
    const def = PLAN_DEFINITIONS[code];
    return {
      code: def.code,
      name: def.name,
      description: def.description,
      priceDisplayYearly: formatPriceDisplay(code, "yearly"),
      priceDisplayMonthly: formatPriceDisplay(code, "monthly"),
      features: def.features,
      limits: def.limits,
      highlight: def.highlight,
      contactSales: def.contactSales,
    };
  });
}

export function getShowcaseRevenueModel() {
  return [
    { name: "免费版", price: "0 元", note: "公开主页、基础链接、二维码、免费主题", stage: "已完成" },
    { name: "Pro 年付", price: formatPriceDisplay("pro", "yearly"), note: "产品展示、线索、AI 接待、知识库", stage: "已完成" },
    { name: "企业版", price: "联系销售", note: "品牌定制、独立域名、团队、企业 AI", stage: "已完成" },
    { name: "AI 服务消耗", price: "按 Credits 计费", note: "每月重置，Pro/企业版含基础额度", stage: "内测中" },
  ];
}

// ============================================================
// 5) 进度与里程碑
// ============================================================

export type ProgressItem = {
  phase: string;
  items: string[];
  status: ProductStatus;
};

export const PROGRESS_MILESTONES: ProgressItem[] = [
  {
    phase: "已完成",
    status: "completed",
    items: [
      "注册登录、邮箱验证、找回密码",
      "Dashboard 名片编辑、链接管理、主题装修",
      "公开主页、Username、二维码分享",
      "访问统计（PV/UV/点击）数据看板",
      "会员体系、订单系统、支付闭环",
      "Workbench 后台治理、举报、日志",
      "AI 助理后端架构与 5 大演示入口",
    ],
  },
  {
    phase: "内测中",
    status: "beta",
    items: [
      "AI 接待对话（阿里云百炼代理）",
      "客户线索收集与整理",
      "数据分析中心",
      "vCard 导出",
      "支付宝沙箱支付测试",
    ],
  },
  {
    phase: "规划中",
    status: "planned",
    items: [
      "销售顾问 Agent",
      "正式支付对外开放",
      "企业知识库多空间",
      "完整 i18n 多语言",
      "小程序与 H5 适配",
    ],
  },
];

// ============================================================
// 6) 技术实现摘要
// ============================================================

export const TECH_SUMMARY = {
  stack: ["Next.js 16 (App Router)", "TypeScript", "Tailwind CSS", "Prisma ORM", "PostgreSQL", "PM2 + Nginx"],
  aiStack: ["阿里云百炼 (通义千问)", "后端代理调用", "流式/非流式兼容", "每日限流 + 全局限流"],
  deployment: ["GitHub Actions Linux 构建", "Standalone 输出", "阿里云 ECS 部署", "Nginx 反向代理"],
  security: ["bcrypt 密码哈希", "AES-256-GCM 敏感配置加密", "IP 脱敏 + 行为日志", "内容举报与人工审核"],
  repo: "私有仓库（比赛期间不公开）",
  ciStatus: "master 分支通过 Prisma validate / TypeScript / Lint / Build",
} as const;

// ============================================================
// 7) 合规资料
// ============================================================

export const COMPLIANCE_MATERIALS = [
  { name: "用户协议", status: "已完成", href: "/terms" },
  { name: "隐私政策", status: "已完成", href: "/privacy" },
  { name: "内容举报入口", status: "已完成", href: "/report" },
  { name: "ICP 备案", status: "规划中", note: "主体确认后提交" },
  { name: "公安备案", status: "规划中", note: "ICP 完成后跟进" },
  { name: "AI 生成内容标识", status: "已完成", note: "AI 回答底部标注'由 AI 生成，仅供参考'" },
  { name: "支付安全审计", status: "内测中", note: "支付宝沙箱验证通过，正式待开放" },
];

// ============================================================
// 8) 证据材料清单（禁止编造）
// ============================================================

export type EvidenceItem = {
  id: string;
  name: string;
  category: "screenshot" | "video" | "record" | "feedback" | "other";
  provided: boolean;
  description: string;
  fileId?: string; // CompetitionFile id，若已上传
};

export const EVIDENCE_INVENTORY: EvidenceItem[] = [
  { id: "ev-home", name: "首页截图", category: "screenshot", provided: false, description: "产品首页 1440px 与 390px" },
  { id: "ev-dashboard", name: "后台截图", category: "screenshot", provided: false, description: "Dashboard 名片编辑页" },
  { id: "ev-modules", name: "模块编辑截图", category: "screenshot", provided: false, description: "添加/编辑模块流程" },
  { id: "ev-theme", name: "壁纸装修截图", category: "screenshot", provided: false, description: "主题切换与预览" },
  { id: "ev-profile", name: "公开主页截图", category: "screenshot", provided: false, description: "公开主页 1440px 与 390px" },
  { id: "ev-ai", name: "AI 接待截图", category: "screenshot", provided: false, description: "AI 助理对话窗口" },
  { id: "ev-payment", name: "订单或支付沙箱截图", category: "screenshot", provided: false, description: "沙箱支付成功页面" },
  { id: "ev-moderation", name: "内容审核截图", category: "screenshot", provided: false, description: "举报入口与后台处理" },
  { id: "ev-test", name: "测试记录", category: "record", provided: false, description: "功能测试与验收记录" },
  { id: "ev-git", name: "Git 提交记录", category: "record", provided: false, description: "关键功能开发 commit" },
  { id: "ev-demo-video", name: "演示视频", category: "video", provided: false, description: "3-5 分钟产品演示" },
  { id: "ev-judge-video", name: "评委备用视频", category: "video", provided: false, description: "离线可播放的备用演示" },
  { id: "ev-interview", name: "用户访谈", category: "feedback", provided: false, description: "早期使用者访谈记录" },
  { id: "ev-feedback", name: "早期使用反馈", category: "feedback", provided: false, description: "收集到的用户反馈汇总" },
  { id: "ev-intent", name: "合作意向", category: "other", provided: false, description: "潜在合作方沟通记录" },
];

// ============================================================
// 9) 三种受众模式差异化配置
// ============================================================

export type AudienceMode = "judge" | "investor" | "government";

export const AUDIENCE_META: Record<AudienceMode, { title: string; subtitle: string; badge: string; themeColor: string }> = {
  judge: {
    title: "评委专用展示",
    subtitle: "真实产品、演示路径、比赛资料与答辩准备",
    badge: "评委模式",
    themeColor: "#315F8C",
  },
  investor: {
    title: "投资人尽职调查",
    subtitle: "客户、收费、成本、获客与十二个月增长路径",
    badge: "投资人模式",
    themeColor: "#6F8F4E",
  },
  government: {
    title: "政府与园区合作",
    subtitle: "主体信息、数据安全、AI 治理与社会价值",
    badge: "政府模式",
    themeColor: "#8C612E",
  },
};

// ============================================================
// 10) Q&A（评委常见问答）
// ============================================================

export const JUDGE_QA = [
  {
    q: "产品当前真实用户数是多少？",
    a: "当前处于可收费验证型 MVP 阶段，正式对外开放注册不久，尚未进行大规模推广。所有用户数据均为真实注册，不编造数量。",
  },
  {
    q: "AI 能力是否已真实接入？",
    a: "5 大 AI 助理后端已接入阿里云百炼，通过后端代理调用，浏览器不接触 API Key。当前处于内测中，限额开放。",
  },
  {
    q: "支付功能是否可用？",
    a: "支付宝沙箱支付闭环已验证通过（0.01 元测试订单）。正式支付入口待完成主体确认后上线。",
  },
  {
    q: "与 Linktree 的核心差异？",
    a: "Linktree 侧重链接展示，Link168 侧重中文经营闭环：二维码、客户线索、AI 助理、后台治理一体化。",
  },
  {
    q: "数据安全如何保障？",
    a: "密码 bcrypt 哈希、敏感配置 AES-256-GCM 加密、全站行为日志、内容举报与人工审核、IP 脱敏存储。",
  },
];

// ============================================================
// 11) 投资人测算假设（必须标注为假设）
// ============================================================

export const INVESTOR_ASSUMPTIONS = [
  { label: "目标付费转化率", value: "3%–5%", note: "假设，基于 SaaS 行业常见区间" },
  { label: "Pro 套餐占比", value: "70%", note: "假设，企业版占比 20%、免费转付费周期 30 天" },
  { label: "单用户获客成本", value: "¥30–80", note: "假设，自然流量 + 内容获客为主" },
  { label: "AI 单次调用成本", value: "¥0.02–0.08", note: "假设，基于当前百炼 qwen-turbo 定价" },
  { label: "月运营成本", value: "¥3,000–5,000", note: "假设，含服务器、域名、AI 调用、基础工具" },
  { label: "十二个月目标", value: "验证 PMF 并达到收支平衡", note: "非承诺，仅为阶段目标" },
];

// ============================================================
// 12) 竞品对比
// ============================================================

export const COMPETITOR_COMPARISON = [
  { name: "Linktree", strength: "海外市场先发、品牌认知高", weakness: "中文经营链路弱、无 AI、无线索闭环", ourEdge: "中文场景 + AI + 经营闭环" },
  { name: "草料二维码", strength: "二维码工具成熟", weakness: "静态展示、无客户线索、无 AI", ourEdge: "动态主页 + 线索 + AI 助理" },
  { name: "vlink / 普通电子名片", strength: "名片展示", weakness: "静态页面、无经营能力", ourEdge: "可更新、可分析、可交互" },
  { name: "单一 AI 工具", strength: "AI 能力垂直", weakness: "不能与主页/线索/经营联动", ourEdge: "嵌入经营流程的 AI 架构" },
];

// ============================================================
// 13) 当前真实进展（一句话）
// ============================================================

export const CURRENT_STAGE_STATEMENT =
  "可收费验证型 MVP / PMF 前：核心主页闭环、会员体系、支付闭环、AI 架构、后台治理均已完成开发；当前处于内测验证阶段，尚未大规模获客。";

// ============================================================
// 14) 冷启动渠道与十二个月计划
// ============================================================

export const GROWTH_CHANNELS = [
  "小红书/公众号内容获客（创始人 IP + 使用教程）",
  "垂直社群种子用户（创作者、小商家、一人公司）",
  "线下活动与园区合作（名片交换场景）",
  "现有用户推荐裂变（免费版无门槛）",
];

export const TWELVE_MONTH_PLAN = [
  { month: "1–2", focus: "修复核心体验、完成多语言、开放正式支付", milestone: "达到 100 位真实注册用户" },
  { month: "3–4", focus: "AI 接待全面开放、完善线索跟进", milestone: "达到 500 位用户，10 位付费" },
  { month: "5–6", focus: "企业版内测、园区合作试点", milestone: "达到 2,000 位用户，50 位付费" },
  { month: "7–9", focus: "增长实验、内容矩阵、优化转化漏斗", milestone: "达到 5,000 位用户，200 位付费" },
  { month: "10–12", focus: "验证 PMF、完善服务、准备融资材料", milestone: "达到 10,000 位用户，500 位付费或收支平衡" },
];

// ============================================================
// 15) 壁垒
// ============================================================

export const CURRENT_BARRIERS = [
  "中文经营场景的深度适配（微信、小红书、抖音、线下二维码）",
  "AI 助理与经营流程的嵌入深度（非独立工具）",
  "后台治理与安全体系的完整性（举报、审计、日志、配置加密）",
  "已完成的闭环工程（注册-编辑-分享-数据-AI-支付）",
];

// ============================================================
// 16) 政府 / 园区合作
// ============================================================

export const GOVERNMENT_PLAN = {
  valueToSMEs: [
    "降低小商家数字化门槛：零代码创建经营主页",
    "降低获客成本：一张二维码替代传统传单和名片",
    "提升经营效率：AI 助理辅助财税、法务、设计、社媒运营",
  ],
  dataSecurity: [
    "用户密码 bcrypt 强哈希存储",
    "敏感配置 AES-256-GCM 服务端加密",
    "IP 脱敏 + 行为审计日志",
    "数据库定期备份，应用与数据分离",
  ],
  userPrivacy: [
    "用户可导出和删除个人数据",
    "隐私政策明确告知数据用途",
    "不售卖用户数据给第三方",
    "最小必要原则收集信息",
  ],
  aiGovernance: [
    "AI 回答底部标注'由 AI 生成，仅供参考'",
    "AI 请求经后端代理，浏览器不接触 API Key",
    "每日/每人限流，防止滥用",
    "不生成医疗、金融、法律确定性建议",
  ],
  contentGovernance: [
    "前端举报入口（/report）",
    "后台人工审核与状态机",
    "违规内容可下架、账号可封禁",
    "审计日志可追溯处理过程",
  ],
  paymentAudit: [
    "订单金额由服务端生成，不信任浏览器传入",
    "支付宝回调实现签名验证、订单校验、幂等保护",
    "支付测试仅限沙箱/小额/管理员",
  ],
  localLanding: [
    "为园区/孵化器提供批量免费账号",
    "开展'小商家数字化经营'培训",
    "联合举办创业沙龙与名片互换活动",
    "提供数据脱敏后的区域经营趋势报告",
  ],
};
