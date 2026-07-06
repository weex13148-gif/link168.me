import { getConfig } from "@/lib/app-config";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { isBailianApplicationConfigured } from "@/lib/ai/providers/bailian-application";
import { resolveEnterpriseBailianConfig } from "@/lib/ai/enterprise-bailian";

export type PublicAiAccessCheckResult = {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
};

export type PublicAiServiceConfig = {
  enabled: boolean;
  collectLead: boolean;
  allowTransferToHuman?: boolean;
  allowReport?: boolean;
};

export async function checkPublicAiAccess(args: {
  userId: string;
  serviceConfig: PublicAiServiceConfig | null;
}): Promise<PublicAiAccessCheckResult> {
  const [entitlements, platformConfig] = await Promise.all([
    getUserEntitlements(args.userId),
    getConfig(),
  ]);

  if (!entitlements.features.aiEnabled) {
    return {
      ok: false,
      status: 403,
      error: "该主页暂未开通 AI 接待",
      code: "AI_DISABLED",
    };
  }

  if (!platformConfig.aiEnabled || !platformConfig.aiPublicEnabled) {
    return {
      ok: false,
      status: 403,
      error: "该主页的 AI 接待暂未开启。",
      code: "AI_DISABLED",
    };
  }

  if (!args.serviceConfig?.enabled) {
    return {
      ok: false,
      status: 403,
      error: "该主页的 AI 接待暂未开启。",
      code: "AI_DISABLED",
    };
  }

  const resolved = resolveEnterpriseBailianConfig(platformConfig);
  if (!isBailianApplicationConfigured(resolved)) {
    return {
      ok: false,
      status: 503,
      error: "AI 服务尚未完成配置。",
      code: "AI_NOT_CONFIGURED",
    };
  }

  return { ok: true, status: 200 };
}
