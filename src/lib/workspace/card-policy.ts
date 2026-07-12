import type { WorkspaceRole } from "@/lib/workspace";

export type WorkspaceCardType = "enterprise_home" | "member_card";

export function canManageWorkspaceCard(role: WorkspaceRole | string | null): boolean {
  return role === "owner" || role === "admin";
}

export function canCreateWorkspaceCard(
  role: WorkspaceRole | string | null,
  actorUserId: string,
  cardType: WorkspaceCardType,
  memberUserId: string | null,
): boolean {
  if (canManageWorkspaceCard(role)) return true;
  return role === "member" && cardType === "member_card" && memberUserId === actorUserId;
}

export function canReadWorkspaceCard(
  role: WorkspaceRole | string | null,
  actorUserId: string,
  cardType: WorkspaceCardType,
  memberUserId: string | null,
): boolean {
  if (!role) return false;
  if (cardType === "enterprise_home") {
    return ["owner", "admin", "member", "viewer"].includes(role);
  }
  if (canManageWorkspaceCard(role)) return true;
  return role === "member" && memberUserId === actorUserId;
}

export function canUpdateWorkspaceCard(
  role: WorkspaceRole | string | null,
  actorUserId: string,
  cardType: WorkspaceCardType,
  memberUserId: string | null,
): boolean {
  if (canManageWorkspaceCard(role)) return true;
  return role === "member" && cardType === "member_card" && memberUserId === actorUserId;
}

export function canPublishWorkspaceCard(role: WorkspaceRole | string | null): boolean {
  return canManageWorkspaceCard(role);
}
