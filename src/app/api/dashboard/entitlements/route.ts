import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const subscription = await db.membershipSubscription.findUnique({
    where: { userId: user.id },
    select: { planCode: true, status: true },
  });
  const planCode = subscription?.status === "active" ? subscription.planCode : "free";

  return NextResponse.json({
    success: true,
    data: {
      planCode,
      isPaid: planCode !== "free",
    },
  });
}
