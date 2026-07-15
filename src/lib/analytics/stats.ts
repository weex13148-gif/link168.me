/**
 * 分析统计工具库
 * 提供聚合分析、漏斗计算等功能
 */
import { db } from "@/lib/db";
import { inferChannel, type ChannelSource } from "./attribution";

// 事件类型枚举
export type EventType =
  | "page_view"           // 主页访问
  | "link_click"          // 链接点击
  | "product_click"       // 产品点击
  | "qr_visit"           // 二维码访问
  | "short_link_click"    // 短链接访问
  | "contact_click"        // 联系方式点击
  | "share_click"         // 分享点击
  | "form_submit"         // 表单提交
  | "lead_create";        // 线索创建

// 事件记录结构（用于统一事件模型）
export interface AnalyticsEvent {
  id: string;
  profileId: string;
  eventType: EventType;
  targetId?: string;        // 关联的链接/产品/短链接ID
  targetTitle?: string;     // 关联的名称
  sourceComponent?: string; // 来源组件
  sourcePage?: string;      // 来源页面
  channel: ChannelSource;
  channelLabel: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referer?: string;
  device: string;
  os: string;
  browser: string;
  country?: string;
  city?: string;
  isPaid: boolean;
  isOrganic: boolean;
  visitorId: string;
  isBot: boolean;
  createdAt: Date;
}

// 漏斗步骤
export interface FunnelStep {
  name: string;
  eventType: EventType;
  count: number;
  conversionRate: number;  // 相对于上一步的转化率
}

// 转化漏斗
export interface ConversionFunnel {
  steps: FunnelStep[];
  overallConversionRate: number;  // 从第一步到最后一步的整体转化率
  totalLeads: number;
}

// 短链接统计
export interface ShortLinkStat {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  channelDistribution: Array<{ channel: string; label: string; count: number }>;
  deviceDistribution: Array<{ device: string; count: number }>;
  dailyTrend: Array<{ date: string; clicks: number }>;
}

export interface CoreMvpMetrics {
  visits: number;
  consultations: number;
  leads: number;
  conversions: number;
}

const CONTACT_LINK_TYPES = ["phone", "email", "wechat"] as const;
const CONSULTATION_LEAD_SOURCES = [
  "contact_form",
  "quote",
  "booking",
  "product_card",
  "service_card",
  "offer",
  "ai-chat",
] as const;

export async function getCoreMvpMetrics(
  profileId: string,
  range: { from: Date; to: Date },
): Promise<CoreMvpMetrics> {
  if (
    !profileId
    || !Number.isFinite(range.from.getTime())
    || !Number.isFinite(range.to.getTime())
    || range.from >= range.to
  ) {
    throw new Error("Invalid analytics range");
  }

  const createdAt = { gte: range.from, lt: range.to };
  const [
    visits,
    contactLinkClicks,
    consultationLeads,
    leads,
    conversions,
  ] = await Promise.all([
    db.profileVisit.count({
      where: { profileId, isBot: false, createdAt },
    }),
    db.linkClick.count({
      where: {
        profileId,
        createdAt,
        link: { type: { in: [...CONTACT_LINK_TYPES] } },
      },
    }),
    db.lead.count({
      where: {
        profileId,
        createdAt,
        sourceComponent: { in: [...CONSULTATION_LEAD_SOURCES] },
      },
    }),
    db.lead.count({
      where: { profileId, createdAt },
    }),
    db.lead.count({
      where: { profileId, createdAt, status: "won" },
    }),
  ]);

  return {
    visits,
    consultations: contactLinkClicks + consultationLeads,
    leads,
    conversions,
  };
}

/**
 * 获取时间范围（统一使用 Asia/Shanghai 时区计算当日零点）
 */
