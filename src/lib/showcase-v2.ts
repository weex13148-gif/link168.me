import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  AI_ASSISTANTS,
  DEFAULT_CONFIG,
  getConfig,
  type AiAssistantKey,
} from "@/lib/app-config";
import {
  SHOWCASE_V2_SECTIONS,
  SHOWCASE_V2_SECTION_LABELS,
  type ShowcaseV2Bullet,
  type ShowcaseV2Stat,
  type ShowcaseV2SectionKey,
  type ShowcaseV2SectionMeta,
  type ShowcaseV2Content,
  type ShowcaseV2Sequence,
  type ShowcaseV2PublicPayload,
} from "@/lib/showcase-v2-shared";

// 比赛展示页面 V2 核心库
// 依赖：Prisma 模型 ShowcaseContent / ShowcaseSequence / ShowcaseAIDemoCall /
//       ShowcaseAIDebugLog / ShowcasePromptDraft
// 安全：API Key 只在服务端使用，前端只读取脱敏配置

// 重新导出共享类型与常量，保持对外 API 兼容。
export {
  SHOWCASE_V2_SECTIONS,
  SHOWCASE_V2_SECTION_LABELS,
  type ShowcaseV2Bullet,
  type ShowcaseV2Stat,
  type ShowcaseV2SectionKey,
  type ShowcaseV2SectionMeta,
  type ShowcaseV2Content,
  type ShowcaseV2Sequence,
  type ShowcaseV2PublicPayload,
};

// ============================================================
// 2) 9 个章节的默认内容（首次启动时 seed 进数据库）
// ============================================================

const SHOWCASE_V2_DEFAULT_BULLETS: Record<ShowcaseV2SectionKey, ShowcaseV2Bullet[]> = {
  opening: [
    { title: "AI 经营名片平台", description: "为中文创作者、小商家和一人公司而设计", icon: "spark" },
    { title: "公域 → 私域 → 经营", description: "一张二维码承载完整经营闭环", icon: "loop" },
  ],
  painPoints: [
    { title: "流量分散", description: "公域平台算法变动让账号主们疲于应对", icon: "scatter" },
    { title: "私域承接困难", description: "粉丝导入微信后缺乏统一经营入口", icon: "leak" },
    { title: "自媒体不会经营", description: "有内容能力，无客户运营、产品、变现经验", icon: "creator" },
    { title: "小商家缺少团队", description: "财税、法务、设计、市场、内容难以全部雇佣", icon: "team" },
    { title: "传统名片只能展示", description: "静态名片不能形成线索、跟进、复购闭环", icon: "card" },
  ],
  solution: [
    { title: "公域流量", description: "公众号 / 小红书 / 抖音 / 视频号统一引流" },
    { title: "二维码数字名片", description: "扫码直达个人主页和经营组件" },
    { title: "个人主页", description: "展示产品、链接、服务、联系方式" },
    { title: "客户咨询 → Lead 线索", description: "自动归集、跟进、状态机" },
    { title: "Workbench 跟进", description: "一站式查看线索、改状态、记录沟通" },
    { title: "五大 AI 助理", description: "财税 / 法务 / 市场 / 设计 / 社媒" },
  ],
  productDemo: [
    { title: "首页与注册登录", description: "手机号或邮箱一键开始" },
    { title: "Dashboard 名片编辑", description: "头像、简介、联系方式、链接" },
    { title: "公开主页", description: "自有 Username 形成可分享入口" },
    { title: "产品展示", description: "上架商品、详情、咨询" },
    { title: "Workbench", description: "线索、订单、内容草稿" },
    { title: "Analytics", description: "访问、来源、设备、停留" },
    { title: "AI 助理", description: "经营侧 AI 内测" },
    { title: "超级管理员后台", description: "治理、审计、配置中心" },
  ],
  aiAssistants: [
    { title: AI_ASSISTANTS.tax, description: "小规模纳税人的财税提醒与发票建议", icon: "tax" },
    { title: AI_ASSISTANTS.legal, description: "合同要点审阅、合规清单", icon: "legal" },
    { title: AI_ASSISTANTS.market, description: "竞品调研、用户画像与机会点", icon: "market" },
    { title: AI_ASSISTANTS.design, description: "海报 / 封面 / 头像快速生成", icon: "design" },
    { title: AI_ASSISTANTS.social, description: "公众号 / 小红书 / 视频号选题与改写", icon: "social" },
  ],
  businessModel: [
    { title: "免费数字名片", description: "获客入口", value: "0 元" },
    { title: "会员基础版", description: "更多经营组件、样式、数据", value: "¥ ?" },
    { title: "会员 Plus", description: "AI 创作、AI 经营（限额）", value: "¥ ?" },
    { title: "企业版", description: "成员、权限、企业知识库、定制服务", value: "¥ ?/年起" },
    { title: "AI 服务消耗", description: "按调用或 Token 计费", value: "按量" },
    { title: "团队服务", description: "外包经营顾问 + 平台工具", value: "咨询" },
  ],
  competition: [
    { title: "Linktree", description: "海外工具，中文经营链路弱，缺少 AI" },
    { title: "草料二维码", description: "二维码静态展示，无客户线索闭环" },
    { title: "vlink / 普通电子名片", description: "静态页面，无 AI 经营能力" },
    { title: "单一 AI 工具", description: "不能与公开主页 / 线索 / 经营联动" },
    { title: "Link168", description: "流量承接 + 客户线索 + AI 经营 完整闭环" },
  ],
  progress: [
    { title: "已上线", description: "注册登录、名片编辑、链接管理、二维码、Workbench、举报治理、文件管理", icon: "check" },
    { title: "内测中", description: "AI 经营助理、AI 创作、Analytics、Workbench 业务闭环", icon: "loading" },
    { title: "下一阶段", description: "AI 服务计费、CRM 跟进建议、会员与商业化", icon: "next" },
    { title: "商业化", description: "会员基础 / Plus / 企业版 / AI 服务 / 团队服务", icon: "money" },
  ],
  ending: [
    { title: "项目名称", description: "Link168" },
    { title: "团队 / 公司", description: "可在后台「比赛中心 → 团队信息」修改" },
    { title: "联系方式", description: "可在后台「比赛中心 → 联系方式」修改" },
    { title: "官方二维码", description: "由后台文件中心主文件提供" },
  ],
};

