import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { getAiAccessLevel, getAiQuota, checkUserAiRestricted } from "@/lib/ai/permissions";
import { AI_ASSISTANT_LIST, AI_ASSISTANT_TITLES } from "@/lib/ai/assistants";
import { getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";
import { AI_ASSISTANTS as APP_CONFIG_AI_ASSISTANTS } from "@/lib/app-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const config = await getConfig();
  const access = await getAiAccessLevel(user.id);
  const quota = await getAiQuota(user.id);
  const aiRestriction = await checkUserAiRestricted(user.id);

  const providerConfig = await getProviderConfig(AI_ASSISTANT_LIST[0]);
  const isConfigured = isProviderConfigured(providerConfig) && config.aiEnabled;

  const assistants = AI_ASSISTANT_LIST.map((assistant) => {
    const displayTitle = assistant.displayTitle;
    const enabled = isAssistantEnabled(config, displayTitle);
    return {
      key: assistant.title,
      title: assistant.title,
      displayTitle: assistant.displayTitle,
      category: assistant.category,
      role: assistant.role,
      capabilities: assistant.capabilities,
      enabled,
      riskNotice: assistant.riskNotice,
    };
  });

  return NextResponse.json({
    success: true,
    status: {
      aiEnabled: config.aiEnabled,
      providerConfigured: isConfigured,
      providerName: providerConfig.provider,
      modelName: providerConfig.model,
    },
    access: {
      level: access.access,
      planCode: access.planCode,
      isActiveMember: access.isActiveMember,
      reason: access.reason,
    },
    quota: {
      planUsage: quota.planUsage,
      dailyUsage: quota.dailyUsage,
      creditBalance: quota.creditBalance,
      canCall: quota.canCall,
    },
    // AI 冻结状态
    aiRestriction: {
      restricted: aiRestriction.restricted,
      type: aiRestriction.type,
      reason: aiRestriction.reason,
      expiresAt: aiRestriction.expiresAt?.toISOString() ?? null,
    },
    assistants,
  });
}
