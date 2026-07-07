import "server-only";
import { db } from "@/lib/db";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceMemberStatus = "invited" | "active" | "disabled" | "removed";

export type WorkspaceType = "personal" | "team" | "enterprise";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 10,
  member: 20,
  admin: 30,
  owner: 40,
};

export function roleAtLeast(role: string, required: WorkspaceRole): boolean {
  const roleLevel = ROLE_HIERARCHY[role as WorkspaceRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[required] ?? 0;
  return roleLevel >= requiredLevel;
}

export function isValidRole(role: unknown): role is WorkspaceRole {
  return typeof role === "string" && ["owner", "admin", "member", "viewer"].includes(role);
}

export function isValidStatus(status: unknown): status is WorkspaceMemberStatus {
  return typeof status === "string" && ["invited", "active", "disabled", "removed"].includes(status);
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  return db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      status: { not: "removed" },
    },
  });
}

export async function assertWorkspaceMember(
  workspaceId: string,
  userId: string,
  options: { minRole?: WorkspaceRole; requireActive?: boolean } = {},
) {
  const { minRole = "viewer", requireActive = true } = options;
  const member = await getWorkspaceMember(workspaceId, userId);

  if (!member) {
    return { allowed: false, code: "WORKSPACE_NOT_FOUND", message: "工作空间不存在或你不是成员。", member: null };
  }

  if (requireActive && member.status !== "active") {
    if (member.status === "invited") {
      return { allowed: false, code: "WORKSPACE_INVITE_PENDING", message: "邀请尚未接受。", member };
    }
    if (member.status === "disabled") {
      return { allowed: false, code: "WORKSPACE_MEMBER_DISABLED", message: "你的成员资格已被禁用。", member };
    }
    return { allowed: false, code: "WORKSPACE_ACCESS_DENIED", message: "无权访问该工作空间。", member };
  }

  if (!roleAtLeast(member.role, minRole)) {
    return { allowed: false, code: "WORKSPACE_INSUFFICIENT_ROLE", message: `需要 ${minRole} 或更高角色权限。`, member };
  }

  return { allowed: true, code: null, message: null, member };
}

export async function getUserWorkspaces(userId: string) {
  return db.workspace.findMany({
    where: {
      isActive: true,
      members: {
        some: {
          userId,
          status: { in: ["active", "invited"] },
        },
      },
    },
    include: {
      members: {
        where: { userId },
        select: { role: true, status: true, joinedAt: true, invitedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkspaceById(workspaceId: string) {
  return db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { status: { not: "removed" } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const SLUG_PATTERN = /^[a-z0-9-]{3,32}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
    .padEnd(3, "ws")
    .slice(0, 32);
}