const SHOWCASE_V2_DEFAULT_STATS: Record<ShowcaseV2SectionKey, ShowcaseV2Stat[]> = {
  opening: [
    { label: "核心定位", value: "AI 经营名片平台" },
    { label: "用户群体", value: "创作者 / 小商家 / 一人公司" },
    { label: "完成度", value: "见 § 项目进展" },
  ],
  painPoints: [
    { label: "公域投放失效", value: "≥70%", hint: "靠单一平台流量" },
    { label: "私域沉淀失败", value: "≥60%", hint: "粉丝导入后失活" },
    { label: "团队成本", value: "≥3 人", hint: "完整经营需要多角色" },
  ],
  solution: [
    { label: "闭环步骤", value: "9 步" },
    { label: "AI 助理", value: "5 大" },
    { label: "经营组件", value: "持续扩展" },
  ],
  productDemo: [
    { label: "已上线模块", value: "8+" },
    { label: "内测中模块", value: "4" },
    { label: "规划中模块", value: "持续" },
  ],
  aiAssistants: [
    { label: "覆盖领域", value: "5" },
    { label: "适用会员", value: "Plus / 经营版" },
    { label: "演示模式", value: "支持" },
  ],
  businessModel: [
    { label: "免费入口", value: "1" },
    { label: "付费档位", value: "≥3" },
    { label: "AI 用量", value: "按量" },
  ],
  competition: [
    { label: "Link168 唯一", value: "完整闭环" },
    { label: "对比维度", value: "5 类" },
    { label: "AI 经营", value: "内嵌" },
  ],
  progress: [
    { label: "已完成", value: "见真实功能" },
    { label: "内测中", value: "AI 模块" },
    { label: "下一阶段", value: "商业化" },
  ],
  ending: [
    { label: "感谢", value: "评委与观众" },
    { label: "联系方式", value: "由后台配置" },
    { label: "下一步", value: "进入产品" },
  ],
};

const SHOWCASE_V2_DEFAULT_TEXT: Record<
  ShowcaseV2SectionKey,
  { eyebrow: string; title: string; body: string; ctaText?: string; ctaUrl?: string; metadata?: ShowcaseV2SectionMeta }
> = {
  opening: {
    eyebrow: "Link168 比赛路演",
    title: "面向自媒体、小商家、一人公司的 AI 经营名片平台",
    body: "Link168 用一张可分享的数字名片承接公域流量，再通过二维码、经营组件、客户线索和 AI 助理帮助用户完成展示、获客、转化与复盘。",
    ctaText: "开始路演",
    ctaUrl: "#painPoints",
    metadata: { version: "V1.0.0-roadshow" },
  },
  painPoints: {
    eyebrow: "01 / 用户痛点",
    title: "他们有内容、有产品、有服务，却没有「经营入口」",
    body: "传统电子名片只能展示，没有客户线索、没有跟进状态、没有 AI 经营辅助；流量散在公域，私域沉淀困难，团队和工具都不全。",
  },
  solution: {
    eyebrow: "02 / 解决方案",
    title: "9 步完成：公域流量 → 经营闭环",
    body: "Link168 把公域流量、公开主页、客户线索、AI 助理、Workbench 跟进串成一条完整链路，每一步可量化、可分析、可被 AI 增强。",
  },
  productDemo: {
    eyebrow: "03 / 真实产品演示",
    title: "基于已上线的真实页面，而非 PPT 截图",
    body: "评委点击下方任一模块，可切换查看项目当前的真实页面（手机 / 浏览器双模型），区分「已上线」、「内测中」与「规划中」能力。",
  },
  aiAssistants: {
    eyebrow: "04 / 五大 AI 助理",
    title: "从经营、内容到法务财税的 5 大 AI 助理",
    body: "点击任一助理卡片可进入「AI 演示窗口」，AI 请求经由后端代理调用阿里云百炼，浏览器永不接触 API Key。",
    metadata: {
      suggestions: {
        tax: ["季度报税提醒？", "小规模纳税人免征额度？", "如何开票？"],
        legal: ["审阅服务协议要点", "保密协议条款检查", "用户协议里必须有？"],
        market: ["竞品分析框架", "小红书选题机会", "公众号 + 视频号组合策略"],
        design: ["公众号封面建议", "小红书九宫格排版", "头像设计要点"],
        social: ["公众号标题改写", "小红书爆款开头", "视频号脚本结构"],
      },
    },
  },
  businessModel: {
    eyebrow: "05 / 商业模式",
    title: "免费名片获客，付费经营组件与 AI 服务变现",
    body: "免费版作为流量入口，会员基础版 / Plus / 企业版 / AI 服务 / 团队服务形成多档位收入结构，避免单一会员收入。",
  },
  competition: {
    eyebrow: "06 / 竞争优势",
    title: "不只是展示工具、不只是二维码工具、不只是 AI 聊天",
    body: "Link168 是「流量承接 + 客户线索 + AI 经营」完整闭环。其它工具往往只覆盖其中一个环节。",
  },
  progress: {
    eyebrow: "07 / 项目进展与未来规划",
    title: "已完成、内测中、下一阶段、商业化路径",
    body: "本页内容由超级管理员后台「比赛中心 → 内容管理」维护，避免编造进度；展示中所有能力均来自真实产品或明确标注的规划。",
  },
  ending: {
    eyebrow: "感谢评委与观众",
    title: "Link168：把名片变成经营入口",
    body: "如需后续联系，请通过本节联系方式与官方二维码。",
    ctaText: "进入真实产品",
    ctaUrl: "/",
  },
};

