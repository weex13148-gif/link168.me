import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "@/lib/db";

export const SHOWCASE_CONFIG_KEY = "competition_showcase_config";
export const SHOWCASE_COOKIE_NAME = "link168_showcase_access";
export const SHOWCASE_AUDIT_ACTION = "SHOWCASE_ACCESS";
export const SHOWCASE_CONFIG_ACTION = "SHOWCASE_CONFIG_UPDATE";

export type ShowcaseSectionKey =
  | "projectIntro"
  | "startupStory"
  | "productDemo"
  | "agentProcess"
  | "realEvidence"
  | "businessModel"
  | "roadmap"
  | "ppt"
  | "video"
  | "businessReport"
  | "contact";

export type ShowcaseConfig = {
  enabled: boolean;
  passwordHash: string | null;
  updatedAt: string | null;
  sections: Record<ShowcaseSectionKey, boolean>;
};

export type ShowcaseLogMetadata = {
  result: string;
  referrer: string | null;
  rawIp: string;
  maskedIp: string;
  ipHash: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  screenSize?: string | null;
  viewportSize?: string | null;
  deviceModel?: string | null;
  sectionKey?: string;
  dwellMs?: number;
  progress?: number;
};

export const SHOWCASE_SECTION_LABELS: Record<ShowcaseSectionKey, string> = {
  projectIntro: "项目介绍",
  startupStory: "创业故事",
  productDemo: "产品演示",
  agentProcess: "Agent开发过程",
  realEvidence: "真实功能证据",
  businessModel: "商业模式",
  roadmap: "路线图",
  ppt: "比赛PPT",
  video: "演示视频",
  businessReport: "商业报告",
  contact: "联系方式",
};

export const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig = {
  enabled: false,
  passwordHash: null,
  updatedAt: null,
  sections: {
    projectIntro: true,
    startupStory: true,
    productDemo: true,
    agentProcess: true,
    realEvidence: true,
    businessModel: true,
    roadmap: true,
    ppt: true,
    video: true,
    businessReport: true,
    contact: true,
  },
};

export const SHOWCASE_CONTENT = {
  projectIntro: {
    eyebrow: "Project",
    title: "Link168：面向中文创作者、小商家和一人公司的 AI 经营名片平台",
    body:
      "Link168 用一张可分享的数字名片承接公域流量，再通过二维码、经营组件、客户线索和 AI 助手帮助用户完成展示、获客、转化与复盘。当前正式可展示能力以注册登录、名片创建、公开主页、链接管理、二维码分享、访问统计和管理后台治理为主；AI 经营与 AI 创作能力统一标记为内测中。",
  },
  startupStory: {
    eyebrow: "Story",
    title: "创业故事：从一张链接页，到小商家的经营入口",
    body:
      "很多个人 IP、小商家和一人公司没有精力维护复杂官网，也不适合直接上 CRM。Link168 的切入点是先让他们拥有一个能被微信、海报和社交平台传播的经营名片，再逐步加入商品、服务、预约、线索和 AI 辅助能力。",
  },
  productDemo: {
    eyebrow: "Demo",
    title: "产品演示：5 分钟建立可分享主页",
    body:
      "演示路径建议：注册账号，设置用户名，编辑头像、简介和联系方式，添加公众号/小红书/咨询入口，生成公开主页和二维码，再进入后台查看访问与点击数据。企业 AI 与经营助手演示需标注为内测中。",
  },
  agentProcess: {
    eyebrow: "Agent Process",
    title: "Agent 开发过程：从规则、审计到可演示材料",
    body:
      "本项目采用 TRAE 主控产品开发、Codex 辅助审计与比赛材料整理的协作方式。Agent 过程保留边界：Codex 只处理展示页、材料、脚本、报告和真实证据整理，不接管主产品路线、生产数据库、服务器部署或 GitHub 发布。",
  },
  realEvidence: {
    eyebrow: "Evidence",
    title: "真实功能证据：只展示已完成或明确标注状态的能力",
    body:
      "已完成并可本地演示：注册登录、忘记密码入口、Dashboard 名片编辑、链接管理、公开主页、短链/二维码相关入口、举报页面、管理员工作台、用户/主页/举报/AI 用量/系统配置管理。AI 经营助手、AI 创作助手、企业知识库等能力在展示中统一标记为内测中或规划中。",
  },
  businessModel: {
    eyebrow: "Business",
    title: "商业模式：免费名片获客，经营组件与 AI 服务变现",
    body:
      "免费版提供基础主页、链接、二维码和品牌露出；会员基础版提供更多经营组件、样式和数据；Plus 提供 AI 创作助手；经营版提供 AI 顾问、知识库、线索和跟进建议；企业版提供成员、权限、企业知识库和定制服务。",
  },
  roadmap: {
    eyebrow: "Roadmap",
    title: "路线图：先闭环，再商业化，再企业化",
    body:
      "短期重点是修复核心体验、统一 Dashboard 与 Workbench、完善经营组件；中期开放 AI 创作与 AI 经营内测；长期推进会员、经营版、企业版与成本可控的 AI 调用体系。",
  },
  ppt: {
    eyebrow: "Deck",
    title: "比赛 PPT",
    body: "完整版 PPT 保存在 `showcase/materials/link168-competition-deck.md` 与后续生成的 PPTX 文件中，覆盖问题、方案、产品、用户、市场、商业模式、AI 战略、团队和路线图。",
  },
  video: {
    eyebrow: "Video",
    title: "演示视频",
    body: "视频脚本与镜头清单保存在 `showcase/materials/demo-video-script.md` 和 `showcase/materials/shot-list.md`，每个镜头包含镜头内容、旁白、时长和素材来源。",
  },
  businessReport: {
    eyebrow: "Report",
    title: "商业报告",
    body: "商业报告保存在 `showcase/materials/business-report.md`，包含目标用户、市场机会、商业模式、AI 成本控制、增长机制、风险与阶段路线。",
  },
  contact: {
    eyebrow: "Contact",
    title: "联系方式",
    body:
      "比赛评委可通过主办方提交渠道联系项目方。展示页不展示虚构备案、不展示公安备案号或警徽/国徽/公安图标；ICP 信息仅在真实备案完成后展示。",
  },
} satisfies Record<ShowcaseSectionKey, { eyebrow: string; title: string; body: string }>;

