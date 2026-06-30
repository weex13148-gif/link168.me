import { NextResponse } from "next/server";
import { getAiDailyUsage } from "@/lib/app-config";
import { AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { getEnterpriseBailianAccessForRequest } from "@/lib/ai/enterprise-bailian";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const enterpriseAccess = await getEnterpriseBailianAccessForRequest(request);
  const { user, config, access } = enterpriseAccess;

  const baseInfo = {
    aiEnabled: config.aiEnabled,
    aiDailyLimitPerUser: config.aiDailyLimitPerUser,
    paymentEnabled: false,
    providerConfigured: access.isConfigured,
  };

  if (!user) {
    return NextResponse.json({
      success: true,
      ...baseInfo,
      authenticated: false,
      isTester: false,
      accessAllowed: false,
      accessReason: access.reason,
      assistants: [],
      availableAssistants: AI_ASSISTANT_LIST.map((item) => ({
        title: item.title,
        displayTitle: item.displayTitle,
        category: item.category,
      })),
    });
  }

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
    isTester: enterpriseAccess.isTester,
    accessAllowed: access.allowed,
    accessReason: access.reason,
    assistants: assistantUsages,
    availableAssistants: AI_ASSISTANT_LIST.map((item) => ({
      title: item.title,
      displayTitle: item.displayTitle,
      category: item.category,
    })),
  });
}
