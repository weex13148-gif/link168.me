export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceMemberStatus = "invited" | "active" | "disabled" | "removed";

export type WorkspaceType = "personal" | "team" | "enterprise";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceType: WorkspaceType;
  planCode: string;
  isActive: boolean;
  ownerId?: string;
  myRole: WorkspaceRole | null;
  myStatus: WorkspaceMemberStatus | null;
  joinedAt?: string | null;
  invitedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  invitedBy?: string | null;
  invitedAt: string;
  joinedAt?: string | null;
  disabledAt?: string | null;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  workspaceType?: WorkspaceType;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface AddMemberRequest {
  email: string;
  role?: WorkspaceRole;
}

export interface UpdateMemberRequest {
  memberId: string;
  role?: WorkspaceRole;
  action?: "update_role" | "remove" | "disable" | "enable" | "accept" | "leave";
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  viewer: "查看者",
};

export const STATUS_LABELS: Record<WorkspaceMemberStatus, string> = {
  invited: "待接受",
  active: "活跃",
  disabled: "已禁用",
  removed: "已移除",
};

export function roleAtLeast(role: WorkspaceRole | null, required: WorkspaceRole): boolean {
  const hierarchy: Record<WorkspaceRole, number> = {
    viewer: 10,
    member: 20,
    admin: 30,
    owner: 40,
  };
  const roleLevel = role ? hierarchy[role] ?? 0 : 0;
  const requiredLevel = hierarchy[required] ?? 0;
  return roleLevel >= requiredLevel;
}

export function canManageMember(currentRole: WorkspaceRole | null, targetRole: WorkspaceRole): boolean {
  if (!currentRole) return false;
  if (targetRole === "owner") return false;
  return roleAtLeast(currentRole, targetRole);
}

export function canGrantRole(currentRole: WorkspaceRole | null, targetRole: WorkspaceRole): boolean {
  if (!currentRole) return false;
  if (targetRole === "owner") return false;
  return roleAtLeast(currentRole, targetRole);
}
