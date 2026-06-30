import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getReconciliationReport, getDiscrepancyDetail, getTestReconciliationData } from "@/lib/billing/reconciliation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const errorResponse = await requireSuperAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const useTestData = url.searchParams.get("useTestData") === "true";
  const orderId = url.searchParams.get("orderId");

  try {
    if (orderId) {
      const detail = await getDiscrepancyDetail(orderId);
      if (!detail) {
        return NextResponse.json(
          { success: false, error: "记录不存在" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, detail });
    }

    const report = useTestData
      ? await getTestReconciliationData()
      : await getReconciliationReport();

    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error("[admin/reconciliation] 查询对账报告失败:", error);
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    );
  }
}
