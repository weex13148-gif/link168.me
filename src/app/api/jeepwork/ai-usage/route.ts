import { NextResponse } from "next/server";
import { requireJeepworkAdmin } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { getTelemetryStats, getUserTelemetryStats } from "@/lib/ai/telemetry";
import { listAiRiskEvents } from "@/lib/ai/risk-log";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7", 10), 90);

  try {
    // 1. 从 AiUsageLog 获取基本调用统计
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usageLogs = await db.aiUsageLog.groupBy({
      by: ["assistant"],
      where: {
        usageDate: { gte: startDate },
      },
      _sum: { callCount: true },
    });

    const totalCalls = usageLogs.reduce((acc, row) => acc + (row._sum.callCount || 0), 0);

    // 按 Agent 统计
    const byAssistant = usageLogs.map((row) => ({
      assistant: row.assistant,
      model: null,
      requestCount: row._sum.callCount || 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      avgLatencyMs: 0,
      cost: 0,
    }));

    // 2. 从内存 telemetry 获取详细统计（如果有数据）
    const telemetryStats = getTelemetryStats({ days });

    // 3. 从风险事件获取错误分类
    const riskEventsResult = await listAiRiskEvents({ limit: 1000 });
    const errorClassification: Record<string, number> = { "401": 0, "404": 0, "429": 0, "5xx": 0, "other": 0 };

    for (const event of riskEventsResult.events) {
      const meta = event.metadata as Record<string, unknown>;
      const status = typeof meta.status === "number" ? meta.status : null;

      if (status === 401) errorClassification["401"]++;
      else if (status === 404) errorClassification["404"]++;
      else if (status === 429) errorClassification["429"]++;
      else if (status && status >= 500) errorClassification["5xx"]++;
      else errorClassification["other"]++;
    }

    // 4. 按用户统计（从 AiUsageLog）
    const userStats = await db.aiUsageLog.groupBy({
      by: ["userId"],
      where: {
        usageDate: { gte: startDate },
      },
      _sum: { callCount: true },
    });

    const userIds = userStats.map((s) => s.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const userEmailMap = new Map(users.map((u) => [u.id, u.email]));

    const byUser = userStats
      .map((row) => ({
        userId: row.userId,
        email: userEmailMap.get(row.userId) ?? "未知",
        totalCalls: row._sum.callCount || 0,
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 50);

    // 5. 按日期统计
    const dailyStats = await db.aiUsageLog.groupBy({
      by: ["usageDate"],
      where: {
        usageDate: { gte: startDate },
      },
      _sum: { callCount: true },
    });

    const byDate = dailyStats
      .map((row) => ({
        usageDate: row.usageDate.toISOString().split("T")[0],
        totalCalls: row._sum.callCount || 0,
        totalUsers: 0,
      }))
      .sort((a, b) => a.usageDate.localeCompare(b.usageDate));

    // 6. 估算成本（基于 telemetry 数据或使用默认）
    const estimatedCost = telemetryStats.totalCalls > 0
      ? telemetryStats.totalCost
      : totalCalls * 0.001; // 假设每次调用平均 0.001 元

    return NextResponse.json({
      success: true,
      data: {
        days,
        summary: {
          totalCalls,
          uniqueUsers: userStats.length,
          totalInputTokens: telemetryStats.totalInputTokens,
          totalOutputTokens: telemetryStats.totalOutputTokens,
          totalTokens: telemetryStats.totalTokens,
          avgLatencyMs: telemetryStats.avgLatencyMs,
          estimatedCost: parseFloat(estimatedCost.toFixed(4)),
        },
        byAssistant,
        byModel: Object.entries(telemetryStats.byModel).map(([model, data]) => ({
          model,
          requestCount: data.calls,
          promptTokens: data.inputTokens,
          completionTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          avgLatencyMs: data.avgLatencyMs,
          cost: parseFloat(data.cost.toFixed(4)),
        })),
        byUser,
        byDate,
        successCalls: telemetryStats.successCalls || totalCalls,
        errorCalls: telemetryStats.errorCalls || 0,
        blockedCalls: telemetryStats.blockedCalls || 0,
        errorClassification,
        byBlockReason: telemetryStats.byBlockReason,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[jeepwork/ai-usage] query failed:", { message });
    return apiError("DB_ERROR", "统计信息获取失败", 500);
  }
}
