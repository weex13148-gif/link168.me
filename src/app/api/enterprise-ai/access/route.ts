import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getAiDailyUsage, getConfig, isAiTester } from "@/lib/app-config";
import { AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const config = await getConfig();

  const baseInfo = {
    aiEnabled: config.aiEnabled,
    aiDailyLimitPerUser: config.aiDailyLimitPerUser,
    paymentEnabled: false,
  };

  if (!user) {
    return NextResponse.json({
      success: true,
      ...baseInfo,
      authenticated: false,
      isTester: false,
      providerConfigured: false,
      assistants: [],
      availableAssistants: AI_ASSISTANT_LIST.map((item) => ({
        title: item.title,
        displayTitle: item.displayTitle,
        category: item.category,
      })),
    });
  }

  const tester = await isAiTester(user.email);
  const sampleDefinition = AI_ASSISTANT_LIST[0];
  const providerConfig = sampleDefinition ? await getProviderConfig(sampleDefinition) : null;
  const providerConfigured = providerConfig ? isProviderConfigured(providerConfig) : false;

  const assistantUsages = await Promise.all(
    AI_ASSISTANT_LIST.map(async (assistant) => ({
      assistant: assistant.displayTitle,
      title: assistant.title,
      category: assistant.category,
      ...(await getAiDailyUsage(user.id, assistant.displayTitle)),
    })),
  );

  return NextResponse.json({
    success: true,
    ...baseInfo,
    authenticated: true,
    isTester: tester,
    userEmail: user.email,
    emailVerified: user.emailVerified,
    providerConfigured,
    assistants: assistantUsages,
  });
}
