import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type UsageRow = {
  assistant: string;
  totalCalls: number;
  totalUsers: number;
};

function parseDays(raw: unknown) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(90, Math.floor(parsed));
}

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const days = parseDays(searchParams.get("days"));

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [globalSummary, byAssistant, byUser, byDate] = await Promise.all([
    db.aiUsageLog.aggregate({
      where: { usageDate: { gte: since } },
      _sum: { callCount: true },
      _count: { userId: true },
    }),
    db.$queryRaw<UsageRow[]>`
      SELECT assistant,
             SUM(call_count) AS "totalCalls",
             COUNT(DISTINCT user_id) AS "totalUsers"
      FROM ai_usage_logs
      WHERE usage_date >= ${since}
      GROUP BY assistant
      ORDER BY "totalCalls" DESC
      LIMIT 20;
    `,
    db.$queryRaw<{ userId: string; email: string; totalCalls: number }[]>`
      SELECT users.id AS "userId",
             users.email AS email,
             SUM(logs.call_count) AS "totalCalls"
      FROM ai_usage_logs AS logs
      INNER JOIN users ON users.id = logs.user_id
      WHERE logs.usage_date >= ${since}
      GROUP BY users.id, users.email
      ORDER BY "totalCalls" DESC
      LIMIT 30;
    `,
    db.$queryRaw<{ usageDate: string; totalCalls: number; totalUsers: number }[]>`
      SELECT usage_date AS "usageDate",
             SUM(call_count) AS "totalCalls",
             COUNT(DISTINCT user_id) AS "totalUsers"
      FROM ai_usage_logs
      WHERE usage_date >= ${since}
      GROUP BY usage_date
      ORDER BY usage_date DESC
      LIMIT 90;
    `,
  ]);

  return NextResponse.json({
    success: true,
    days,
    summary: {
      totalCalls: (globalSummary._sum.callCount as number | null) ?? 0,
      uniqueUsers: globalSummary._count.userId ?? 0,
    },
    byAssistant: byAssistant.map((row) => ({
      assistant: String(row.assistant),
      totalCalls: Number(row.totalCalls) || 0,
      totalUsers: Number(row.totalUsers) || 0,
    })),
    byUser: byUser.map((row) => ({
      userId: String(row.userId),
      email: String(row.email),
      totalCalls: Number(row.totalCalls) || 0,
    })),
    byDate: byDate.map((row) => ({
      usageDate: String(row.usageDate),
      totalCalls: Number(row.totalCalls) || 0,
      totalUsers: Number(row.totalUsers) || 0,
    })),
  });
}