export function getTimeRange(range: "today" | "7d" | "30d" | "90d"): { start: Date; days: number } {
  // 计算 Asia/Shanghai 当天的 00:00 对应的 UTC 时间
  // 上海时区 UTC+8：取当前 UTC 时间 +8 小时的日期部分，再减回 8 小时得到 UTC 零点
  const now = new Date();
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const shanghaiNow = new Date(now.getTime() + shanghaiOffsetMs);
  const shanghaiStartOfDay = new Date(shanghaiNow);
  shanghaiStartOfDay.setUTCHours(0, 0, 0, 0);
  const utcStartOfDay = new Date(shanghaiStartOfDay.getTime() - shanghaiOffsetMs);

  if (range === "today") {
    return { start: utcStartOfDay, days: 1 };
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(utcStartOfDay.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { start, days };
}

/**
 * 获取综合统计数据
 */
export async function getAnalyticsStats(params: {
  profileId: string;
  userId: string;
  range?: "today" | "7d" | "30d" | "90d";
}) {
  const { profileId, userId, range = "7d" } = params;
  const { start, days } = getTimeRange(range);

  // 并行查询多种数据
  const [
    // 链接点击统计
    linkClicksCount,
    linkClicksByDevice,
    linkClicksByDay,
    linkClicksByChannel,

    // 线索统计
    leadsTotal,
    leadsByStatus,
    leadsByDay,

    // 产品统计
    productClicks, // 通过 source_component='product_card' 的 lead 统计

    // 热门链接
    topLinks,

    // 汇总
    totalLinks,
  ] = await Promise.all([
    // 总点击数
    db.linkClick.count({
      where: { profileId, createdAt: { gte: start } },
    }),

    // 设备分布
    db.linkClick.groupBy({
      by: ["device"],
      where: { profileId, createdAt: { gte: start } },
      _count: { device: true },
      orderBy: { _count: { device: "desc" } },
      take: 5,
    }),

    // 每日趋势
    db.linkClick.findMany({
      where: { profileId, createdAt: { gte: start } },
      select: { createdAt: true },
    }),

    // 渠道统计（从 referer 推断）
    db.linkClick.findMany({
      where: { profileId, createdAt: { gte: start }, referer: { not: null } },
      select: { referer: true },
      take: 1000,
    }),

    // 线索总数
    db.lead.count({
      where: { profileId, createdAt: { gte: start } },
    }),

    // 线索状态分布（按原始状态分组，前端自行映射）
    db.lead.groupBy({
      by: ["status"],
      where: { profileId, createdAt: { gte: start } },
      _count: { status: true },
    }),

    // 线索每日趋势
    db.lead.findMany({
      where: { profileId, createdAt: { gte: start } },
      select: { createdAt: true },
    }),

    // 关联产品的线索数
    db.lead.count({
      where: { profileId, interestedProductId: { not: null }, createdAt: { gte: start } },
    }),

    // 热门链接
    db.link.findMany({
      where: { profileId, totalClicks: { gt: 0 } },
      select: { id: true, title: true, totalClicks: true, type: true },
      orderBy: { totalClicks: "desc" },
      take: 10,
    }),

    // 链接总数
    db.link.count({ where: { profileId } }),
  ]);

  // 处理每日趋势数据
  const dailyMap = new Map<string, { clicks: number; leads: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyMap.set(key, { clicks: 0, leads: 0 });
  }

  for (const row of linkClicksByDay) {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}-${String(row.createdAt.getDate()).padStart(2, "0")}`;
    if (dailyMap.has(key)) {
      const current = dailyMap.get(key)!;
      current.clicks++;
    }
  }

  for (const row of leadsByDay) {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}-${String(row.createdAt.getDate()).padStart(2, "0")}`;
    if (dailyMap.has(key)) {
      const current = dailyMap.get(key)!;
      current.leads++;
    }
  }

  // 处理渠道统计
  const channelMap = new Map<string, number>();
  for (const click of linkClicksByChannel) {
    if (click.referer) {
      const attribution = inferChannel(click.referer, {}, undefined);
      const count = channelMap.get(attribution.channel) || 0;
      channelMap.set(attribution.channel, count + 1);
    } else {
      const count = channelMap.get("direct") || 0;
      channelMap.set("direct", count + 1);
    }
  }

  const channels = Array.from(channelMap.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 独立访客数（去重）
  const uniqueVisitors = await db.linkClick.groupBy({
    by: ["ipHash"],
    where: { profileId, createdAt: { gte: start }, ipHash: { not: null } },
    _count: { ipHash: true },
  });

  // 计算有数据标记
  const hasData = totalLinks > 0 || leadsTotal > 0 || linkClicksCount > 0;

  return {
    summary: {
      totalClicks: linkClicksCount,
      uniqueVisitors: uniqueVisitors.length,
      totalLeads: leadsTotal,
      totalLinks,
      productInquiries: productClicks,
    },
    devices: linkClicksByDevice.map(d => ({
      device: d.device || "unknown",
      count: d._count.device,
    })),
    channels,
    leadsByStatus: leadsByStatus.map(s => ({
      status: s.status,
      count: s._count.status,
    })),
    topLinks: topLinks.map(l => ({
      id: l.id,
      title: l.title,
      clicks: l.totalClicks,
      type: l.type,
    })),
    daily: Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      clicks: data.clicks,
      leads: data.leads,
    })),
    hasData,
    range,
  };
}

/**
 * 计算转化漏斗
 */