export function getDefaultShowcaseV2Contents(): Array<Omit<ShowcaseV2Content, "id" | "updatedAt" | "updatedBy">> {
  return SHOWCASE_V2_SECTIONS.map((key, index) => {
    const def = SHOWCASE_V2_DEFAULT_TEXT[key];
    return {
      sectionKey: key,
      eyebrow: def.eyebrow,
      title: def.title,
      body: def.body,
      bullets: SHOWCASE_V2_DEFAULT_BULLETS[key] || [],
      stats: SHOWCASE_V2_DEFAULT_STATS[key] || [],
      ctaText: def.ctaText || null,
      ctaUrl: def.ctaUrl || null,
      metadata: def.metadata || {},
    };
  });
}

export function getDefaultShowcaseV2Sequences(): Array<Omit<ShowcaseV2Sequence, "id">> {
  return SHOWCASE_V2_SECTIONS.map((key, index) => ({
    sectionKey: key,
    orderIndex: index,
    visible: true,
    animation: true,
    theme: index % 2 === 0 ? "dark" : "gradient",
    dwellSec: 0,
    allowSwipe: true,
  }));
}

// ============================================================
// 3) 读写：章节内容
// ============================================================

function safeBullets(value: unknown): ShowcaseV2Bullet[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const title = typeof obj.title === "string" ? obj.title : "";
      if (!title) return null;
      return {
        title: title.slice(0, 200),
        description: typeof obj.description === "string" ? obj.description.slice(0, 500) : undefined,
        icon: typeof obj.icon === "string" ? obj.icon.slice(0, 32) : undefined,
      };
    })
    .filter(Boolean) as ShowcaseV2Bullet[];
}

function safeStats(value: unknown): ShowcaseV2Stat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label : "";
      const val = typeof obj.value === "string" ? obj.value : "";
      if (!label && !val) return null;
      return {
        label: label.slice(0, 80),
        value: val.slice(0, 120),
        hint: typeof obj.hint === "string" ? obj.hint.slice(0, 160) : undefined,
      };
    })
    .filter(Boolean) as ShowcaseV2Stat[];
}

function safeMetadata(value: unknown): ShowcaseV2SectionMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.length > 64) continue;
    if (typeof v === "string") out[k] = v.slice(0, 2000);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 32);
    else if (v && typeof v === "object") out[k] = v;
  }
  return out;
}

