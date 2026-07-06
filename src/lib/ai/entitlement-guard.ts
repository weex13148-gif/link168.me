// ============================================================================
// 统一 AI 权益守卫（AI Entitlement Guard）
// ----------------------------------------------------------------------------
// 所有真实 AI API 入口必须经过此守卫，确保：
// 1. 免费用户无法通过直接请求 API 产生真实 AI 调用
// 2. 未登录用户无法调用经营 AI
// 3. 套餐未知/缺失默认拒绝
// 4. 过期会员（非宽限期内）被拒绝
// 5. 额度不足被拒绝
// 6. AI 冻结用户被拒绝
// 7. 用量类型（visitor_reception / business_ai / showcase_demo / enterprise_ai）可区分
//
// 权威来源：
// - 套餐额度：src/lib/billing/plans.ts（PLAN_DEFINITIONS.limits.aiChatsPerMonth）
// - 权益判断：src/lib/billing/entitlements/index.ts（getUserEntitlements）
// - AI 冻结：src/lib/ai/permissions.ts（checkUserAiRestricted）
// ============================================================================

import { getUserEntitlements, type UserEntitlements } from "@/lib/billing/entitlements";
import { checkUserAiRestricted, type AiRestrictionResult } from "@/lib/ai/permissions";

// ---------- 用量类型 ----------
export type AiUsageType =
  | "visitor_reception"   // 访客侧 AI 接待（主页访客对话，消耗主页所有者额度）
  | "business_ai"         // 用户侧经营 AI（workbench 五大助手）
  | "showcase_demo"       // Showcase 演示（不消耗用户额度，独立配额）
  | "enterprise_ai";      // 企业 AI（enterprise-ai 路由）

// ---------- 守卫决策 ----------
export type AiEntitlementDecision =
  | {
      ok: true;
      userId: string;
      entitlements: UserEntitlements;
      restriction: AiRestrictionResult;
      usageType: AiUsageType;
    }
  | {
      ok: false;
      userId: string;
      code:
        | "AI_UNAUTHENTICATED"        // 未登录
        | "AI_RESTRICTED"             // AI 冻结
        | "AI_ENTITLEMENT_REQUIRED"   // 免费用户/无 AI 权限/未知套餐
        | "AI_MEMBERSHIP_EXPIRED"     // 会员过期（非宽限期）
        | "AI_QUOTA_EXHAUSTED";      // 额度耗尽
      message: string;
      status: number;
      usageType: AiUsageType;
      restriction?: AiRestrictionResult;
    };

// ---------- 统一守卫 ----------
/**
 * 统一 AI 权益守卫。
 *
 * @param userId  用户 ID（访客接待场景传入主页所有者 userId）
 * @param usageType 用量类型，用于区分访客 AI / 经营 AI / Showcase / 企业 AI
 *
 * 规则：
 * - 未传入 userId 视为未登录，拒绝（showcase_demo 除外，由调用方单独鉴权）
 * - 免费用户（planCode === "free"）拒绝
 * - features.aiEnabled === false 拒绝
 * - 非有效会员且不在宽限期内拒绝
 * - 套餐月度额度耗尽（非 -1 且 remaining <= 0）拒绝
 * - AI 冻结拒绝
 *
 * 注意：本守卫只做"是否允许调用"判断，不消耗额度。
 * 额度消耗由调用方通过 consumeCredit / consumeAiCredits 完成。
 */
export async function assertAiEntitlement(
  userId: string | null | undefined,
  usageType: AiUsageType,
): Promise<AiEntitlementDecision> {
  // 1. 未登录检查（showcase_demo 不走此守卫，由调用方单独鉴权）
  if (!userId) {
    return {
      ok: false,
      userId: "",
      code: "AI_UNAUTHENTICATED",
      message: "请先登录后再使用 AI 功能。",
      status: 401,
      usageType,
    };
  }

  // 2. AI 冻结/封禁检查
  const restriction = await checkUserAiRestricted(userId);
  if (restriction.restricted) {
    return {
      ok: false,
      userId,
      code: "AI_RESTRICTED",
      message: "当前账号 AI 功能已被限制，请联系管理员。",
      status: 403,
      usageType,
      restriction,
    };
  }

  // 3. 套餐权益检查（单一权威来源：entitlements → plans.ts）
  const entitlements = await getUserEntitlements(userId);

  // 免费用户拒绝真实 AI 调用
  if (entitlements.planCode === "free") {
    return {
      ok: false,
      userId,
      code: "AI_ENTITLEMENT_REQUIRED",
      message: "当前套餐不支持真实 AI 调用，请升级会员。",
      status: 403,
      usageType,
    };
  }

  // aiEnabled 为 false（套餐未知或额度为 0）拒绝
  if (!entitlements.features.aiEnabled) {
    return {
      ok: false,
      userId,
      code: "AI_ENTITLEMENT_REQUIRED",
      message: "当前套餐不支持 AI 功能，请升级会员。",
      status: 403,
      usageType,
    };
  }

  // 4. 会员有效期检查（非有效会员且不在宽限期内拒绝）
  const isActive = entitlements.hasActiveMembership || entitlements.isLegacyActive || entitlements.isGracePeriod;
  if (!isActive) {
    return {
      ok: false,
      userId,
      code: "AI_MEMBERSHIP_EXPIRED",
      message: "会员已过期，请续费后继续使用 AI 功能。",
      status: 403,
      usageType,
    };
  }

  // 5. 额度检查（套餐月度额度耗尽拒绝）
  const aiLimit = entitlements.limits.aiChatsPerMonth.max;
  const aiRemaining = entitlements.limits.aiChatsPerMonth.remaining;
  // aiLimit === -1 表示无限额度（enterprise / enterprise_pro_plus / internal_test），不拦截
  if (aiLimit !== -1 && aiRemaining <= 0) {
    return {
      ok: false,
      userId,
      code: "AI_QUOTA_EXHAUSTED",
      message: "本月 AI 额度已用完，请升级套餐或购买额度包。",
      status: 402,
      usageType,
    };
  }

  // 6. 通过
  return {
    ok: true,
    userId,
    entitlements,
    restriction,
    usageType,
  };
}

// ---------- 工具函数：构造统一错误响应 ----------
/**
 * 将守卫拒绝决策转为统一 JSON 响应结构。
 *
 * 返回结构示例：
 * ```json
 * {
 *   "ok": false,
 *   "code": "AI_ENTITLEMENT_REQUIRED",
 *   "message": "当前套餐不支持真实 AI 调用，请升级会员。"
 * }
 * ```
 */
export function aiEntitlementErrorResponse(decision: Extract<AiEntitlementDecision, { ok: false }>) {
  return {
    ok: false as const,
    code: decision.code,
    message: decision.message,
    usageType: decision.usageType,
  };
}

// ---------- 工具函数：构造 usage metadata ----------
/**
 * 构造写入 Credit Ledger / Telemetry 的 metadata，包含用量类型。
 * 用于访客 AI 与经营 AI 用量类型分离（逻辑层面）。
 */
export function buildAiUsageMetadata(args: {
  usageType: AiUsageType;
  assistant?: string;
  provider?: string;
  sessionId?: string;
  conversationId?: string;
  visitorSessionId?: string;
  extra?: Record<string, string | number | boolean | null>;
}): Record<string, string | number | boolean | null> {
  return {
    usageType: args.usageType,
    assistant: args.assistant ?? null,
    provider: args.provider ?? null,
    sessionId: args.sessionId ?? null,
    conversationId: args.conversationId ?? null,
    visitorSessionId: args.visitorSessionId ?? null,
    ...(args.extra ?? {}),
  };
}
