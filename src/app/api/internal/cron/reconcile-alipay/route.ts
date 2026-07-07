import { NextResponse } from "next/server";
import { reconcilePendingAlipayOrders } from "@/lib/billing/alipay-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.PAYMENT_RECONCILE_SECRET || process.env.CRON_SECRET || "";
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const header = request.headers.get("x-cron-secret")?.trim() || "";
  return bearer === expected || header === expected;
}

async function run(request: Request) {
  if (!process.env.PAYMENT_RECONCILE_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "补单任务密钥尚未配置。" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "无权执行支付宝补单任务。" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") || "30");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 30;
  const result = await reconcilePendingAlipayOrders(limit);
  return NextResponse.json({ success: true, data: result });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
