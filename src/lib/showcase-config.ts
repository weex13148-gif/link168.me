// Showcase 外部尽调统一结构化配置内核
// 三种受众模式共用同一套事实数据，但静态主体信息不会伪装成后台即时配置。
// 价格、套餐引用正式业务配置，禁止另建冲突数据。

import { PLAN_DEFINITIONS, PUBLIC_PLAN_ORDER, formatPriceDisplay } from "@/lib/billing/plans";

// ============================================================
// 1) 项目基础信息
// ============================================================

export const SHOWCASE_PROJECT = {
  name: "Link168",
  tagline: "AI 经营名片平台",
  fullName: "Link168：面向中文创作者、小商家和一人公司的 AI 经营名片平台",
  version: "V2.2.0-showcase",
  updatedAt: "2026-07-15",
  domain: "link168.me",
  icp: "皖ICP备2026018031号-1",
  officialUrl: "https://link168.me",
  company: {
    name: "合肥造梦哈勃文化传媒有限公司",
    unifiedSocialCreditCode: "91340104MADEECUN15",
    legalRep: "齐帅",
    registeredCapital: "人民币 5 万元",
    establishedAt: "2024年4月1日",
    registeredRegion: "安徽省合肥市蜀山区",
    contactEmail: "business@link168.me",
    logoUrl: "/company/zaomeng-hubble-logo.webp",
  },
  team: {
    leader: "齐帅",
    size: "一人公司 / AI 协作开发",
  },
} as const;

// ============================================================
// 2) 产品状态（代码完成 / 待生产验证 / 内测 / 规划）
// ============================================================

export type ProductStatus =
  | "completed"
  | "pending_validation"
  | "beta"
  | "planned"
  | "current"
  | "demo"
  | "pending";

export type ProductCapability = {
  name: string;
  status: ProductStatus;
  note: string;
  href?: string;
  loginRequired?: boolean;
};

export const PRODUCT_CAPABILITIES: ProductCapability[] = [
  // 代码与自动测试已通过
  { name: "账号注册、登录与找回密码", status: "completed", note: "账号流程代码与自动测试已通过；真实邮件发送单独列为待生产验证", href: "/register" },
  { name: "统一用户控制台", status: "completed", note: "通过 /console 进入名片、组件、产品、线索与分析主线", href: "/console", loginRequired: true },
  { name: "公开主页与 Username", status: "completed", note: "发布、下线、隐私过滤和手机端渲染已通过自动测试", href: "/" },
  { name: "经营组件与链接", status: "completed", note: "链接、产品、服务、报价与联系表单支持新增、编辑、排序、隐藏和删除", href: "/console", loginRequired: true },
  { name: "客户线索 Lead", status: "completed", note: "公开咨询、产品快照、租户隔离和状态数据已通过自动测试", href: "/console", loginRequired: true },
  { name: "基础访问与转化分析", status: "completed", note: "访问、咨询、留资和转化指标来自真实事件记录", href: "/console", loginRequired: true },
  { name: "超级管理员治理后台", status: "completed", note: "用户、主页、举报、审计、配置与服务状态仅限 super_admin", href: "/jeepwork", loginRequired: true },
  { name: "内容举报与审核", status: "completed", note: "公开举报入口与后台处理状态闭环已接入", href: "/report" },

  // 代码已接入，仍待真实生产环境验证
  { name: "阿里云邮件发送", status: "pending_validation", note: "验证码与找回密码代码已接入，待生产账号配置和真实收发验证", href: "/register" },
  { name: "阿里百炼 AI 调用", status: "pending_validation", note: "后端代理、权限与额度逻辑已接入，待生产密钥和真实模型调用验证", href: "/console", loginRequired: true },
  { name: "支付宝支付与查单", status: "pending_validation", note: "订单、验签和幂等代码已保留，待生产商户配置和真实链路验证", href: "/pricing" },
  { name: "对象存储", status: "pending_validation", note: "媒体生命周期和所有权校验已通过测试，待真实上传、替换和删除验证", href: "/console", loginRequired: true },
  { name: "企业域名与 HTTPS", status: "pending_validation", note: "Host fail-closed 已通过测试，待真实 DNS、证书和域名绑定验证" },
  { name: "生产服务器与数据库", status: "pending_validation", note: "GitHub CI 已通过，不等同于服务器部署和生产数据库验证" },

  // 内测中
  { name: "高级数据分析", status: "beta", note: "访问来源、设备和更长周期报表继续内测", href: "/console", loginRequired: true },
  { name: "vCard 导出", status: "beta", note: "联系人导出继续验证隐私和公开状态联动" },

  // 下一阶段
  { name: "销售顾问 Agent", status: "planned", note: "客户沟通、需求判断与跟进建议" },
  { name: "真实退款与自动到期降级", status: "planned", note: "正式开放支付前完成真实退款接口和自动任务" },
  { name: "企业知识库多空间", status: "planned", note: "多产品、多知识空间和成员权限" },
  { name: "完整多语言", status: "planned", note: "中文、英文和日文完整内容与验收" },
];

