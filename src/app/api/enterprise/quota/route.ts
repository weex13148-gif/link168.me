import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import {
  getEnterpriseQuotaPool,
  getMemberUsageDetails,
  getUserEnterpriseUsage,
  consumeEnterpriseQuota,
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

    const pool = await getEnterpriseQuotaPool(workspaceId);
    if (!pool) {
      return NextResponse.json(
        { success: false, code: "QUOTA_POOL_NOT_FOUND", message: "额度池不存在" },
        { status: 404 },
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

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workspaceId = body.workspaceId as string;
    const amount = (body.amount as number) || 1;
    const operationId = body.operationId as string;
    const reason = body.reason as string;
    const metadata = (body.metadata as Record<string, unknown>) || undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, code: "WORKSPACE_ID_REQUIRED", message: "请提供工作空间 ID" },
        { status: 400 },
      );
    }

    if (!operationId) {
      return NextResponse.json(
        { success: false, code: "OPERATION_ID_REQUIRED", message: "请提供操作 ID" },
        { status: 400 },
      );
    }

    const result = await consumeEnterpriseQuota({
      workspaceId,
      userId: user.id,
      amount,
      operationId,
      reason: reason || "ai_call",
      metadata,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        consumptionId: result.consumptionId,
        remainingQuota: result.remainingQuota,
        totalQuota: result.totalQuota,
      });
    }

    const statusMap: Record<string, number> = {
      QUOTA_POOL_NOT_FOUND: 404,
      MEMBER_NOT_FOUND: 403,
      MEMBER_NOT_ACTIVE: 403,
      INSUFFICIENT_QUOTA: 402,
      OPERATION_ID_EXISTS: 409,
      DUPLICATE_CONSUMPTION: 400,
      WORKSPACE_INACTIVE: 403,
      PLAN_NOT_ALLOWED: 403,
      PLAN_EXPIRED: 403,
    };

    return NextResponse.json(
      { success: false, code: result.code, message: result.message },
      { status: statusMap[result.code] || 500 },
    );
  } catch (error) {
    console.error("[enterprise-quota] POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}