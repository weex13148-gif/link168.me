import { NextResponse } from "next/server";
import { processMembershipExpiry } from "@/lib/billing/membership-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET || process.env.PAYMENT_RECONCILE_SECRET || "";
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const header = request.headers.get("x-cron-secret")?.trim() || "";
  return bearer === expected || header === expected;
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET && !process.env.PAYMENT_RECONCILE_SECRET) {
    return NextResponse.json(
      { success: false, error: "会员到期任务密钥尚未配置。" },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "无权执行会员到期处理任务。" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const rawBatchSize = Number(url.searchParams.get("batchSize") || "50");
    const batchSize = Number.isFinite(rawBatchSize)
      ? Math.min(Math.max(Math.trunc(rawBatchSize), 1), 200)
      : 50;
    const cursor = url.searchParams.get("cursor") || undefined;

    const result = await processMembershipExpiry(batchSize, cursor);

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        expired: result.expired,
        gracePeriod: result.gracePeriod,
        skipped: result.skipped,
        failed: result.failed,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor || null,
        results: result.results.map((r) => ({
          userId: r.userId,
          action: r.action,
          previousPlan: r.previousPlan,
          newPlan: r.newPlan,
          previousStatus: r.previousStatus,
          newStatus: r.newStatus,
          reason: r.reason || null,
        })),
      },
    });
  } catch (error) {
    console.error("[internal/membership-expiry] 执行异常:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "会员到期处理执行失败",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