function rowToContent(row: {
  id: string;
  sectionKey: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: unknown;
  stats: unknown;
  ctaText: string | null;
  ctaUrl: string | null;
  metadata: unknown;
  updatedBy: string | null;
  updatedAt: Date;
}): ShowcaseV2Content {
  return {
    id: row.id,
    sectionKey: row.sectionKey as ShowcaseV2SectionKey,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    bullets: safeBullets(row.bullets),
    stats: safeStats(row.stats),
    ctaText: row.ctaText,
    ctaUrl: row.ctaUrl,
    metadata: safeMetadata(row.metadata),
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureShowcaseV2Seed(): Promise<void> {
  try {
    const existingContents = await db.showcaseContent.count();
    if (existingContents === 0) {
      const defaults = getDefaultShowcaseV2Contents();
      for (const item of defaults) {
        await db.showcaseContent
          .create({
            data: {
              id: crypto.randomUUID(),
              sectionKey: item.sectionKey,
              eyebrow: item.eyebrow,
              title: item.title,
              body: item.body,
              bullets: (item.bullets as unknown) as object,
              stats: (item.stats as unknown) as object,
              ctaText: item.ctaText,
              ctaUrl: item.ctaUrl,
              metadata: (item.metadata as unknown) as object,
            },
          })
          .catch(() => undefined);
      }
    }

    const existingSequences = await db.showcaseSequence.count();
    if (existingSequences === 0) {
      const defaults = getDefaultShowcaseV2Sequences();
      for (const item of defaults) {
        await db.showcaseSequence
          .create({
            data: {
              id: crypto.randomUUID(),
              sectionKey: item.sectionKey,
              orderIndex: item.orderIndex,
              visible: item.visible,
              animation: item.animation,
              theme: item.theme,
              dwellSec: item.dwellSec,
              allowSwipe: item.allowSwipe,
            },
          })
          .catch(() => undefined);
      }
    }
  } catch {
    // ignore seed errors
  }
}

export async function listShowcaseV2Contents(): Promise<ShowcaseV2Content[]> {
  await ensureShowcaseV2Seed();
  const rows = await db.showcaseContent.findMany();
  return rows.map(rowToContent);
}

export async function listShowcaseV2Sequences(): Promise<ShowcaseV2Sequence[]> {
  await ensureShowcaseV2Seed();
  const rows = await db.showcaseSequence.findMany();
  return rows.map((row) => ({
    id: row.id,
    sectionKey: row.sectionKey as ShowcaseV2SectionKey,
    orderIndex: row.orderIndex,
    visible: row.visible,
    animation: row.animation,
    theme: row.theme,
    dwellSec: row.dwellSec,
    allowSwipe: row.allowSwipe,
  }));
}

export async function updateShowcaseV2Content(input: {
  sectionKey: ShowcaseV2SectionKey;
  eyebrow?: string;
  title?: string;
  body?: string;
  bullets?: ShowcaseV2Bullet[];
  stats?: ShowcaseV2Stat[];
  ctaText?: string | null;
  ctaUrl?: string | null;
  metadata?: ShowcaseV2SectionMeta;
  updatedBy: string;
}): Promise<ShowcaseV2Content> {
  await ensureShowcaseV2Seed();
  const data: Record<string, unknown> = { updatedBy: input.updatedBy };
  if (typeof input.eyebrow === "string") data.eyebrow = input.eyebrow.slice(0, 200);
  if (typeof input.title === "string") data.title = input.title.slice(0, 300);
  if (typeof input.body === "string") data.body = input.body.slice(0, 8000);
  if (Array.isArray(input.bullets)) data.bullets = input.bullets;
  if (Array.isArray(input.stats)) data.stats = input.stats;
  if (input.ctaText === null || typeof input.ctaText === "string") data.ctaText = input.ctaText?.slice(0, 200) ?? null;
  if (input.ctaUrl === null || typeof input.ctaUrl === "string") data.ctaUrl = input.ctaUrl?.slice(0, 500) ?? null;
  if (input.metadata && typeof input.metadata === "object") data.metadata = input.metadata;
  const row = await db.showcaseContent.update({ where: { sectionKey: input.sectionKey }, data });
  return rowToContent(row);
}

export async function updateShowcaseV2Sequences(input: {
  sequences: Array<Pick<ShowcaseV2Sequence, "sectionKey" | "orderIndex" | "visible" | "animation" | "theme" | "dwellSec" | "allowSwipe">>;
}): Promise<ShowcaseV2Sequence[]> {
  await ensureShowcaseV2Seed();
  const updates = await db.$transaction(
    input.sequences.map((seq) =>
      db.showcaseSequence.update({
        where: { sectionKey: seq.sectionKey },
        data: {
          orderIndex: seq.orderIndex,
          visible: seq.visible,
          animation: seq.animation,
          theme: seq.theme,
          dwellSec: Math.max(0, Math.min(seq.dwellSec, 600)),
          allowSwipe: seq.allowSwipe,
        },
      }),
    ),
  );
  return updates.map((row) => ({
    id: row.id,
    sectionKey: row.sectionKey as ShowcaseV2SectionKey,
    orderIndex: row.orderIndex,
    visible: row.visible,
    animation: row.animation,
    theme: row.theme,
    dwellSec: row.dwellSec,
    allowSwipe: row.allowSwipe,
  }));
}

// ============================================================
// 4) 比赛 AI 演示配置
// ============================================================

export type ShowcaseAIConfig = {
  enabled: boolean;
  allowFreeInput: boolean;
  saveRecord: boolean;
  perVisitorLimit: number;
  dailyTotalLimit: number;
  maxOutputLength: number;
  timeoutMs: number;
  modelName: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  welcomeByAssistant: Record<string, string>;
  suggestedQuestionsByAssistant: Record<string, string[]>;
  assistantEnabled: Record<string, boolean>;
  promptVersions: Record<string, string>;
  configVersion: string;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
};

const SHOWCASE_AI_CONFIG_KEY = "competition_showcase_ai_config_v1";

function safeWelcomeMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.slice(0, 500);
  }
  return out;
}

function safeQuestionsMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    out[k] = v
      .map((item) => (typeof item === "string" ? item.slice(0, 200) : ""))
      .filter((s) => s.length > 0)
      .slice(0, 12);
  }
  return out;
}

function safePromptVersions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.slice(0, 32);
  }
  return out;
}

