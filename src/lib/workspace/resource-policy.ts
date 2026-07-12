import type { WorkspaceRole } from "@/lib/workspace";

export const WORKSPACE_RESOURCE_TYPES = ["product", "knowledge_doc"] as const;

export type WorkspaceResourceType = (typeof WORKSPACE_RESOURCE_TYPES)[number];

export function isWorkspaceResourceType(value: unknown): value is WorkspaceResourceType {
  return typeof value === "string" && WORKSPACE_RESOURCE_TYPES.includes(value as WorkspaceResourceType);
}

export function canReadWorkspaceResource(role: WorkspaceRole | string | null): boolean {
  return ["owner", "admin", "member", "viewer"].includes(role || "");
}

export function canManageWorkspaceResource(role: WorkspaceRole | string | null): boolean {
  return role === "owner" || role === "admin";
}

export function canViewWorkspaceResourceAssignment(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  if (role === "owner" || role === "admin") return true;
  if (role === "member" || role === "viewer") {
    return assignedToUserId === null || assignedToUserId === userId;
  }
  return false;
}
