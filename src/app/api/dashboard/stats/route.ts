import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getCoreMvpMetrics } from "@/lib/analytics";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json(
      {
        success: true,
        stats: {
          visits: 0,
          consultations: 0,
          leads: 0,
          conversions: 0,
          totalClicks: 0,
          totalLinks: 0,
          clicksToday: 0,
          clicksLast7Days: 0,
          totalProfileViews: 0,
          totalUniqueVisitors: 0,
          profileViewsToday: 0,
          profileViewsLast7Days: 0,
          ctr: 0,
          byDevice: [],
          topLinks: [],
          daily: [],
          profileDaily: [],
        },
      },
      { status: 200 },
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    coreMetrics,
    totalClicksResult,
    totalLinks,
    clicksTodayCount,
    clicksLast7DaysCount,
    byDeviceResult,
    topLinksResult,
    dailyResult,
    totalProfileViewsCount,
    totalUniqueVisitorsResult,
    profileViewsTodayCount,
    profileViewsLast7DaysCount,
    profileDailyResult,
  ] = await Promise.all([
    getCoreMvpMetrics(profile.id, { from: profile.createdAt, to: tomorrowStart }),
    db.link.aggregate({
      where: { profileId: profile.id },
      _sum: { totalClicks: true },
    }),
    db.link.count({ where: { profileId: profile.id } }),
    db.linkClick.count({
      where: { profileId: profile.id, createdAt: { gte: todayStart } },
    }),
    db.linkClick.count({
      where: { profileId: profile.id, createdAt: { gte: sevenDaysAgoStart } },
    }),
    db.linkClick.groupBy({
      by: ["device"],
      where: { profileId: profile.id },
      _count: { device: true },
      orderBy: { _count: { device: "desc" } },
    }),
    db.link.findMany({
      where: { profileId: profile.id },
      select: { id: true, title: true, totalClicks: true },
      orderBy: { totalClicks: "desc" },
      take: 10,
    }),
    db.linkClick.findMany({
      where: { profileId: profile.id, createdAt: { gte: sevenDaysAgoStart } },
      select: { createdAt: true },
    }),
    db.profileVisit.count({
      where: { profileId: profile.id },
    }),
    db.profileVisit.groupBy({
      by: ["visitorId"],
      where: { profileId: profile.id, visitorId: { not: null } },
      _count: { visitorId: true },
    }),
    db.profileVisit.count({
      where: { profileId: profile.id, createdAt: { gte: todayStart } },
    }),
    db.profileVisit.count({
      where: { profileId: profile.id, createdAt: { gte: sevenDaysAgoStart } },
    }),
    db.profileVisit.findMany({
      where: { profileId: profile.id, createdAt: { gte: sevenDaysAgoStart } },
      select: { createdAt: true, visitorId: true },
    }),
  ]);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgoStart.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap.set(formatDateKey(d), 0);
  }
  for (const row of dailyResult) {
    const key = formatDateKey(row.createdAt);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  const profileDailyMap = new Map<string, { pv: number; uvSet: Set<string> }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgoStart.getTime() + i * 24 * 60 * 60 * 1000);
    profileDailyMap.set(formatDateKey(d), { pv: 0, uvSet: new Set() });
  }
  for (const row of profileDailyResult) {
    const key = formatDateKey(row.createdAt);
    if (profileDailyMap.has(key)) {
      const entry = profileDailyMap.get(key)!;
      entry.pv++;
      if (row.visitorId) {
        entry.uvSet.add(row.visitorId);
      }
    }
  }

  const profileDaily = Array.from(profileDailyMap.entries()).map(([date, data]) => ({
    date,
    pv: data.pv,
    uv: data.uvSet.size,
  }));

  const totalClicks = totalClicksResult._sum.totalClicks || 0;
  const ctr = totalProfileViewsCount > 0 ? Number((totalClicks / totalProfileViewsCount).toFixed(2)) : 0;

  return NextResponse.json({
    success: true,
    stats: {
      ...coreMetrics,
      totalClicks,
      totalLinks,
      clicksToday: clicksTodayCount,
      clicksLast7Days: clicksLast7DaysCount,
      totalProfileViews: totalProfileViewsCount,
      totalUniqueVisitors: totalUniqueVisitorsResult.length,
      profileViewsToday: profileViewsTodayCount,
      profileViewsLast7Days: profileViewsLast7DaysCount,
      ctr,
      byDevice: byDeviceResult.map((r) => ({ device: r.device || "unknown", count: r._count.device })),
      topLinks: topLinksResult.map((l) => ({ id: l.id, title: l.title, clicks: l.totalClicks })),
      daily: profileDaily.map((item) => ({ date: item.date, views: item.pv })),
      clickDaily: daily,
      profileDaily,
    },
  });
}