function safeBoolMap(value: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const out: Record<string, boolean> = { ...fallback };
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

export async function getShowcaseAIConfig(): Promise<ShowcaseAIConfig> {
  let row: { configValue: string } | null = null;
  try {
    row = await db.appConfig.findUnique({ where: { configKey: SHOWCASE_AI_CONFIG_KEY } });
  } catch {
    row = null;
  }
  const parsed = safeJsonObject(row?.configValue);
  const appCfg = await getConfig();
  const enabled = parsed?.enabled === true;
  const baseUrl = typeof parsed?.baseUrl === "string" ? parsed.baseUrl : appCfg.aiBaseUrl || DEFAULT_CONFIG.aiBaseUrl;
  const modelName = typeof parsed?.modelName === "string" ? parsed.modelName : appCfg.aiModel || DEFAULT_CONFIG.aiModel;
  const apiKeyConfigured = Boolean(appCfg.aiApiKey);
  return {
    enabled: enabled && apiKeyConfigured,
    allowFreeInput: parsed?.allowFreeInput !== false,
    saveRecord: parsed?.saveRecord === true,
    perVisitorLimit: clampInt(Number(parsed?.perVisitorLimit) || 0, 1, 100, 10),
    dailyTotalLimit: clampInt(Number(parsed?.dailyTotalLimit) || 0, 1, 100_000, 2000),
    maxOutputLength: clampInt(Number(parsed?.maxOutputLength) || 0, 64, 8000, 1500),
    timeoutMs: clampInt(Number(parsed?.timeoutMs) || 0, 2000, 60_000, 15_000),
    modelName,
    baseUrl,
    apiKeyConfigured,
    welcomeByAssistant: safeWelcomeMap(parsed?.welcomeByAssistant),
    suggestedQuestionsByAssistant: safeQuestionsMap(parsed?.suggestedQuestionsByAssistant),
    assistantEnabled: safeBoolMap(parsed?.assistantEnabled, {
      tax: true,
      legal: true,
      market: true,
      design: true,
      social: true,
    }),
    promptVersions: safePromptVersions(parsed?.promptVersions),
    configVersion: typeof parsed?.configVersion === "string" ? parsed.configVersion : "1.0.0",
    lastUpdatedAt: typeof parsed?.lastUpdatedAt === "string" ? parsed.lastUpdatedAt : null,
    lastUpdatedBy: typeof parsed?.lastUpdatedBy === "string" ? parsed.lastUpdatedBy : null,
  };
}

function safeJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function saveShowcaseAIConfig(input: {
  enabled?: boolean;
  allowFreeInput?: boolean;
  saveRecord?: boolean;
  perVisitorLimit?: number;
  dailyTotalLimit?: number;
  maxOutputLength?: number;
  timeoutMs?: number;
  modelName?: string;
  welcomeByAssistant?: Record<string, string>;
  suggestedQuestionsByAssistant?: Record<string, string[]>;
  assistantEnabled?: Record<string, boolean>;
  promptVersions?: Record<string, string>;
  updatedBy: string;
}): Promise<ShowcaseAIConfig> {
  const current = await getShowcaseAIConfig();
  const next: ShowcaseAIConfig = {
    enabled: input.enabled === true,
    allowFreeInput: input.allowFreeInput !== false,
    saveRecord: input.saveRecord === true,
    perVisitorLimit: clampInt(input.perVisitorLimit ?? current.perVisitorLimit, 1, 100, 10),
    dailyTotalLimit: clampInt(input.dailyTotalLimit ?? current.dailyTotalLimit, 1, 100_000, 2000),
    maxOutputLength: clampInt(input.maxOutputLength ?? current.maxOutputLength, 64, 8000, 1500),
    timeoutMs: clampInt(input.timeoutMs ?? current.timeoutMs, 2000, 60_000, 15_000),
    modelName: (input.modelName || current.modelName || DEFAULT_CONFIG.aiModel).slice(0, 200),
    baseUrl: current.baseUrl,
    apiKeyConfigured: current.apiKeyConfigured,
    welcomeByAssistant: input.welcomeByAssistant ? safeWelcomeMap(input.welcomeByAssistant) : current.welcomeByAssistant,
    suggestedQuestionsByAssistant: input.suggestedQuestionsByAssistant
      ? safeQuestionsMap(input.suggestedQuestionsByAssistant)
      : current.suggestedQuestionsByAssistant,
    assistantEnabled: input.assistantEnabled ? safeBoolMap(input.assistantEnabled, current.assistantEnabled) : current.assistantEnabled,
    promptVersions: input.promptVersions ? safePromptVersions(input.promptVersions) : current.promptVersions,
    configVersion: current.configVersion,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: input.updatedBy,
  };
  const stored: Record<string, unknown> = {
    enabled: next.enabled,
    allowFreeInput: next.allowFreeInput,
    saveRecord: next.saveRecord,
    perVisitorLimit: next.perVisitorLimit,
    dailyTotalLimit: next.dailyTotalLimit,
    maxOutputLength: next.maxOutputLength,
    timeoutMs: next.timeoutMs,
    modelName: next.modelName,
    welcomeByAssistant: next.welcomeByAssistant,
    suggestedQuestionsByAssistant: next.suggestedQuestionsByAssistant,
    assistantEnabled: next.assistantEnabled,
    promptVersions: next.promptVersions,
    configVersion: next.configVersion,
    lastUpdatedAt: next.lastUpdatedAt,
    lastUpdatedBy: next.lastUpdatedBy,
  };
  await db.appConfig.upsert({
    where: { configKey: SHOWCASE_AI_CONFIG_KEY },
    create: {
      id: crypto.randomUUID(),
      configKey: SHOWCASE_AI_CONFIG_KEY,
      configValue: JSON.stringify(stored),
      isSensitive: false,
    },
    update: { configValue: JSON.stringify(stored) },
  });
  return next;
}

// ============================================================
// 5) 比赛 AI 演示调用（受 config + 额度限制）
// ============================================================

export type DemoCallResult = {
  ok: boolean;
  response: string;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  blocked?: boolean;
  blockedReason?: string;
};

function isAssistantKey(value: unknown): value is AiAssistantKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AI_ASSISTANTS, value);
}

function visitorHash(headers: Headers) {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown";
  const ua = headers.get("user-agent") || "";
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "link168-demo-visitor").update(`${ip}|${ua}`).digest("hex").slice(0, 48);
}

export async function checkDemoQuota(visitorHashValue: string): Promise<{ allowed: boolean; reason: string }> {
  const cfg = await getShowcaseAIConfig();
  if (!cfg.enabled || !cfg.apiKeyConfigured) return { allowed: false, reason: "ai_disabled" };
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [visitorCount, totalCount] = await Promise.all([
    db.showcaseAIDemoCall.count({
      where: { visitorHash: visitorHashValue, createdAt: { gte: startOfDay }, success: true },
    }),
    db.showcaseAIDemoCall.count({
      where: { createdAt: { gte: startOfDay }, success: true },
    }),
  ]);

  if (visitorCount >= cfg.perVisitorLimit) return { allowed: false, reason: "per_visitor_limit" };
  if (totalCount >= cfg.dailyTotalLimit) return { allowed: false, reason: "daily_total_limit" };
  return { allowed: true, reason: "" };
}

