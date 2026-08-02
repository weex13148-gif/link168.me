import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { AI_CREDIT_ADDONS, getAiCreditAddon } from "@/lib/billing/plans";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { createAddonOrder, updateOrderPaymentChannel } from "@/lib/billing/orders";
import { createPayment, getPaymentAvailability } from "@/lib/billing/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  if (!user.emailVerified) {
    return NextResponse.json(
      { success: false, code: "EMAIL_UNVERIFIED", message: "请先完成邮箱验证，再购买 AI 点数包。" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const addonCode = typeof body.addonCode === "string" ? body.addonCode : "";
    const addon = getAiCreditAddon(addonCode);
    if (!addon) {
      return NextResponse.json(
        { success: false, code: "ADDON_NOT_FOUND", message: "请选择有效的 AI 点数包。" },
        { status: 400 },
      );
    }

    const entitlements = await getUserEntitlements(user.id);
    const hasPaidAccess = entitlements.hasActiveMembership || entitlements.isLegacyActive || entitlements.isGracePeriod;
    if (entitlements.planCode === "free" || !hasPaidAccess) {
      return NextResponse.json(
        { success: false, code: "ADDON_MEMBERSHIP_REQUIRED", message: "AI 点数包仅限有效付费会员购买。" },
        { status: 403 },
      );
    }

    const availability = await getPaymentAvailability();
    if (!availability.paymentEnabled || !availability.alipayAvailable) {
      return NextResponse.json(
        {
          success: false,
          code: "ADDON_PAYMENT_UNAVAILABLE",
          message: availability.alipayReason || "当前环境暂不支持支付宝购买点数包。",
        },
        { status: 503 },
      );
    }

    const order = await createAddonOrder({
      userId: user.id,
      addonCode: addon.code,
      metadata: { source: "workbench_ai_credit_addon", paymentChannel: "alipay" },
    });
    const paymentResult = await createPayment(order, "alipay");
    if (!paymentResult.success) {
      return NextResponse.json(
        { success: false, code: "ADDON_PAYMENT_CREATE_FAILED", message: paymentResult.errorMessage || "支付宝下单失败", order },
        { status: 502 },
      );
    }

    const processingOrder = await updateOrderPaymentChannel(order.id, user.id, "alipay");
    if (!processingOrder) {
      return NextResponse.json(
        { success: false, code: "ADDON_ORDER_CONFLICT", message: "订单状态更新失败，请重新下单。" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      code: "ADDON_ORDER_CREATED",
      addon,
      order: processingOrder,
      payment: { method: "alipay", payUrl: paymentResult.payUrl, orderInfo: paymentResult.orderInfo },
    });
  } catch (error) {
    console.error("[billing/addons/ai-reception] 请求失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "请求失败" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const [entitlements, availability] = await Promise.all([
    getUserEntitlements(user.id),
    getPaymentAvailability(),
  ]);
  const paid = entitlements.planCode !== "free" &&
    (entitlements.hasActiveMembership || entitlements.isLegacyActive || entitlements.isGracePeriod);
  const purchasable = user.emailVerified && paid && availability.paymentEnabled && availability.alipayAvailable;

  return NextResponse.json({
    success: true,
    code: "AI_CREDIT_ADDON_CATALOG",
    addons: AI_CREDIT_ADDONS,
    purchasable,
    reason: purchasable
      ? null
      : !user.emailVerified
        ? "请先验证邮箱"
        : !paid
          ? "仅限有效付费会员购买"
          : availability.alipayReason || "支付宝暂不可用",
  });
}