export function capabilitiesByStatus(status: ProductStatus) {
  return PRODUCT_CAPABILITIES.filter((capability) => capability.status === status);
}

// ============================================================
// 3) 五分钟体验路径
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
  { step: 1, title: "了解产品定位", entry: "Link168 首页", target: "理解 AI 经营名片、经营组件和客户线索价值", estimatedMinutes: 0.5, status: "completed", href: "/" },
  { step: 2, title: "注册或登录", entry: "注册 / 登录", target: "进入真实账号流程；现场可由项目负责人登录测试账号", estimatedMinutes: 0.5, status: "completed", href: "/register" },
  { step: 3, title: "进入统一控制台", entry: "控制台 /console", target: "查看名片、产品、线索、分析和账号入口", estimatedMinutes: 0.5, status: "completed", href: "/console", loginRequired: true },
  { step: 4, title: "编辑经营名片", entry: "控制台名片与组件", target: "设置资料并添加产品、服务、报价或联系表单", estimatedMinutes: 1, status: "completed", href: "/console", loginRequired: true },
  { step: 5, title: "发布公开主页", entry: "已保存的公开地址", target: "确认手机端展示、隐私状态、二维码和原始链接跳转", estimatedMinutes: 0.5, status: "completed", loginRequired: true },
  { step: 6, title: "提交访客咨询", entry: "公开主页联系组件", target: "提交真实测试咨询并形成 Lead 与产品快照", estimatedMinutes: 0.5, status: "completed" },
  { step: 7, title: "查看线索与分析", entry: "控制台 /console", target: "查看咨询、留资、访问与转化数据", estimatedMinutes: 0.5, status: "completed", href: "/console", loginRequired: true },
  { step: 8, title: "查看平台治理", entry: "超级管理员后台 /jeepwork", target: "查看用户、举报、日志、外部服务状态和比赛中心", estimatedMinutes: 1, status: "completed", href: "/jeepwork", loginRequired: true },
];

// ============================================================
// 4) 套餐与收入来源（引用正式配置）
// ============================================================

export function getShowcasePlans() {
  return PUBLIC_PLAN_ORDER.map((code) => {
    const definition = PLAN_DEFINITIONS[code];
    return {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      priceDisplayYearly: formatPriceDisplay(code, "yearly"),
      priceDisplayMonthly: formatPriceDisplay(code, "monthly"),
      features: definition.features,
      limits: definition.limits,
      highlight: definition.highlight,
      contactSales: definition.contactSales,
    };
  });
}