function safeJsonParse(value: string | null | undefined): Partial<ShowcaseConfig> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ShowcaseConfig>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeShowcaseConfig(value: Partial<ShowcaseConfig> | null | undefined): ShowcaseConfig {
  const sections = { ...DEFAULT_SHOWCASE_CONFIG.sections, ...(value?.sections || {}) };
  return {
    enabled: value?.enabled === true,
    passwordHash: typeof value?.passwordHash === "string" && value.passwordHash ? value.passwordHash : null,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
    sections,
  };
}

export async function getShowcaseConfig() {
  try {
    const record = await db.appConfig.findUnique({ where: { configKey: SHOWCASE_CONFIG_KEY } });
    return normalizeShowcaseConfig(safeJsonParse(record?.configValue));
  } catch {
    return DEFAULT_SHOWCASE_CONFIG;
  }
}

export async function saveShowcaseConfig(input: {
  enabled: boolean;
  sections: Record<ShowcaseSectionKey, boolean>;
  password?: string;
}) {
  const current = await getShowcaseConfig();
  const password = typeof input.password === "string" ? input.password.trim() : "";
  const passwordHash = password ? await bcrypt.hash(password, 12) : current.passwordHash;
  const next: ShowcaseConfig = {
    enabled: input.enabled,
    passwordHash,
    updatedAt: new Date().toISOString(),
    sections: { ...DEFAULT_SHOWCASE_CONFIG.sections, ...input.sections },
  };
  await db.appConfig.upsert({
    where: { configKey: SHOWCASE_CONFIG_KEY },
    create: {
      id: crypto.randomUUID(),
      configKey: SHOWCASE_CONFIG_KEY,
      configValue: JSON.stringify(next),
      isSensitive: true,
    },
    update: {
      configValue: JSON.stringify(next),
      isSensitive: true,
    },
  });
  return next;
}

function signingSecret() {
  return process.env.SESSION_SECRET || process.env.AUTH_SECRET || "link168-showcase-local-secret";
}

export function createShowcaseCookieValue(passwordHash: string) {
  return crypto.createHmac("sha256", signingSecret()).update(passwordHash).digest("hex");
}

export function hasValidShowcaseCookie(cookieValue: string | undefined, config: ShowcaseConfig) {
  if (!cookieValue || !config.passwordHash) return false;
  const expected = createShowcaseCookieValue(config.passwordHash);
  if (cookieValue.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
}

export async function verifyShowcasePassword(password: string, config: ShowcaseConfig) {
  if (!config.passwordHash) return false;
  return bcrypt.compare(password, config.passwordHash);
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function maskIp(ip: string) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length > 2 ? `${parts.slice(0, 2).join(":")}:****` : "****";
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return "****";
  return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
}

export function hashIp(ip: string) {
  return crypto.createHash("sha256").update(`${ip}:${signingSecret()}`).digest("hex");
}

export function parseUserAgent(userAgent: string) {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua) && !/Chrome\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Unknown";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";
  const deviceType = /iPad|Tablet/.test(ua) ? "Tablet" : /Mobile|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
  const modelMatch = ua.match(/\(([^)]+)\)/);
  return { browser, os, deviceType, deviceModel: modelMatch?.[1] || null };
}

export function buildShowcaseLogMetadata(headers: Headers, result: string, extra?: Partial<ShowcaseLogMetadata>) {
  const rawIp = getClientIp(headers);
  const userAgent = headers.get("user-agent") || "";
  const parsed = parseUserAgent(userAgent);
  return {
    result,
    referrer: headers.get("referer") || headers.get("referrer") || null,
    rawIp,
    maskedIp: maskIp(rawIp),
    ipHash: hashIp(rawIp),
    userAgent,
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
    deviceModel: parsed.deviceModel,
    ...extra,
  };
}