export async function runShowcaseDemo(input: {
  headers: Headers;
  assistant: string;
  question: string;
  sourcePage?: string;
}): Promise<DemoCallResult> {
  const cfg = await getShowcaseAIConfig();
  if (!cfg.enabled || !cfg.apiKeyConfigured) {
    return {
      ok: false,
      response: "",
      latencyMs: 0,
      errorCode: "AI_DISABLED",
      errorMessage: "AI 演示暂未开启，请在超级管理员后台「比赛中心 → AI 配置」启用并确认 API Key 已配置",
    };
  }
  if (!isAssistantKey(input.assistant)) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "BAD_ASSISTANT", errorMessage: "未知 AI 助手" };
  }
  if (!cfg.assistantEnabled[input.assistant]) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "ASSISTANT_DISABLED", errorMessage: "该 AI 助手已关闭" };
  }
  const question = String(input.question || "").trim();
  if (!question) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "EMPTY_QUESTION", errorMessage: "问题不能为空" };
  }
  if (question.length > 600) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "QUESTION_TOO_LONG", errorMessage: "问题长度超过 600 字" };
  }

  const vHash = visitorHash(input.headers);
  const quota = await checkDemoQuota(vHash);
  if (!quota.allowed) {
    return { ok: false, response: "", latencyMs: 0, blocked: true, blockedReason: quota.reason, errorCode: "QUOTA", errorMessage: "已达今日调用上限" };
  }

  const appCfg = await getConfig();
  const apiKey = appCfg.aiApiKey;
  if (!apiKey) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "NO_API_KEY", errorMessage: "超级管理员未配置 AI API Key" };
  }

  const baseUrl = (appCfg.aiBaseUrl || DEFAULT_CONFIG.aiBaseUrl).replace(/\/$/, "");
  const modelName = cfg.modelName || appCfg.aiModel || DEFAULT_CONFIG.aiModel;

  // 系统提示词：优先取后台发布的草稿；否则使用 aiServiceConfig 默认
  const draft = await db.showcasePromptDraft.findFirst({
    where: { assistant: input.assistant, published: true },
    orderBy: { updatedAt: "desc" },
  });
  const fallbackPrompt = defaultAssistantPrompt(input.assistant);
  const systemPrompt = draft?.systemPrompt?.trim() || fallbackPrompt;
  const versionLabel = draft?.version || "default";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: cfg.maxOutputLength,
        temperature: 0.6,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const latency = Date.now() - start;
      await safeCreateDemoCall({
        visitorHash: vHash,
        assistant: input.assistant,
        question,
        response: "",
        latencyMs: latency,
        success: false,
        errorCode: `HTTP_${response.status}`,
        errorMessage: text.slice(0, 500),
        modelName,
        sourcePage: input.sourcePage,
        saved: cfg.saveRecord,
      });
      return {
        ok: false,
        response: "",
        latencyMs: latency,
        errorCode: `HTTP_${response.status}`,
        errorMessage: text.slice(0, 500),
        modelName,
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const answer = json?.choices?.[0]?.message?.content?.trim() || "";
    const latency = Date.now() - start;
    await safeCreateDemoCall({
      visitorHash: vHash,
      assistant: input.assistant,
      question,
      response: answer,
      latencyMs: latency,
      success: true,
      modelName,
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
      sourcePage: input.sourcePage,
      saved: cfg.saveRecord,
    });
    return {
      ok: true,
      response: answer,
      latencyMs: latency,
      modelName,
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
    };
  } catch (err) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const code = /abort/i.test(message) ? "TIMEOUT" : "UPSTREAM_ERROR";
    await safeCreateDemoCall({
      visitorHash: vHash,
      assistant: input.assistant,
      question,
      response: "",
      latencyMs: latency,
      success: false,
      errorCode: code,
      errorMessage: message.slice(0, 500),
      modelName,
      sourcePage: input.sourcePage,
      saved: cfg.saveRecord,
    });
    return { ok: false, response: "", latencyMs: latency, errorCode: code, errorMessage: message, modelName };
  } finally {
    clearTimeout(timer);
  }
}

function defaultAssistantPrompt(assistant: AiAssistantKey): string {
  switch (assistant) {
    case "tax":
      return "你是一位中文财税助理，服务对象为小规模纳税人和一人公司。请用简洁可执行的语言回答，避免引用具体法规条文编号，给出一般性建议并提示用户最终以税务机关和会计师意见为准。";
    case "legal":
      return "你是一位中文法务助理，仅提供一般性合规要点建议，不构成法律意见。回答时使用通俗语言，并提示用户最终由律师审定。";
    case "market":
      return "你是一位中文市场调研助理，帮助自媒体、小商家和一人公司分析竞品、用户画像、机会点，使用结构化要点回答。";
    case "design":
      return "你是一位中文设计助理，帮助创作者快速得到海报、封面、头像的构图与文案建议，使用要点 + 示例的方式回答。";
    case "social":
      return "你是一位中文社媒运营助理，针对公众号 / 小红书 / 视频号提供选题、标题、开头、结构的改写建议。";
    default:
      return "你是一位中文 AI 助理，请用结构化要点回答用户问题。";
  }
}

async function safeCreateDemoCall(data: {
  visitorHash: string;
  assistant: string;
  question: string;
  response: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  sourcePage?: string;
  saved: boolean;
}) {
  if (!data.saved) return; // 不持久化，但调用计数仅用于统计
  try {
    await db.showcaseAIDemoCall.create({
      data: {
        id: crypto.randomUUID(),
        visitorHash: data.visitorHash,
        assistant: data.assistant,
        question: data.question,
        response: data.response,
        latencyMs: data.latencyMs,
        success: data.success,
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        modelName: data.modelName || null,
        inputTokens: data.inputTokens ?? null,
        outputTokens: data.outputTokens ?? null,
        sourcePage: data.sourcePage || null,
        saved: true,
      },
    });
  } catch {
    // ignore
  }
}

// ============================================================
// 6) 比赛 AI 调试台（与正式演示完全隔离）
// ============================================================

export type DebugCallResult = {
  ok: boolean;
  response: string;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  modelName?: string;
  configVersion?: string;
  logId?: string;
};

