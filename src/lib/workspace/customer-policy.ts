import type { WorkspaceRole } from "@/lib/workspace";

function isManager(role: WorkspaceRole | string | null): boolean {
  return role === "owner" || role === "admin";
}

function isAssignedMember(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  return role === "member" && assignedToUserId === userId;
}

export function canManageWorkspaceCustomer(role: WorkspaceRole | string | null): boolean {
  return isManager(role);
}

export function canReassignWorkspaceCustomer(role: WorkspaceRole | string | null): boolean {
  return isManager(role);
}

export function canReadWorkspaceCustomer(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  return isManager(role) || isAssignedMember(role, userId, assignedToUserId);
}

export function canUpdateWorkspaceCustomer(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  return isManager(role) || isAssignedMember(role, userId, assignedToUserId);
}

export function canCreateWorkspaceCustomerTask(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  return isManager(role) || isAssignedMember(role, userId, assignedToUserId);
}

export function canUpdateWorkspaceCustomerTask(
  role: WorkspaceRole | string | null,
  userId: string,
  assignedToUserId: string | null,
): boolean {
  return isManager(role) || isAssignedMember(role, userId, assignedToUserId);
}
