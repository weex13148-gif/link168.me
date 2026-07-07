import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveRestrictions, canShowPublicProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { parseDeviceInfo, hashIp, getClientIp, isPotentialBot, generateVisitorId } from "@/lib/analytics/events";
import { parseUTMParams, inferChannel } from "@/lib/analytics/attribution";
import crypto from "crypto";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { slug } });
  if (!shortLink) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // 检查启用状态
  if (!shortLink.isEnabled) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // 检查过期时间
  if (shortLink.expiresAt && new Date(shortLink.expiresAt) < new Date()) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // 检查 owner 冻结/封禁状态
  try {
    const restrictions = await getActiveRestrictions(shortLink.userId);
    if (!canShowPublicProfile(restrictions).ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 机器人检测
  if (isPotentialBot(request)) {
    // 机器人不记录点击，但允许跳转
    return NextResponse.redirect(shortLink.targetUrl, 302);
  }

  // 获取客户端信息
  const userAgent = request.headers.get("user-agent");
  const referer = request.headers.get("referer");
  const ipRaw = getClientIp(request);
  const deviceInfo = parseDeviceInfo(userAgent);
  const visitorId = generateVisitorId(request);
  const ipHash = hashIp(ipRaw);

  // 解析 UTM 参数
  const url = new URL(request.url);
  const utmParams = parseUTMParams(url.searchParams);

  // 归因分析
  const attribution = inferChannel(referer, utmParams);

  // 为该短链接创建点击记录（ShortLinkClick 模型已存在）
  // 查询 Profile.id（ShortLinkClick.profileId 指向 Profile.id，不是 User.id）
  let profileId: string | null = null;
  try {
    const profile = await db.profile.findUnique({ where: { userId: shortLink.userId } });
    profileId = profile?.id ?? null;
  } catch {
    // 查询 Profile 失败不阻断跳转
  }

  try {
    await db.shortLinkClick.create({
      data: {
        id: crypto.randomUUID(),
        shortLinkId: shortLink.id,
        profileId,
        visitorId,
        ipHash,
        device: deviceInfo.device,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        country: null, // TODO: 接入 IP 地理位置服务
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
        isBot: false,
      },
    });
  } catch (err) {
    // 静默失败，不影响跳转
    console.error("[short-link-click] 记录点击失败:", err);
  }

  // 更新点击计数（带限流）
  const clickRl = await rateLimit(request, `short-link-click:${slug}`, 5, 1000);
  if (clickRl.passed) {
    try {
      await db.shortLink.update({
        where: { id: shortLink.id },
        data: { totalClicks: { increment: 1 } },
      });
    } catch {
      // 静默失败：避免计数问题影响用户跳转
    }
  }

  return NextResponse.redirect(shortLink.targetUrl, 302);
}