export async function runShowcaseDebug(input: {
  debuggerId: string;
  debuggerEmail: string;
  assistant: string;
  systemPrompt: string;
  question: string;
  modelName?: string;
  configVersion?: string;
  saveLog: boolean;
}): Promise<DebugCallResult> {
  if (!isAssistantKey(input.assistant)) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "BAD_ASSISTANT", errorMessage: "未知 AI 助手" };
  }
  const systemPrompt = String(input.systemPrompt || "").slice(0, 8000);
  const question = String(input.question || "").trim().slice(0, 600);
  if (!systemPrompt) return { ok: false, response: "", latencyMs: 0, errorCode: "EMPTY_PROMPT", errorMessage: "系统提示词不能为空" };
  if (!question) return { ok: false, response: "", latencyMs: 0, errorCode: "EMPTY_QUESTION", errorMessage: "测试问题不能为空" };

  const appCfg = await getConfig();
  const apiKey = appCfg.aiApiKey;
  if (!apiKey) {
    return { ok: false, response: "", latencyMs: 0, errorCode: "NO_API_KEY", errorMessage: "超级管理员未配置 AI API Key" };
  }
  const baseUrl = (appCfg.aiBaseUrl || DEFAULT_CONFIG.aiBaseUrl).replace(/\/$/, "");
  const modelName = (input.modelName || appCfg.aiModel || DEFAULT_CONFIG.aiModel).slice(0, 200);
  const configVersion = (input.configVersion || "debug").slice(0, 32);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 1500,
        temperature: 0.4,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      const latency = Date.now() - start;
      const log = input.saveLog
        ? await createDebugLog({
            debuggerId: input.debuggerId,
            debuggerEmail: input.debuggerEmail,
            assistant: input.assistant,
            systemPrompt,
            question,
            rawResponse: text.slice(0, 4000),
            latencyMs: latency,
            success: false,
            errorCode: `HTTP_${response.status}`,
            errorMessage: text.slice(0, 500),
            modelName,
            configVersion,
          })
        : null;
      return {
        ok: false,
        response: text.slice(0, 4000),
        latencyMs: latency,
        errorCode: `HTTP_${response.status}`,
        errorMessage: text.slice(0, 500),
        modelName,
        configVersion,
        logId: log?.id,
      };
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const answer = json?.choices?.[0]?.message?.content?.trim() || "";
    const latency = Date.now() - start;
    const log = input.saveLog
      ? await createDebugLog({
          debuggerId: input.debuggerId,
          debuggerEmail: input.debuggerEmail,
          assistant: input.assistant,
          systemPrompt,
          question,
          rawResponse: answer,
          latencyMs: latency,
          success: true,
          modelName,
          configVersion,
        })
      : null;
    return {
      ok: true,
      response: answer,
      latencyMs: latency,
      modelName,
      configVersion,
      logId: log?.id,
    };
  } catch (err) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const code = /abort/i.test(message) ? "TIMEOUT" : "UPSTREAM_ERROR";
    const log = input.saveLog
      ? await createDebugLog({
          debuggerId: input.debuggerId,
          debuggerEmail: input.debuggerEmail,
          assistant: input.assistant,
          systemPrompt,
          question,
          rawResponse: "",
          latencyMs: latency,
          success: false,
          errorCode: code,
          errorMessage: message.slice(0, 500),
          modelName,
          configVersion,
        })
      : null;
    return { ok: false, response: "", latencyMs: latency, errorCode: code, errorMessage: message, modelName, configVersion, logId: log?.id };
  } finally {
    clearTimeout(timer);
  }
}

async function createDebugLog(input: {
  debuggerId: string;
  debuggerEmail: string;
  assistant: string;
  systemPrompt: string;
  question: string;
  rawResponse: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  modelName?: string;
  configVersion?: string;
}) {
  try {
    const row = await db.showcaseAIDebugLog.create({
      data: {
        id: crypto.randomUUID(),
        debuggerId: input.debuggerId,
        debuggerEmail: input.debuggerEmail,
        assistant: input.assistant,
        systemPrompt: input.systemPrompt,
        question: input.question,
        rawResponse: input.rawResponse,
        latencyMs: input.latencyMs,
        success: input.success,
        errorCode: input.errorCode || null,
        errorMessage: input.errorMessage || null,
        modelName: input.modelName || null,
        configVersion: input.configVersion || null,
      },
    });
    return row;
  } catch {
    return null;
  }
}

export type PromptDraftInput = {
  assistant: AiAssistantKey;
  title: string;
  systemPrompt: string;
  welcomeText: string;
  suggestedQuestions: string[];
  published: boolean;
  version: string;
  authorId: string;
  authorEmail: string;
};

export async function createPromptDraft(input: PromptDraftInput) {
  return db.showcasePromptDraft.create({
    data: {
      id: crypto.randomUUID(),
      assistant: input.assistant,
      title: input.title.slice(0, 200),
      systemPrompt: input.systemPrompt.slice(0, 8000),
      welcomeText: input.welcomeText.slice(0, 500),
      suggestedQuestions: input.suggestedQuestions.slice(0, 12),
      published: input.published,
      version: input.version.slice(0, 32),
      authorId: input.authorId,
      authorEmail: input.authorEmail,
    },
  });
}

