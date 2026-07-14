import { db } from "@/lib/db";

export type EnterpriseWorkspaceGuardResult =
  | {
      ok: true;
      workspaceId: string;
      userId: string;
      workspaceName: string;
      planCode: string;
      memberRole: string;
    }
  | {
      ok: false;
      code:
        | "INVALID_WORKSPACE_ID"
        | "WORKSPACE_NOT_FOUND"
        | "WORKSPACE_INACTIVE"
        | "NOT_A_MEMBER"
        | "MEMBER_INACTIVE"
        | "PLAN_REQUIRED";
      message: string;
    };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateWorkspaceId(workspaceId: unknown): EnterpriseWorkspaceGuardResult | null {
  if (!workspaceId || typeof workspaceId !== "string") {
    return { ok: false, code: "INVALID_WORKSPACE_ID", message: "缺少工作空间 ID" };
  }

  const trimmed = workspaceId.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID_WORKSPACE_ID", message: "工作空间 ID 不能为空" };
  }

  if (!UUID_REGEX.test(trimmed)) {
    return { ok: false, code: "INVALID_WORKSPACE_ID", message: "工作空间 ID 格式不正确" };
  }

  return null;
}

export async function guardEnterpriseWorkspaceAiAccess(params: {
  workspaceId: string;
  userId: string;
}): Promise<EnterpriseWorkspaceGuardResult> {
  const validation = validateWorkspaceId(params.workspaceId);
  if (validation) {
    return validation;
  }

  try {
    const [workspace, member] = await Promise.all([
      db.workspace.findUnique({
        where: { id: params.workspaceId },
        select: { id: true, name: true, isActive: true, planCode: true },
      }),
      db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: params.workspaceId, userId: params.userId } },
        select: { role: true, status: true },
      }),
    ]);

    if (!workspace) {
      return { ok: false, code: "WORKSPACE_NOT_FOUND", message: "工作空间不存在" };
    }

    if (!workspace.isActive) {
      return { ok: false, code: "WORKSPACE_INACTIVE", message: "工作空间已停用" };
    }

    if (!member) {
      return { ok: false, code: "NOT_A_MEMBER", message: "您不是该工作空间的成员" };
    }

    if (member.status !== "active") {
      return { ok: false, code: "MEMBER_INACTIVE", message: "您的工作空间成员状态无效" };
    }

    if (workspace.planCode === "free") {
      return { ok: false, code: "PLAN_REQUIRED", message: "企业 AI 需要有效的企业套餐" };
    }

    return {
      ok: true,
      workspaceId: workspace.id,
      userId: params.userId,
      workspaceName: workspace.name,
      planCode: workspace.planCode,
      memberRole: member.role,
    };
  } catch (error) {
    console.error("[enterprise-workspace-ai-guard] guard failed:", error);
    return { ok: false, code: "WORKSPACE_NOT_FOUND", message: "工作空间访问失败，请稍后重试" };
  }
}

export async function isEnterpriseWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const validation = validateWorkspaceId(workspaceId);
  if (validation) {
    return false;
  }

  try {
    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { status: true },
    });

    return !!member && member.status === "active";
  } catch {
    return false;
  }
}

export async function getEnterpriseWorkspacePlan(workspaceId: string): Promise<string | null> {
  const validation = validateWorkspaceId(workspaceId);
  if (validation) {
    return null;
  }

  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { planCode: true },
    });

    return workspace?.planCode ?? null;
  } catch {
    return null;
  }
}