export async function calculateConversionFunnel(params: {
  profileId: string;
  range?: "today" | "7d" | "30d" | "90d";
}): Promise<ConversionFunnel> {
  const { profileId, range = "30d" } = params;
  const { start, days } = getTimeRange(range);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const metrics = await getCoreMvpMetrics(profileId, { from: start, to: end });

  const funnelSteps: FunnelStep[] = [
    {
      name: "页面访问",
      eventType: "page_view",
      count: metrics.visits,
      conversionRate: 100,
    },
    {
      name: "咨询互动",
      eventType: "contact_click",
      count: metrics.consultations,
      conversionRate: metrics.visits > 0 ? (metrics.consultations / metrics.visits) * 100 : 0,
    },
    {
      name: "有效线索",
      eventType: "lead_create",
      count: metrics.leads,
      conversionRate: metrics.consultations > 0 ? (metrics.leads / metrics.consultations) * 100 : 0,
    },
    {
      name: "已成交",
      eventType: "lead_create",
      count: metrics.conversions,
      conversionRate: metrics.leads > 0 ? (metrics.conversions / metrics.leads) * 100 : 0,
    },
  ];

  return {
    steps: funnelSteps,
    overallConversionRate: metrics.visits > 0
      ? (metrics.conversions / metrics.visits) * 100
      : 0,
    totalLeads: metrics.leads,
  };
}

/**
 * 获取地区分布统计
 */
export async function getGeoStats(params: {
  profileId: string;
  range?: "today" | "7d" | "30d" | "90d";
}) {
  const { profileId, range = "7d" } = params;
  const { start } = getTimeRange(range);

  // 统计国家分布
  const countryStats = await db.linkClick.groupBy({
    by: ["country"],
    where: { profileId, createdAt: { gte: start }, country: { not: null } },
    _count: { country: true },
    orderBy: { _count: { country: "desc" } },
    take: 20,
  });

  // 统计城市分布
  const cityStats = await db.linkClick.groupBy({
    by: ["city"],
    where: { profileId, createdAt: { gte: start }, city: { not: null } },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
    take: 20,
  });

  return {
    countries: countryStats.map(c => ({
      country: c.country || "未知",
      count: c._count.country,
    })),
    cities: cityStats.map(c => ({
      city: c.city || "未知",
      count: c._count.city,
    })),
  };
}

/**
 * 获取短链接的详细统计
 * 基于 ShortLinkClick 模型
 */
