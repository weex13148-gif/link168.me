/**
 * 增强统计分析 API
 * 路径: /api/dashboard/analytics
 *
 * 提供更完整的统计数据，包括 30 日趋势、渠道分布、设备分布、短链接统计等
 */
import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAnalyticsStats, calculateConversionFunnel, getGeoStats, getShortLinkStatsByUser } from "@/lib/analytics/stats";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "7d") as "today" | "7d" | "30d" | "90d";
  const includeFunnel = searchParams.get("funnel") === "true";
  const includeGeo = searchParams.get("geo") === "true";
  const includeShortLinks = searchParams.get("shortLinks") === "true";
  const shortLinkId = searchParams.get("shortLinkId"); // 单个短链接详情

  // 验证 range
  if (!["today", "7d", "30d", "90d"].includes(range)) {
    return NextResponse.json(
      { success: false, error: "无效的时间范围。" },
      { status: 400 }
    );
  }

  // 获取用户 profile
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "请先创建个人资料。" },
      { status: 400 }
    );
  }

  // 并行获取所有统计数据
  const [stats, funnel, geo, shortLinksStats] = await Promise.all([
    getAnalyticsStats({
      profileId: profile.id,
      userId: user.id,
      range,
    }),
    includeFunnel ? calculateConversionFunnel({ profileId: profile.id, range }) : null,
    includeGeo ? getGeoStats({ profileId: profile.id, range }) : null,
    includeShortLinks ? getShortLinkStatsByUser({ userId: user.id, range }) : null,
  ]);

  return NextResponse.json({
    success: true,
    stats,
    funnel,
    geo,
    shortLinks: shortLinksStats,
    generatedAt: new Date().toISOString(),
  });
}