export async function pruneOldShowcaseLogs() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.adminAuditLog.deleteMany({
    where: {
      action: SHOWCASE_AUDIT_ACTION,
      createdAt: { lt: cutoff },
    },
  });
}

export async function recordShowcaseAccess(metadata: ShowcaseLogMetadata) {
  await pruneOldShowcaseLogs().catch(() => undefined);
  await db.adminAuditLog.create({
    data: {
      id: crypto.randomUUID(),
      action: SHOWCASE_AUDIT_ACTION,
      targetType: "competition_showcase",
      targetId: "showcase",
      metadataRaw: JSON.stringify(metadata),
      ipHash: metadata.ipHash,
      userAgent: metadata.userAgent,
      success: metadata.result === "success" || metadata.result === "page_view" || metadata.result === "authorized_page",
    },
  });
}

export async function getShowcaseLogs(limit = 100) {
  const rows = await db.adminAuditLog.findMany({
    where: { action: SHOWCASE_AUDIT_ACTION },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => {
    const metadata = safeLogMetadata(row.metadataRaw);
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      result: metadata.result || (row.success ? "success" : "failed"),
      referrer: metadata.referrer || null,
      rawIp: metadata.rawIp || "unknown",
      maskedIp: metadata.maskedIp || "unknown",
      ipHash: metadata.ipHash || row.ipHash || "",
      userAgent: metadata.userAgent || row.userAgent || "",
      browser: metadata.browser || "Unknown",
      os: metadata.os || "Unknown",
      deviceType: metadata.deviceType || "Unknown",
      screenSize: metadata.screenSize || null,
      viewportSize: metadata.viewportSize || null,
      deviceModel: metadata.deviceModel || null,
    };
  });
}

function safeLogMetadata(value: string | null): Partial<ShowcaseLogMetadata> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Partial<ShowcaseLogMetadata>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export type ShowcaseStats = {
  totalAccess: number;
  authorizedAccess: number;
  pageViews: number;
  failures: number;
  uniqueIps: number;
  uniqueVisitorsByHash: number;
  topReferrers: Array<{ referrer: string; count: number }>;
  topSections: Array<{ sectionKey: string; dwellMs: number; views: number }>;
  recent24hAccess: number;
  browserBreakdown: Array<{ browser: string; count: number }>;
  deviceBreakdown: Array<{ deviceType: string; count: number }>;
};

export async function getShowcaseStats(): Promise<ShowcaseStats> {
  const rows = await db.adminAuditLog.findMany({
    where: { action: SHOWCASE_AUDIT_ACTION },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, createdAt: true, ipHash: true, metadataRaw: true, success: true },
  });

  const referrerCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const ipHashes = new Set<string>();
  const sectionDwell = new Map<string, { dwellMs: number; views: number }>();

  let totalAccess = 0;
  let authorizedAccess = 0;
  let pageViews = 0;
  let failures = 0;
  let uniqueVisitorsByHash = 0;
  let recent24hAccess = 0;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const seenHashes = new Set<string>();

  for (const row of rows) {
    totalAccess += 1;
    const meta = safeLogMetadata(row.metadataRaw);
    if (row.success) {
      if (meta.result === "authorized_page") authorizedAccess += 1;
      else if (meta.result === "page_view") pageViews += 1;
    } else {
      failures += 1;
    }
    if (row.createdAt.getTime() >= oneDayAgo) recent24hAccess += 1;

    const hash = (meta.ipHash || row.ipHash || "").trim();
    if (hash) ipHashes.add(hash);
    if (hash && !seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueVisitorsByHash += 1;
    }

    const referrer = (meta.referrer || "").trim();
    if (referrer) referrerCounts.set(referrer, (referrerCounts.get(referrer) ?? 0) + 1);

    const browser = meta.browser || "Unknown";
    browserCounts.set(browser, (browserCounts.get(browser) ?? 0) + 1);

    const device = meta.deviceType || "Unknown";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);

    const sectionKey = meta.sectionKey;
    if (sectionKey) {
      const entry = sectionDwell.get(sectionKey) ?? { dwellMs: 0, views: 0 };
      entry.dwellMs += typeof meta.dwellMs === "number" ? meta.dwellMs : 0;
      entry.views += 1;
      sectionDwell.set(sectionKey, entry);
    }
  }

  return {
    totalAccess,
    authorizedAccess,
    pageViews,
    failures,
    uniqueIps: ipHashes.size,
    uniqueVisitorsByHash,
    topReferrers: Array.from(referrerCounts.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topSections: Array.from(sectionDwell.entries())
      .map(([sectionKey, v]) => ({ sectionKey, dwellMs: v.dwellMs, views: v.views }))
      .sort((a, b) => b.dwellMs - a.dwellMs)
      .slice(0, 10),
    recent24hAccess,
    browserBreakdown: Array.from(browserCounts.entries())
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    deviceBreakdown: Array.from(deviceCounts.entries())
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
