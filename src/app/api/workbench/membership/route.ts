/**
 * Membership API
 * 路径: /api/workbench/membership
 *
 * GET /api/workbench/membership — 获取当前用户的会员订阅信息
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getMembershipWithUsage } from "@/lib/billing/membership";
import { PLAN_DEFINITIONS, PLAN_ORDER } from "@/lib/billing/plans";
import { isPaymentAvailable, isPaymentMethodAvailable } from "@/lib/billing/payments";

export const runtime = "nodejs";

function serializePlanDefinition(plan: (typeof PLAN_DEFINITIONS)[keyof typeof PLAN_DEFINITIONS]) {
  return {
    name: plan.name,
    description: plan.description,
    price_monthly: plan.priceMonthly,
    price_yearly: plan.priceYearly,
    features: plan.features,
    limits: {
      ai_chats_per_month: plan.limits.aiChatsPerMonth,
      products: plan.limits.products,
      knowledge_docs: plan.limits.knowledgeDocs,
      ai_credits_grant: plan.limits.aiCreditsGrant,
      team_seats: plan.limits.teamSeats,
      custom_domain: plan.limits.customDomain,
      remove_branding: plan.limits.removeBranding,
      priority_support: plan.limits.prioritySupport,
    },
    highlight: plan.highlight,
    contact_sales: plan.contactSales,
  };
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const data = await getMembershipWithUsage(user.id);

  const paymentAvailable = await isPaymentAvailable();
  const wechatAvailable = await isPaymentMethodAvailable("wechat");
  const alipayAvailable = await isPaymentMethodAvailable("alipay");

  const planDefinitionsObj: Record<string, ReturnType<typeof serializePlanDefinition>> = {};
  for (const code of PLAN_ORDER) {
    planDefinitionsObj[code] = serializePlanDefinition(PLAN_DEFINITIONS[code]);
  }

  return NextResponse.json({
    success: true,
    subscription: data.subscription.subscriptionId
      ? {
          id: data.subscription.subscriptionId,
          plan_code: data.subscription.planCode,
          status: data.subscription.status,
          current_period_start: data.subscription.currentPeriodStart?.toISOString() ?? null,
          current_period_end: data.subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
    plan: serializePlanDefinition(data.plan),
    ai_usage: data.aiUsage,
    credit_balance: data.creditBalance,
    plan_definitions: planDefinitionsObj,
    plan_order: PLAN_ORDER,
    payment: {
      enabled: paymentAvailable,
      wechat_available: wechatAvailable,
      alipay_available: alipayAvailable,
      sandbox_available: process.env.NODE_ENV === "development",
    },
  });
}