export function getShowcaseRevenueModel() {
  return [
    { name: "免费版", price: "0 元", note: "基础经营名片、组件、二维码、线索与基础分析", stage: "代码已完成" },
    { name: "Pro 年付", price: formatPriceDisplay("pro", "yearly"), note: "高级组件、数据和 AI 权益按正式套餐配置", stage: "支付待生产验证" },
    { name: "企业版", price: "联系销售", note: "成员、品牌、域名和企业知识能力", stage: "企业域名待生产验证" },
    { name: "AI 服务消耗", price: "按 Credits 计费", note: "权益与额度代码已接入，真实百炼调用待验证", stage: "待生产配置验证" },
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
    phase: "代码与自动测试已通过",
    status: "completed",
    items: [
      "注册、登录、找回密码和会话边界",
      "统一控制台、经营名片、组件和公开主页",
      "Lead、产品快照、租户隔离和基础分析",
      "Jeepwork 超级管理员权限、举报、审计和外部服务状态",
      "Prisma、TypeScript、ESLint、Jest 与生产构建门禁",
    ],
  },
  {
    phase: "待生产配置验证",
    status: "pending_validation",
    items: [
      "阿里云邮件真实发送",
      "阿里百炼真实调用",
      "支付宝真实查单、验签和支付",
      "对象存储真实上传、替换和删除",
      "企业域名、DNS、HTTPS、生产服务器与生产数据库",
    ],
  },
  {
    phase: "内测中",
    status: "beta",
    items: [
      "高级数据分析",
      "vCard 与公开隐私联动",
      "AI 接待内容质量和经营工作流",
    ],
  },
  {
    phase: "下一阶段",
    status: "planned",
    items: [
      "正式退款和会员自动到期降级",
      "销售顾问 Agent",
      "企业知识库多空间",
      "完整多语言与更多终端适配",
    ],
  },
];

// ============================================================
// 6) 技术实现摘要
// ============================================================

export const TECH_SUMMARY = {
  stack: ["Next.js 16 (App Router)", "TypeScript", "Tailwind CSS", "Prisma ORM", "PostgreSQL", "PM2 + Nginx"],
  aiStack: ["阿里百炼接口适配", "服务端代理", "权益与额度判断", "真实生产调用待配置验证"],
  deployment: ["GitHub Actions Linux 构建", "Standalone 输出", "目标主站：腾讯云轻量服务器", "目标数据库：阿里云 PostgreSQL"],
  security: ["bcrypt 密码哈希", "AES-256-GCM 敏感配置加密", "IP 脱敏 + 行为日志", "内容举报与人工审核"],
  repo: "GitHub 仓库保留完整提交和自动验证记录",
  ciStatus: "master 精确版本已通过 Prisma / TypeScript / ESLint / Jest / Build；尚未等同生产部署通过",
} as const;

// ============================================================
// 7) 合规资料
// ============================================================

export const COMPLIANCE_MATERIALS = [
  { name: "用户协议", status: "已完成", href: "/terms" },
  { name: "隐私政策", status: "已完成", href: "/privacy" },
  { name: "内容举报入口", status: "已完成", href: "/report" },
  { name: "ICP 备案", status: "已完成", note: SHOWCASE_PROJECT.icp },
  { name: "公司主体", status: "已完成", note: `${SHOWCASE_PROJECT.company.name} · ${SHOWCASE_PROJECT.company.unifiedSocialCreditCode}` },
  { name: "AI 生成内容标识", status: "代码已接入", note: "真实 AI 调用仍待生产配置验证" },
  { name: "支付安全", status: "待生产验证", note: "代码与自动测试不替代真实支付宝商户链路验证" },
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
  fileId?: string;
};

