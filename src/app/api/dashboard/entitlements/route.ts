import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

function planLabel(planCode: string, planName: string): string {
  if (planName && planName.trim()) return planName;
  const code = planCode.toLowerCase();
  if (code.includes("enterprise")) return "企业版";
  if (code.includes("plus") || code.includes("pro") || code.includes("member")) return "会员版";
  return "免费版";
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const entitlements = await getUserEntitlements(user.id);

  return NextResponse.json({
    success: true,
    data: {
      planCode: entitlements.planCode,
      planName: entitlements.plan.name,
      planLabel: planLabel(entitlements.planCode, entitlements.plan.name),
      status: entitlements.hasActiveMembership ? "active" : (entitlements.isGracePeriod ? "grace_period" : "inactive"),
      isPaid: entitlements.hasActiveMembership || entitlements.isGracePeriod,
      isGracePeriod: entitlements.isGracePeriod,
      gracePeriodDays: entitlements.gracePeriodDays,
      daysRemaining: entitlements.daysRemaining,
      currentPeriodStart: entitlements.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: entitlements.currentPeriodEnd?.toISOString() ?? null,
      features: entitlements.features,
      limits: {
        products: entitlements.limits.products,
        knowledgeDocs: entitlements.limits.knowledgeDocs,
        aiChatsPerMonth: entitlements.limits.aiChatsPerMonth,
        teamSeats: entitlements.limits.teamSeats,
      },
      customThemes: entitlements.features.removeBranding
        ? ["商务黑", "蓝色科技", "橙色活力", "浅绿清新"]
        : [],
      canUpgrade: entitlements.planCode !== "enterprise_pro_plus" && entitlements.planCode !== "internal_test",
    },
  });
}
