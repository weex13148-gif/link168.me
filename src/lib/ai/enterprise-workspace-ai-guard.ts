import { db } from "@/lib/db";
import { getUserEntitlements } from "@/lib/billing/entitlements";

const ENTERPRISE_PLAN_CODES = new Set(["enterprise", "enterprise_pro_plus"]);

export type EnterpriseWorkspaceAiAccess =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "USER_NOT_FOUND"
        | "MEMBER_NOT_FOUND"
        | "MEMBER_NOT_ACTIVE"
        | "WORKSPACE_NOT_FOUND"
        | "WORKSPACE_INACTIVE"
        | "PLAN_NOT_ALLOWED"
        | "PLAN_EXPIRED";
      message: string;
    };

export async function assertEnterpriseWorkspaceAiAccess(params: {
  userId: string;
  workspaceId: string;
}): Promise<EnterpriseWorkspaceAiAccess> {
  const { userId, workspaceId } = params;

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { status: true },
  });

  if (!member) {
    return {
      allowed: false,
      code: "MEMBER_NOT_FOUND",
      message: "您不是该企业的成员",
    };
  }

  if (member.status !== "active") {
    return {
      allowed: false,
      code: "MEMBER_NOT_ACTIVE",
      message: "您的企业成员状态无效",
    };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { isActive: true, ownerId: true },
  });

  if (!workspace) {
    return {
      allowed: false,
      code: "WORKSPACE_NOT_FOUND",
      message: "企业工作空间不存在",
    };
  }

  if (!workspace.isActive) {
    return {
      allowed: false,
      code: "WORKSPACE_INACTIVE",
      message: "企业工作空间已停用",
    };
  }

  const ownerEntitlements = await getUserEntitlements(workspace.ownerId);
  if (!ENTERPRISE_PLAN_CODES.has(ownerEntitlements.planCode)) {
    return {
      allowed: false,
      code: "PLAN_NOT_ALLOWED",
      message: "当前企业套餐不支持企业 AI",
    };
  }

  const isActive =
    ownerEntitlements.hasActiveMembership ||
    ownerEntitlements.isLegacyActive ||
    ownerEntitlements.isGracePeriod;
  if (!isActive) {
    return {
      allowed: false,
      code: "PLAN_EXPIRED",
      message: "企业套餐已过期",
    };
  }

  return { allowed: true };
}