export const EVIDENCE_INVENTORY: EvidenceItem[] = [
  { id: "ev-home", name: "首页截图", category: "screenshot", provided: false, description: "产品首页 1440px 与 390px" },
  { id: "ev-console", name: "控制台截图", category: "screenshot", provided: false, description: "统一控制台与名片编辑页" },
  { id: "ev-modules", name: "模块编辑截图", category: "screenshot", provided: false, description: "添加、编辑、排序和隐藏模块流程" },
  { id: "ev-profile", name: "公开主页截图", category: "screenshot", provided: false, description: "公开主页 1440px 与 390px" },
  { id: "ev-lead", name: "线索闭环截图", category: "screenshot", provided: false, description: "公开咨询与控制台 Lead" },
  { id: "ev-ai", name: "AI 接待截图", category: "screenshot", provided: false, description: "仅在真实百炼配置验证后提供" },
  { id: "ev-payment", name: "支付验证截图", category: "screenshot", provided: false, description: "仅在真实支付宝链路验证后提供" },
  { id: "ev-moderation", name: "内容审核截图", category: "screenshot", provided: false, description: "举报入口与后台处理" },
  { id: "ev-test", name: "测试记录", category: "record", provided: false, description: "功能测试与发布门禁记录" },
  { id: "ev-git", name: "Git 提交记录", category: "record", provided: false, description: "关键功能开发 commit" },
  { id: "ev-demo-video", name: "演示视频", category: "video", provided: false, description: "3–5 分钟产品演示" },
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
    subtitle: "真实产品、体验路径、证据状态与答辩准备",
    badge: "评委模式",
    themeColor: "#315F8C",
  },
  investor: {
    title: "投资人尽职调查",
    subtitle: "客户、收费假设、成本、获客与十二个月增长路径",
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
    a: "当前处于 MVP 内测验证阶段，尚未进行大规模推广。后台只展示真实注册和业务数据，不编造用户数量。",
  },
  {
    q: "AI 能力是否已真实接入？",
    a: "百炼服务端代理、权益、额度和失败补偿代码已经接入并通过自动测试；生产密钥和真实模型调用仍待上线后配置验证，因此页面明确标记为待生产配置验证。",
  },
  {
    q: "支付功能是否可用？",
    a: "套餐、订单、验签和幂等代码已经保留并通过自动测试，但真实支付宝商户查单、回调和付款尚未在生产环境验证，当前不宣称正式支付已上线。",
  },
  {
    q: "与 Linktree 的核心差异？",
    a: "Linktree 侧重链接展示，Link168 侧重中文经营闭环：经营组件、二维码、客户线索、分析、AI 接待架构和后台治理一体化。",
  },
  {
    q: "数据安全如何保障？",
    a: "密码 bcrypt 哈希、敏感配置服务端加密、租户隔离、行为审计、内容举报和 IP 脱敏等边界已写入代码与测试；生产环境仍需继续做配置和运营验收。",
  },
];

// ============================================================
// 11) 投资人测算假设（必须标注为假设）
// ============================================================

export const INVESTOR_ASSUMPTIONS = [
  { label: "目标付费转化率", value: "3%–5%", note: "经营假设，不代表当前结果" },
  { label: "Pro 套餐占比", value: "70%", note: "经营假设，需用真实付费数据验证" },
  { label: "单用户获客成本", value: "¥30–80", note: "经营假设，以内容和社群获客为主" },
  { label: "AI 单次调用成本", value: "¥0.02–0.08", note: "估算区间，最终以百炼真实账单为准" },
  { label: "月运营成本", value: "¥3,000–5,000", note: "估算，含服务器、域名、AI 和基础工具" },
  { label: "十二个月目标", value: "验证 PMF 并达到收支平衡", note: "阶段目标，不构成承诺" },
];

// ============================================================
// 12) 竞品对比
// ============================================================

export const COMPETITOR_COMPARISON = [
  { name: "Linktree", strength: "海外市场先发、品牌认知高", weakness: "中文经营链路和本地治理较弱", ourEdge: "中文场景 + 经营组件 + Lead + AI 架构" },
  { name: "草料二维码", strength: "二维码工具成熟", weakness: "重点不是个人经营闭环", ourEdge: "动态主页 + 线索 + 分析 + AI 接待" },
  { name: "vlink / 普通电子名片", strength: "名片展示", weakness: "经营组件、线索和治理能力有限", ourEdge: "可更新、可分析、可交互" },
  { name: "单一 AI 工具", strength: "AI 能力垂直", weakness: "不能与公开主页、线索和经营流程联动", ourEdge: "将 AI 嵌入经营主页与客户闭环" },
];

