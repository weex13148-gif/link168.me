import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import {
  getEnterpriseQuotaOverview,
  getMemberUsageDetails,
  getUserEnterpriseUsage,
} from "@/lib/ai/enterprise-quota";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const action = url.searchParams.get("action");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, code: "WORKSPACE_ID_REQUIRED", message: "请提供工作空间 ID" },
        { status: 400 },
      );
    }

    if (action === "member-details") {
      const details = await getMemberUsageDetails(workspaceId, user.id);
      if (details === null) {
        return NextResponse.json(
          { success: false, code: "ACCESS_DENIED", message: "无权查看成员用量" },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: true, details });
    }

    if (action === "my-usage") {
      const usage = await getUserEnterpriseUsage(workspaceId, user.id);
      return NextResponse.json({ success: true, usage });
    }

    const pool = await getEnterpriseQuotaOverview(workspaceId, user.id);
    if (!pool) {
      return NextResponse.json(
        { success: false, code: "ACCESS_DENIED", message: "无权访问企业额度" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, pool });
  } catch (error) {
    console.error("[enterprise-quota] GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 },
    );
  }
}