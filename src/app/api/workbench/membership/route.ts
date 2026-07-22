import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getMembershipWithUsage } from "@/lib/billing/membership";
import {
  PLAN_DEFINITIONS,
  PUBLIC_PLAN_ORDER,
  formatPriceDisplay,
  getPlanPriceCents,
  normalizePlanCode,
} from "@/lib/billing/plans";
import { getPaymentAvailability } from "@/lib/billing/payments";
import { expireCreditBuckets } from "@/lib/billing/ai-credit-buckets";

export const runtime = "nodejs";

function serializePlanDefinition(plan: (typeof PLAN_DEFINITIONS)[keyof typeof PLAN_DEFINITIONS]) {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price_cents: {
      monthly: getPlanPriceCents(plan.code, "monthly"),
      yearly: getPlanPriceCents(plan.code, "yearly"),
    },
    price_display: {
      monthly: formatPriceDisplay(plan.code, "monthly"),
      yearly: formatPriceDisplay(plan.code, "yearly"),
    },
    currency: plan.currency,
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

  await expireCreditBuckets(user.id);
  const data = await getMembershipWithUsage(user.id);
  const availability = await getPaymentAvailability();
  const planDefinitions: Record<string, ReturnType<typeof serializePlanDefinition>> = {};

  for (const code of PUBLIC_PLAN_ORDER) {
    planDefinitions[code] = serializePlanDefinition(PLAN_DEFINITIONS[code]);
  }

  return NextResponse.json({
    success: true,
    email_verified: user.emailVerified,
    subscription: data.subscription.subscriptionId
      ? {
          id: data.subscription.subscriptionId,
          plan_code: normalizePlanCode(data.subscription.planCode),
          status: data.subscription.status,
          current_period_start: data.subscription.currentPeriodStart?.toISOString() ?? null,
          current_period_end: data.subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
    plan: serializePlanDefinition(data.plan),
    ai_usage: data.aiUsage,
    credit_balance: data.creditBalance,
    plan_definitions: planDefinitions,
    plan_order: PUBLIC_PLAN_ORDER,
    payment: {
      enabled: availability.paymentEnabled && availability.alipayAvailable,
      alipay_available: availability.alipayAvailable,
      alipay_reason: availability.alipayReason ?? null,
      wechat_available: false,
      wechat_status: "微信支付暂不可用",
      sandbox_available: process.env.NODE_ENV === "development",
    },
  });
}
