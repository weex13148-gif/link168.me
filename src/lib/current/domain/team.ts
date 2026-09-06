import type {
  CurrentActorContext,
  CurrentMembershipRole,
  CurrentOffering,
  CurrentPageDraftDocument,
  CurrentPageKind,
  CurrentResult,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
} from "@/lib/current/contracts";
import { currentErr, currentOk, isRecord } from "@/lib/current/domain/shared";
import { isDeepStrictEqual } from "node:util";

const ROLE_PRIORITY: Record<CurrentMembershipRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function isMembershipActive(member: CurrentWorkspaceMemberRecord): boolean {
  return member.status === "active";
}

export function hasWorkspaceRole(
  member: CurrentWorkspaceMemberRecord,
  minimumRole: CurrentMembershipRole,
): boolean {
  return ROLE_PRIORITY[member.role] >= ROLE_PRIORITY[minimumRole];
}

export function authorizeWorkspaceActor(
  actor: CurrentActorContext,
  workspace: CurrentWorkspaceRecord,
  membership: CurrentWorkspaceMemberRecord | null,
  minimumRole: CurrentMembershipRole,
): CurrentResult<true> {
  if (!workspace.isActive) {
    return currentErr("FORBIDDEN", "当前业务空间已停用。");
  }
  if (actor.workspaceId !== workspace.workspaceId) {
    return currentErr("FORBIDDEN", "actor 无权访问其他 workspace。");
  }

  if (workspace.kind === "personal") {
    if (actor.scope !== "personal" || actor.role !== "owner") {
      return currentErr("FORBIDDEN", "个人空间仅允许 owner 访问。");
    }

    return currentOk(true);
  }

  if (actor.scope !== "team" || !membership || membership.workspaceId !== workspace.workspaceId || !isMembershipActive(membership)) {
    return currentErr("FORBIDDEN", "当前用户不是该团队的有效成员。");
  }

  if (!hasWorkspaceRole(membership, minimumRole)) {
    return currentErr("FORBIDDEN", `当前操作至少需要 ${minimumRole} 角色。`);
  }

  return currentOk(true);
}

export function authorizePageMutation(
  actor: CurrentActorContext,
  actorIdentityId: string,
  workspace: CurrentWorkspaceRecord,
  membership: CurrentWorkspaceMemberRecord | null,
  pageKind: CurrentPageKind,
  pageOwnerIdentityId: string,
): CurrentResult<true> {
  if (!workspace.isActive || actor.workspaceId !== workspace.workspaceId) {
    return currentErr("FORBIDDEN", "当前业务空间已停用或无访问权限。");
  }
  if (workspace.kind === "team" && membership?.identityId !== actorIdentityId) {
    return currentErr("FORBIDDEN", "当前成员身份不匹配。");
  }
  if (pageKind === "personal") {
    if (workspace.ownerIdentityId !== actorIdentityId || actor.scope !== "personal" || actor.role !== "owner") {
      return currentErr("FORBIDDEN", "只有个人主页 owner 可以修改个人页。");
    }

    return currentOk(true);
  }

  if (pageKind === "team") {
    return authorizeWorkspaceActor(actor, workspace, membership, "admin");
  }

  const workspaceAccess = authorizeWorkspaceActor(actor, workspace, membership, "member");
  if (!workspaceAccess.ok) {
    return workspaceAccess;
  }

  if (actorIdentityId === pageOwnerIdentityId) {
    return currentOk(true);
  }

  if (membership && hasWorkspaceRole(membership, "admin")) {
    return currentOk(true);
  }

  return currentErr("FORBIDDEN", "成员页只允许本人或团队 owner/admin 修改。");
}

/** Preserve all fields outside the explicit Member personal-content allowlist. */
export function authorizeMemberDraftChanges(
  previous: CurrentPageDraftDocument,
  proposed: unknown,
  memberIdentityId: string,
  allowedOfferings: readonly CurrentOffering[],
): CurrentResult<true> {
  if (!isRecord(proposed) || !isRecord(proposed.profile)) {
    return currentErr("VALIDATION_ERROR", "Member Page document/profile 必须是对象。");
  }
  const personalFields = new Set(["displayName", "headline", "bio", "avatarUrl", "jobTitle"]);
  const protectedProfile = (profile: Record<string, unknown>) => Object.fromEntries(
    Object.entries(profile).filter(([key]) => !personalFields.has(key)),
  );
  const protectedDocument = (document: Record<string, unknown>) => Object.fromEntries(
    Object.entries(document).filter(([key]) => !["profile", "publicContact", "offerings"].includes(key)),
  );
  if (!isDeepStrictEqual(protectedProfile({ ...previous.profile }), protectedProfile(proposed.profile))
    || !isDeepStrictEqual(protectedDocument({ ...previous }), protectedDocument(proposed))) {
    return currentErr("FORBIDDEN", "Member 不能修改团队品牌、全局内容、Section 或其他非授权字段。");
  }
  if (!Array.isArray(proposed.offerings)) {
    return currentErr("VALIDATION_ERROR", "offerings 必须是数组。");
  }
  const allowed = new Map(allowedOfferings.filter((offering) => offering.responsibleMemberIds.includes(memberIdentityId))
    .map((offering) => [offering.id, offering]));
  const ids = new Set<string>();
  for (const offering of proposed.offerings) {
    if (!isRecord(offering) || typeof offering.id !== "string" || ids.has(offering.id)
      || !isDeepStrictEqual(allowed.get(offering.id), offering)) {
      return currentErr("FORBIDDEN", "Member 只能关联团队明确分配的 Offering，不能修改其内容或负责人。");
    }
    ids.add(offering.id);
  }
  return currentOk(true);
}

export function canReadLead(
  actor: CurrentActorContext,
  actorIdentityId: string,
  membership: CurrentWorkspaceMemberRecord | null,
  assigneeIdentityId: string,
  sourceMemberIdentityId: string | null,
): boolean {
  if (actor.scope === "personal") {
    return actor.role === "owner" && actorIdentityId === assigneeIdentityId;
  }

  if (!membership || !isMembershipActive(membership)) {
    return false;
  }

  if (membership.role === "owner" || membership.role === "admin") {
    return true;
  }

  return actorIdentityId === assigneeIdentityId || actorIdentityId === sourceMemberIdentityId;
}
