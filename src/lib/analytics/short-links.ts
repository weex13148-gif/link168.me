/**
 * 短链接统计工具库
 * 处理短链接点击记录、渠道归因、统计分析
 */
import { db } from "@/lib/db";
import { parseUTMParams, inferChannel, type AttributionResult, type ChannelSource } from "./attribution";
import { parseDeviceInfo, hashIp, generateVisitorId, getClientIp, type DeviceInfo } from "./events";
import crypto from "crypto";

// 短链接点击记录结构
export interface ShortLinkClickRecord {
  id: string;
  shortLinkId: string;
  profileId: string;
  visitorId: string;        // 匿名访客ID（哈希）
  ipHash: string | null;    // IP哈希（不存储原始IP）
  device: string;
  os: string;
  browser: string;
  country: string | null;
  city: string | null;
  channel: string;          // 渠道来源
  channelLabel: string;      // 渠道显示名
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referer: string | null;
  isPaid: boolean;
  isOrganic: boolean;
  isBot: boolean;
  createdAt: Date;
}

/**
 * 记录短链接点击事件
 */
export async function recordShortLinkClick(params: {
  shortLinkId: string;
  profileId: string;
  request: Request;
  customChannel?: string;
}): Promise<ShortLinkClickRecord> {
  const { shortLinkId, profileId, request, customChannel } = params;

  const headers = request.headers;
  const userAgent = headers.get("user-agent");
  const referer = headers.get("referer");
  const ipRaw = getClientIp(request);
  const ipHash = hashIp(ipRaw);
  const visitorId = generateVisitorId(request);

  // 解析设备和UTM参数
  const deviceInfo = parseDeviceInfo(userAgent);
  const url = new URL(request.url);
  const utmParams = parseUTMParams(url.searchParams);

  // 归因分析
  const attribution: AttributionResult = inferChannel(referer, utmParams, customChannel);

  // 检测机器人
  const isBot = false; // 已在中间件检测

  // 创建点击记录
  const clickRecord = await db.shortLinkClick.create({
    data: {
      id: crypto.randomUUID(),
      shortLinkId,
      profileId,
      visitorId,
      ipHash,
      device: deviceInfo.device,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      country: null, // TODO: 接入IP地理位置服务
      city: null,
      channel: attribution.channel,
      channelLabel: attribution.channelLabel,
      utmSource: attribution.utm.source || null,
      utmMedium: attribution.utm.medium || null,
      utmCampaign: attribution.utm.campaign || null,
      utmContent: attribution.utm.content || null,
      referer: referer || null,
      isPaid: attribution.isPaid,
      isOrganic: attribution.isOrganic,
      isBot,
    },
  });

  // 更新短链接点击计数（非阻塞）
  db.shortLink.update({
    where: { id: shortLinkId },
    data: { totalClicks: { increment: 1 } },
  }).catch((err: unknown) => {
    console.warn("[short-links] 点击计数更新失败:", shortLinkId, err && typeof err === "object" && "message" in err ? (err as Error).message : String(err));
  });

  return clickRecord as Omit<ShortLinkClickRecord, "profileId"> & { profileId: string };
}

/**
 * 获取短链接统计数据
 */
export async function getShortLinkStats(params: {
  shortLinkId: string;
  profileId: string;
  days?: number;
}) {
  const { shortLinkId, profileId, days = 7 } = params;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [clickStats, channelStats, deviceStats, dailyStats] = await Promise.all([
    // 总体统计
    db.shortLinkClick.count({
      where: { shortLinkId, profileId, createdAt: { gte: cutoff } },
    }),
    // 渠道分布
    db.shortLinkClick.groupBy({
      by: ["channel"],
      where: { shortLinkId, profileId, createdAt: { gte: cutoff } },
      _count: { channel: true },
      orderBy: { _count: { channel: "desc" } },
      take: 10,
    }),
    // 设备分布
    db.shortLinkClick.groupBy({
      by: ["device"],
      where: { shortLinkId, profileId, createdAt: { gte: cutoff } },
      _count: { device: true },
      orderBy: { _count: { device: "desc" } },
    }),
    // 每日趋势
    db.shortLinkClick.findMany({
      where: { shortLinkId, profileId, createdAt: { gte: cutoff } },
      select: { createdAt: true },
    }),
  ]);

  // 处理每日趋势
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyMap.set(key, 0);
  }
  for (const row of dailyStats) {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}-${String(row.createdAt.getDate()).padStart(2, "0")}`;
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  // 独立访客数（去重）
  const uniqueVisitors = await db.shortLinkClick.groupBy({
    by: ["visitorId"],
    where: { shortLinkId, profileId, createdAt: { gte: cutoff } },
    _count: { visitorId: true },
  });

  return {
    totalClicks: clickStats,
    uniqueVisitors: uniqueVisitors.length,
    channels: channelStats.map(c => ({
      channel: c.channel,
      label: c.channel,
      count: c._count.channel,
    })),
    devices: deviceStats.map(d => ({
      device: d.device || "unknown",
      count: d._count.device,
    })),
    daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
  };
}
