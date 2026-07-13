import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const quantity =
      typeof body.quantity === "number" && Number.isInteger(body.quantity) && body.quantity > 0
        ? body.quantity
        : 1;

    return NextResponse.json({
      success: false,
      code: "ADDON_PAYMENT_NOT_READY",
      message: "AI 加油包支付开通中，敬请期待。",
      requestedQuantity: quantity,
      expectedPriceCents: 990 * quantity,
    });
  } catch (error) {
    console.error("[billing/addons/ai-reception] 请求失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "请求失败" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    code: "AI_RECEPTION_ADDON_INFO",
    name: "AI 接待通用加油包",
    priceCents: 990,
    quantity: 100,
    unit: "session",
    validityDays: 30,
    purchasable: false,
    reason: "支付通道开通中",
  });
}
