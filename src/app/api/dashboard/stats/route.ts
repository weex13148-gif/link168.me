import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function startOfShanghaiDay(date: Date): Date {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - SHANGHAI_OFFSET_MS,
  );
}

function formatShanghaiDateKey(date: Date): string {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) {
    return NextResponse.json({
      success: true,
      stats: {
        totalClicks: 0,
        totalLinks: 0,
        clicksToday: 0,
        clicksLast7Days: 0,
        byDevice: [],
        topLinks: [],
        daily: [],
      },
    });
  }

  const todayStart = startOfShanghaiDay(new Date());
  const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [totalClicksResult, totalLinks, clicksTodayCount, clicksLast7DaysCount, byDeviceResult, topLinksResult, dailyResult] =
    await Promise.all([
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
    ]);

  const dailyMap = new Map<string, number>();
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(sevenDaysAgoStart.getTime() + index * 24 * 60 * 60 * 1000);
    dailyMap.set(formatShanghaiDateKey(date), 0);
  }

  for (const row of dailyResult) {
    const key = formatShanghaiDateKey(row.createdAt);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
  }

  return NextResponse.json({
    success: true,
    stats: {
      totalClicks: totalClicksResult._sum.totalClicks || 0,
      totalLinks,
      clicksToday: clicksTodayCount,
      clicksLast7Days: clicksLast7DaysCount,
      byDevice: byDeviceResult.map((row) => ({ device: row.device || "unknown", count: row._count.device })),
      topLinks: topLinksResult.map((link) => ({ id: link.id, title: link.title, totalClicks: link.totalClicks })),
      daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    },
  });
}
