import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getConfig, getAiDailyUsage, isAiTester } from "@/lib/app-config";

export const runtime = "nodejs";

const ASSISTANT_LIST = ["财税助理", "法务助理", "市场调研助理", "设计助理", "社媒运营助理"];

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const config = await getConfig();

  const baseInfo = {
    aiEnabled: config.aiEnabled,
    aiDailyLimitPerUser: config.aiDailyLimitPerUser,
    paymentEnabled: config.paymentEnabled,
  };

  if (!user) {
    return NextResponse.json({
      success: true,
      ...baseInfo,
      authenticated: false,
      isTester: false,
      assistants: [],
    });
  }

  const tester = await isAiTester(user.email);
  const assistantUsages = await Promise.all(
    ASSISTANT_LIST.map(async (assistant) => ({
      assistant,
      ...(await getAiDailyUsage(user.id, assistant)),
    })),
  );

  return NextResponse.json({
    success: true,
    ...baseInfo,
    authenticated: true,
    isTester: tester,
    userEmail: user.email,
    emailVerified: user.emailVerified,
    assistants: assistantUsages,
  });
}
