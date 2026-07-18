import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { toMainlinePlanLabel } from "@/lib/product/mainline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const entitlements = await getUserEntitlements(user.id);
  const canonicalPlanName = toMainlinePlanLabel(entitlements.planCode);
  const status = entitlements.isLegacyActive
    ? "legacy_active"
    : entitlements.hasActiveMembership
      ? "active"
      : entitlements.isGracePeriod
        ? "grace_period"
        : "inactive";

  return NextResponse.json({
    success: true,
    data: {
      planCode: entitlements.planCode,
      planName: canonicalPlanName,
      planLabel: canonicalPlanName,
      status,
      isPaid: entitlements.hasActiveMembership || entitlements.isGracePeriod,
      isLegacyActive: entitlements.isLegacyActive,
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
      canUpgrade: entitlements.planCode !== "enterprise_pro" && entitlements.planCode !== "internal_test",
    },
  }, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}