export async function listPromptDrafts(assistant?: AiAssistantKey, limit = 50) {
  return db.showcasePromptDraft.findMany({
    where: assistant ? { assistant } : undefined,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function publishPromptDraft(draftId: string) {
  return db.$transaction(async (tx) => {
    const draft = await tx.showcasePromptDraft.findUnique({ where: { id: draftId } });
    if (!draft) return null;
    // 取消同 assistant 其他 published
    await tx.showcasePromptDraft.updateMany({
      where: { assistant: draft.assistant, id: { not: draftId }, published: true },
      data: { published: false },
    });
    return tx.showcasePromptDraft.update({ where: { id: draftId }, data: { published: true } });
  });
}

// ============================================================
// 7) 比赛中心统计
// ============================================================

export type ShowcaseStats = {
  totalVisits: number;
  uniqueVisitors: number;
  lastVisitedAt: string | null;
  topSections: Array<{ sectionKey: string; count: number }>;
  demoCalls: { total: number; success: number; failed: number; avgLatencyMs: number };
  fileDownloads: { total: number };
  devices: Array<{ deviceType: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
};

export async function getShowcaseStats(): Promise<ShowcaseStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 访问日志从 adminAuditLog 中取 action = SHOWCASE_ACCESS
  // 为了统计章节停留 / 设备 / 来源，最近 1000 条已足够
  const recent = await db.adminAuditLog
    .findMany({
      where: { action: "SHOWCASE_ACCESS" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { id: true, ipHash: true, metadataRaw: true, createdAt: true },
    })
    .catch(() => [] as Array<{ id: string; ipHash: string | null; metadataRaw: string | null; createdAt: Date }>);

  const sectionMap = new Map<string, number>();
  const devicesMap = new Map<string, number>();
  const referrersMap = new Map<string, number>();
  const uniqueIps = new Set<string>();
  let lastVisitedAt: Date | null = null;

  for (const row of recent) {
    if (row.ipHash) uniqueIps.add(row.ipHash);
    if (!lastVisitedAt) lastVisitedAt = row.createdAt;
    let meta: Record<string, unknown> = {};
    try {
      if (row.metadataRaw) meta = JSON.parse(row.metadataRaw) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    const sectionKey = typeof meta.sectionKey === "string" ? meta.sectionKey : null;
    if (sectionKey) {
      sectionMap.set(sectionKey, (sectionMap.get(sectionKey) || 0) + 1);
    }
    const deviceType = typeof meta.deviceType === "string" ? meta.deviceType : "Unknown";
    devicesMap.set(deviceType, (devicesMap.get(deviceType) || 0) + 1);
    const referrer = typeof meta.referrer === "string" && meta.referrer ? meta.referrer : "(直接访问)";
    referrersMap.set(referrer, (referrersMap.get(referrer) || 0) + 1);
  }

  const [demoTotal, demoSuccess, demoFailed, demoAvg, downloadTotal] = await Promise.all([
    db.showcaseAIDemoCall.count().catch(() => 0),
    db.showcaseAIDemoCall.count({ where: { success: true } }).catch(() => 0),
    db.showcaseAIDemoCall.count({ where: { success: false } }).catch(() => 0),
    db.showcaseAIDemoCall
      .aggregate({ _avg: { latencyMs: true } })
      .catch(() => ({ _avg: { latencyMs: null } }) as { _avg: { latencyMs: number | null } }),
    db.adminAuditLog.count({ where: { action: "admin.download_competition_file" } }).catch(() => 0),
  ]);

  void startOfDay;

  return {
    totalVisits: recent.length,
    uniqueVisitors: uniqueIps.size,
    lastVisitedAt: lastVisitedAt ? lastVisitedAt.toISOString() : null,
    topSections: Array.from(sectionMap.entries())
      .map(([sectionKey, count]) => ({ sectionKey, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 9),
    demoCalls: {
      total: demoTotal,
      success: demoSuccess,
      failed: demoFailed,
      avgLatencyMs: Math.round(demoAvg?._avg?.latencyMs || 0),
    },
    fileDownloads: { total: downloadTotal },
    devices: Array.from(devicesMap.entries())
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count),
    referrers: Array.from(referrersMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

// ============================================================
// 8) 公开聚合载荷（用于公开 /showcase 页面）
// ============================================================

export async function buildShowcaseV2PublicPayload(): Promise<ShowcaseV2PublicPayload> {
  const [contents, sequences, aiCfg] = await Promise.all([
    listShowcaseV2Contents(),
    listShowcaseV2Sequences(),
    getShowcaseAIConfig(),
  ]);
  const meta = {
    version: typeof contents[0]?.metadata?.version === "string" ? String(contents[0].metadata.version) : "V1.0.0-roadshow",
    brand: "Link168",
    tagline: "AI 经营名片平台",
    enableAI: aiCfg.enabled && aiCfg.apiKeyConfigured,
    allowFreeInput: aiCfg.allowFreeInput,
    suggestedQuestionsByAssistant: aiCfg.suggestedQuestionsByAssistant,
    welcomeByAssistant: aiCfg.welcomeByAssistant,
  };
  const seqMap = new Map<string, ShowcaseV2Sequence>();
  for (const s of sequences) seqMap.set(s.sectionKey, s);
  const filtered = contents
    .map((c) => ({ c, seq: seqMap.get(c.sectionKey) }))
    .filter((item) => item.seq?.visible)
    .sort((a, b) => (a.seq?.orderIndex ?? 0) - (b.seq?.orderIndex ?? 0));
  return {
    meta,
    sections: filtered.map(({ c, seq }) => ({
      key: c.sectionKey,
      label: SHOWCASE_V2_SECTION_LABELS[c.sectionKey],
      eyebrow: c.eyebrow,
      title: c.title,
      body: c.body,
      bullets: c.bullets,
      stats: c.stats,
      ctaText: c.ctaText,
      ctaUrl: c.ctaUrl,
      theme: seq?.theme || "dark",
      animation: seq?.animation ?? true,
      allowSwipe: seq?.allowSwipe ?? true,
      dwellSec: seq?.dwellSec ?? 0,
    })),
  };
}
