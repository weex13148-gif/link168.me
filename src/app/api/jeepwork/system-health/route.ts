// 平台运维健康检查 API
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import {
  getFullHealthReport,
  checkDatabaseHealth,
  checkRedisHealth,
  checkMailHealth,
  checkAiServiceHealth,
  checkUploadHealth,
  getScheduledTaskRegistry,
  getTaskExecutionStatus,
  getCleanupDryRun,
  getPreDeploymentReport,
  getSystemOverview,
} from "@/lib/ops/health";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  try {
    switch (section) {
      case "overview":
        return NextResponse.json({ success: true, data: await getSystemOverview() });

      case "database":
        return NextResponse.json({ success: true, data: await checkDatabaseHealth() });

      case "redis":
        return NextResponse.json({ success: true, data: await checkRedisHealth() });

      case "mail":
        return NextResponse.json({ success: true, data: await checkMailHealth() });

      case "ai":
        return NextResponse.json({ success: true, data: await checkAiServiceHealth() });

      case "upload":
        return NextResponse.json({ success: true, data: await checkUploadHealth() });

      case "tasks":
        return NextResponse.json({ success: true, data: await getScheduledTaskRegistry() });

      case "task-execution":
        return NextResponse.json({ success: true, data: await getTaskExecutionStatus() });

      case "dry-run":
        return NextResponse.json({ success: true, data: await getCleanupDryRun() });

      case "pre-deployment":
        return NextResponse.json({ success: true, data: await getPreDeploymentReport() });

      default:
        // 返回完整报告
        return NextResponse.json({ success: true, data: await getFullHealthReport() });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "HEALTH_CHECK_ERROR",
          message: error instanceof Error ? error.message : "健康检查失败",
        },
      },
      { status: 500 },
    );
  }
}