// ============================================================
// 13) 当前真实进展（一句话）
// ============================================================

export const CURRENT_STAGE_STATEMENT =
  "MVP 代码与自动测试已完成收口：经营名片、组件、Lead、基础分析和超级管理员治理已进入 master；外部服务、生产服务器和生产数据库仍待配置与真实验证。";

// ============================================================
// 14) 冷启动渠道与十二个月计划
// ============================================================

export const GROWTH_CHANNELS = [
  "小红书 / 公众号内容获客（创始人 IP + 使用教程）",
  "垂直社群种子用户（创作者、小商家、一人公司）",
  "线下活动与园区合作（名片交换和经营主页场景）",
  "真实用户推荐与案例传播",
];

export const TWELVE_MONTH_PLAN = [
  { month: "1–2", focus: "生产部署、外部服务验证和核心体验修复", milestone: "获得首批真实内测用户" },
  { month: "3–4", focus: "AI 接待内测和线索跟进优化", milestone: "验证注册、发布、留资和回访漏斗" },
  { month: "5–6", focus: "企业版试点与园区合作", milestone: "形成可复用行业案例" },
  { month: "7–9", focus: "增长实验和转化优化", milestone: "验证稳定获客渠道与付费意愿" },
  { month: "10–12", focus: "验证 PMF、完善服务和成本模型", milestone: "以真实收入和留存决定扩张节奏" },
];

// ============================================================
// 15) 壁垒
// ============================================================

export const CURRENT_BARRIERS = [
  "中文经营场景适配（微信、小红书、抖音和线下二维码）",
  "公开主页、经营组件、Lead 与分析形成的完整数据链路",
  "AI 权益、额度、失败补偿和经营流程的服务端边界",
  "超级管理员治理、举报、审计和外部服务状态体系",
];

// ============================================================
// 16) 政府 / 园区合作
// ============================================================

export const GOVERNMENT_PLAN = {
  valueToSMEs: [
    "降低小商家数字化门槛：零代码创建经营主页",
    "降低获客成本：一张二维码承载持续更新的经营信息",
    "提升经营效率：用组件、线索和 AI 辅助减少重复工作",
  ],
  dataSecurity: [
    "用户密码 bcrypt 强哈希存储",
    "敏感配置服务端加密",
    "IP 脱敏 + 行为审计日志",
    "应用与数据分离，生产备份策略待部署验收",
  ],
  userPrivacy: [
    "公开状态和联系方式可见性由用户控制",
    "隐私政策明确告知数据用途",
    "不向广告商出售用户数据",
    "按最小必要原则收集信息",
  ],
  aiGovernance: [
    "AI 回答明确标注由 AI 生成并仅供参考",
    "AI 请求由服务端代理，浏览器不接触 API Key",
    "权益、额度和失败补偿由服务端判断",
    "真实百炼服务需完成生产配置后再开放",
  ],
  contentGovernance: [
    "前端举报入口（/report）",
    "后台人工审核与状态机",
    "违规内容可下架，账号可限制",
    "审计日志可追溯处理过程",
  ],
  paymentAudit: [
    "订单金额由服务端生成，不信任浏览器传入",
    "回调代码包含签名验证、订单校验和幂等保护",
    "真实支付宝链路未验证前不宣称正式支付上线",
  ],
  localLanding: [
    "为园区和孵化器提供小商家数字化工具试点",
    "开展经营主页与 AI 工具培训",
    "联合举办创业和产品体验活动",
    "在获得授权和完成脱敏后提供汇总分析",
  ],
};