export async function getShortLinkStatsByUser(params: {
  userId: string;
  range?: "today" | "7d" | "30d" | "90d";
}): Promise<ShortLinkStat[]> {
  const { userId, range = "7d" } = params;
  const { start, days } = getTimeRange(range);

  // 获取用户的所有短链接
  const shortLinks = await db.shortLink.findMany({
    where: { userId },
    select: { id: true, slug: true, targetUrl: true, totalClicks: true },
  });

  if (shortLinks.length === 0) {
    return [];
  }

  const shortLinkIds = shortLinks.map(sl => sl.id);

  // 并行获取所有短链接的点击数据
  const [
    clicksByShortLink,
    visitorsByShortLink,
    channelsByShortLink,
    devicesByShortLink,
    dailyByShortLink,
  ] = await Promise.all([
    // 各短链接点击数
    db.shortLinkClick.groupBy({
      by: ["shortLinkId"],
      where: { shortLinkId: { in: shortLinkIds }, createdAt: { gte: start } },
      _count: { shortLinkId: true },
    }),
    // 各短链接独立访客数
    db.shortLinkClick.groupBy({
      by: ["shortLinkId"],
      where: { shortLinkId: { in: shortLinkIds }, createdAt: { gte: start }, visitorId: { not: null } },
      _count: { visitorId: true },
    }),
    // 各短链接渠道分布
    db.shortLinkClick.groupBy({
      by: ["shortLinkId", "channel"],
      where: { shortLinkId: { in: shortLinkIds }, createdAt: { gte: start } },
      _count: { channel: true },
    }),
    // 各短链接设备分布
    db.shortLinkClick.groupBy({
      by: ["shortLinkId", "device"],
      where: { shortLinkId: { in: shortLinkIds }, createdAt: { gte: start } },
      _count: { device: true },
    }),
    // 各短链接每日趋势
    db.shortLinkClick.findMany({
      where: { shortLinkId: { in: shortLinkIds }, createdAt: { gte: start } },
      select: { shortLinkId: true, createdAt: true },
    }),
  ]);

  // 构建立即看统计
  const clicksMap = new Map(clicksByShortLink.map(c => [c.shortLinkId, c._count.shortLinkId]));
  const visitorsMap = new Map(visitorsByShortLink.map(v => [v.shortLinkId, v._count.visitorId]));

  // 渠道分布
  const channelsMap = new Map<string, Map<string, number>>();
  for (const c of channelsByShortLink) {
    if (!channelsMap.has(c.shortLinkId)) {
      channelsMap.set(c.shortLinkId, new Map());
    }
    channelsMap.get(c.shortLinkId)!.set(c.channel || "unknown", c._count.channel);
  }

  // 设备分布
  const devicesMap = new Map<string, Map<string, number>>();
  for (const d of devicesByShortLink) {
    if (!devicesMap.has(d.shortLinkId)) {
      devicesMap.set(d.shortLinkId, new Map());
    }
    devicesMap.get(d.shortLinkId)!.set(d.device || "unknown", d._count.device);
  }

  // 每日趋势
  const dailyMap = new Map<string, Map<string, number>>();
  for (const row of dailyByShortLink) {
    if (!dailyMap.has(row.shortLinkId)) {
      dailyMap.set(row.shortLinkId, new Map());
    }
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}-${String(row.createdAt.getDate()).padStart(2, "0")}`;
    const current = dailyMap.get(row.shortLinkId)!.get(key) || 0;
    dailyMap.get(row.shortLinkId)!.set(key, current + 1);
  }

  // 构建返回结果
  return shortLinks.map(sl => {
    // 构建渠道分布
    const channelEntries = channelsMap.get(sl.id);
    const channelDistribution = channelEntries
      ? Array.from(channelEntries.entries()).map(([channel, count]) => ({
          channel,
          label: channel,
          count,
        }))
      : [];

    // 构建设备分布
    const deviceEntries = devicesMap.get(sl.id);
    const deviceDistribution = deviceEntries
      ? Array.from(deviceEntries.entries()).map(([device, count]) => ({
          device,
          count,
        }))
      : [];

    // 构建每日趋势（补全所有天数）
    const dailyEntries = dailyMap.get(sl.id) || new Map();
    const dailyTrend: Array<{ date: string; clicks: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailyTrend.push({ date: key, clicks: dailyEntries.get(key) || 0 });
    }

    return {
      id: sl.id,
      slug: sl.slug,
      targetUrl: sl.targetUrl,
      totalClicks: clicksMap.get(sl.id) || 0,
      uniqueVisitors: visitorsMap.get(sl.id) || 0,
      channelDistribution,
      deviceDistribution,
      dailyTrend,
    };
  });
}

/**
 * 获取短链接单个详情统计
 */
export async function getSingleShortLinkStat(params: {
  shortLinkId: string;
  userId: string;
  range?: "today" | "7d" | "30d" | "90d";
}): Promise<ShortLinkStat | null> {
  const { shortLinkId, userId, range = "7d" } = params;
  const { start, days } = getTimeRange(range);

  // 验证短链接归属
  const shortLink = await db.shortLink.findFirst({
    where: { id: shortLinkId, userId },
    select: { id: true, slug: true, targetUrl: true, totalClicks: true },
  });

  if (!shortLink) {
    return null;
  }

  const [
    clicksCount,
    uniqueVisitors,
    channels,
    devices,
    dailyData,
  ] = await Promise.all([
    db.shortLinkClick.count({
      where: { shortLinkId, createdAt: { gte: start } },
    }),
    db.shortLinkClick.groupBy({
      by: ["visitorId"],
      where: { shortLinkId, createdAt: { gte: start }, visitorId: { not: null } },
      _count: { visitorId: true },
    }),
    db.shortLinkClick.groupBy({
      by: ["channel"],
      where: { shortLinkId, createdAt: { gte: start } },
      _count: { channel: true },
      orderBy: { _count: { channel: "desc" } },
    }),
    db.shortLinkClick.groupBy({
      by: ["device"],
      where: { shortLinkId, createdAt: { gte: start } },
      _count: { device: true },
      orderBy: { _count: { device: "desc" } },
    }),
    db.shortLinkClick.findMany({
      where: { shortLinkId, createdAt: { gte: start } },
      select: { createdAt: true },
    }),
  ]);

  // 构建每日趋势
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyMap.set(key, 0);
  }
  for (const row of dailyData) {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}-${String(row.createdAt.getDate()).padStart(2, "0")}`;
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  return {
    id: shortLink.id,
    slug: shortLink.slug,
    targetUrl: shortLink.targetUrl,
    totalClicks: clicksCount,
    uniqueVisitors: uniqueVisitors.length,
    channelDistribution: channels.map(c => ({
      channel: c.channel || "other",
      label: c.channel || "其他",
      count: c._count.channel,
    })),
    deviceDistribution: devices.map(d => ({
      device: d.device || "unknown",
      count: d._count.device,
    })),
    dailyTrend: Array.from(dailyMap.entries()).map(([date, clicks]) => ({ date, clicks })),
  };
}
