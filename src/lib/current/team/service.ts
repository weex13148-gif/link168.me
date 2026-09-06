import crypto from "crypto";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import type {
  CurrentBillingOwner,
  CurrentResult,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
} from "@/lib/current/contracts";
import { mapMembership, mapWorkspace } from "@/lib/current/repositories/mappers";
import { currentErr, currentFromUnknown, currentOk } from "@/lib/current/team/result";
import { CURRENT_A4_AUDIT_ACTION, findAuditEventByIdempotency, readAuditEvents } from "@/lib/current/team/audit-events";

export const TEAM_RESTORE_WINDOW_DAYS = 30;
const TEAM_RESTORE_WINDOW_MS = TEAM_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const DISSOLUTION_CONFIRM_PREFIX = "DISSOLVE ";

type CurrentTransactionClient = CurrentPrismaClient;
type LifecycleMetadata = {
  pageStates?: Record<string, string>;
  dissolvedAt?: string;
  restoreDeadlineAt?: string;
  idempotencyKey?: string;
};

export type TeamDissolutionStatus = "active" | "pending_deletion" | "retention";

export type TeamDissolutionState = {
  workspaceId: string;
  status: TeamDissolutionStatus;
  dissolvedAt: string | null;
  restoreDeadlineAt: string | null;
  restoreAvailable: boolean;
  creditsFrozen: boolean;
  autoRenewFrozen: boolean;
  pagesDisabled: boolean;
  invitesDisabled: boolean;
  newLeadsDisabled: boolean;
  visitorAiDisabled: boolean;
  legalHold: boolean;
};

export type TeamOwnershipSnapshot = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string | null;
  ownerIdentityId: string;
  billingOwner: CurrentBillingOwner;
  lifecycle: TeamDissolutionState;
  isActiveWorkspace: boolean;
};

export type CurrentTeamAccess = {
  workspace: CurrentWorkspaceRecord;
  member: CurrentWorkspaceMemberRecord;
  identityId: string;
  lifecycle: TeamDissolutionState;
};

function buildTeamBillingOwner(workspaceId: string, billingContactUserId: string): CurrentBillingOwner {
  return { scope: "team", ownerId: workspaceId, billingContactUserId };
}

async function actorIdentity(userId: string) {
  return currentDb.currentIdentity.findUnique({ where: { userId }, select: { id: true, userId: true } });
}

async function currentWorkspace(workspaceId: string) {
  return currentDb.currentWorkspace.findUnique({
    where: { id: workspaceId },
    include: { ownerIdentity: { select: { id: true, userId: true } }, members: true },
  });
}

async function appendAudit(
  tx: CurrentTransactionClient,
  input: {
    actorIdentityId: string;
    workspaceId: string;
    action: string;
    targetType: string;
    targetId: string;
    idempotencyKey?: string;
    metadata: Record<string, unknown>;
  },
) {
  await tx.currentAuditLog.create({
    data: {
      id: crypto.randomUUID(),
      actorIdentityId: input.actorIdentityId,
      workspaceId: input.workspaceId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      idempotencyKey: input.idempotencyKey,
      metadata: toJsonValue(input.metadata),
    },
  });
}

export async function getTeamDissolutionState(workspaceId: string): Promise<CurrentResult<TeamDissolutionState>> {
  try {
    const workspace = await currentDb.currentWorkspace.findUnique({ where: { id: workspaceId }, select: { id: true, kind: true } });
    if (!workspace) return currentErr("NOT_FOUND", "Current Team 不存在。");
    if (workspace.kind !== "team") return currentErr("VALIDATION_ERROR", "目标 workspace 不是 Team。", { field: "workspaceId" });

    const latest = await currentDb.currentLifecycleRecord.findFirst({
      where: { subjectType: "workspace", subjectId: workspaceId },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    });
    const status: TeamDissolutionStatus = latest?.state === "pending_deletion"
      ? "pending_deletion"
      : latest?.state === "restricted_retention"
        ? "retention"
        : "active";
    const restoreDeadlineAt = latest?.restoreDeadlineAt?.toISOString() ?? null;
    const restoreAvailable = status === "pending_deletion"
      && Boolean(latest?.restoreDeadlineAt && latest.restoreDeadlineAt.getTime() > Date.now());
    const legalHold = Boolean(latest?.legalHoldUntil && latest.legalHoldUntil.getTime() > Date.now());

    return currentOk({
      workspaceId,
      status,
      dissolvedAt: latest?.state === "pending_deletion" ? latest.scheduledAt.toISOString() : null,
      restoreDeadlineAt,
      restoreAvailable,
      creditsFrozen: status !== "active",
      autoRenewFrozen: status !== "active",
      pagesDisabled: status !== "active",
      invitesDisabled: status !== "active",
      newLeadsDisabled: status !== "active",
      visitorAiDisabled: status !== "active",
      legalHold,
    });
  } catch (error) {
    return currentFromUnknown(error, "读取 Current Team lifecycle 失败。", true);
  }
}

export async function getTeamBillingOwner(workspaceId: string): Promise<CurrentResult<CurrentBillingOwner>> {
  try {
    const workspace = await currentWorkspace(workspaceId);
    if (!workspace) return currentErr("NOT_FOUND", "Current Team 不存在。");
    if (workspace.kind !== "team") return currentErr("VALIDATION_ERROR", "目标 workspace 不是 Team。", { field: "workspaceId" });
    return currentOk(buildTeamBillingOwner(workspace.id, workspace.ownerIdentity.userId));
  } catch (error) {
    return currentFromUnknown(error, "读取 Current Team billing owner 失败。", true);
  }
}

export async function getCurrentTeamAccess(actorUserId: string, workspaceId: string): Promise<CurrentResult<CurrentTeamAccess>> {
  try {
    const [workspace, identity] = await Promise.all([currentWorkspace(workspaceId), actorIdentity(actorUserId)]);
    if (!workspace || workspace.kind !== "team") return currentErr("NOT_FOUND", "Current Team 不存在。");
    if (!identity) return currentErr("NOT_FOUND", "Current identity 不存在。");
    const member = workspace.members.find((candidate) => candidate.identityId === identity.id);
    if (!member || member.status !== "active") return currentErr("FORBIDDEN", "当前用户不是 active Team 成员。");
    const lifecycle = await getTeamDissolutionState(workspaceId);
    if (!lifecycle.ok) return lifecycle;
    return currentOk({ workspace: mapWorkspace(workspace), member: mapMembership(member), identityId: identity.id, lifecycle: lifecycle.value });
  } catch (error) {
    return currentFromUnknown(error, "读取 Current Team access 失败。", true);
  }
}

export async function getTeamOwnershipSnapshot(actorUserId: string, workspaceId: string): Promise<CurrentResult<TeamOwnershipSnapshot>> {
  const access = await getCurrentTeamAccess(actorUserId, workspaceId);
  if (!access.ok) return access;
  const owner = await getTeamBillingOwner(workspaceId);
  if (!owner.ok) return owner;
  return currentOk({
    workspaceId,
    workspaceName: access.value.workspace.name,
    workspaceSlug: access.value.workspace.slug,
    ownerIdentityId: access.value.workspace.ownerIdentityId,
    billingOwner: owner.value,
    lifecycle: access.value.lifecycle,
    isActiveWorkspace: access.value.workspace.isActive,
  });
}

async function assertCurrentOwner(actorUserId: string, workspaceId: string) {
  const access = await getCurrentTeamAccess(actorUserId, workspaceId);
  if (!access.ok) return access;
  if (access.value.member.role !== "owner" || access.value.workspace.ownerIdentityId !== access.value.identityId) {
    return currentErr("FORBIDDEN", "只有当前 Current Team Owner 才能执行此操作。") as CurrentResult<never>;
  }
  return access;
}

export async function transferTeamOwner(params: {
  actorUserId: string;
  workspaceId: string;
  targetUserId: string;
  idempotencyKey: string;
}): Promise<CurrentResult<TeamOwnershipSnapshot>> {
  try {
    if (!params.idempotencyKey.trim()) return currentErr("VALIDATION_ERROR", "idempotencyKey 不能为空。", { field: "idempotencyKey" });
    const owner = await assertCurrentOwner(params.actorUserId, params.workspaceId);
    if (!owner.ok) return owner;
    const target = await actorIdentity(params.targetUserId);
    if (!target) return currentErr("NOT_FOUND", "目标 Current identity 不存在。");
    const targetMember = owner.value.workspace.workspaceId === params.workspaceId
      ? await currentDb.currentWorkspaceMember.findUnique({ where: { workspaceId_identityId: { workspaceId: params.workspaceId, identityId: target.id } } })
      : null;
    if (!targetMember || targetMember.status !== "active") return currentErr("VALIDATION_ERROR", "目标用户必须是 active Team 成员。");
    if (target.id === owner.value.identityId) return currentErr("VALIDATION_ERROR", "不能将 Owner Transfer 给当前 Owner。");
    const existing = await findAuditEventByIdempotency({
      action: CURRENT_A4_AUDIT_ACTION.TEAM_OWNER_TRANSFER_CONFIRMED,
      targetType: "workspace",
      targetId: params.workspaceId,
      idempotencyKey: params.idempotencyKey,
    });
    if (!existing) {
      await currentDb.$transaction(async (tx) => {
        await tx.currentWorkspace.update({ where: { id: params.workspaceId }, data: { ownerIdentityId: target.id } });
        await tx.currentWorkspaceMember.update({ where: { id: owner.value.member.membershipId }, data: { role: "admin" } });
        await tx.currentWorkspaceMember.update({ where: { id: targetMember.id }, data: { role: "owner" } });
        await tx.currentBillingAccount.updateMany({ where: { workspaceId: params.workspaceId, scope: "team" }, data: { billingContactIdentityId: target.id } });
        await appendAudit(tx, {
          actorIdentityId: owner.value.identityId,
          workspaceId: params.workspaceId,
          action: CURRENT_A4_AUDIT_ACTION.TEAM_OWNER_TRANSFER_CONFIRMED,
          targetType: "workspace",
          targetId: params.workspaceId,
          idempotencyKey: params.idempotencyKey,
          metadata: { fromIdentityId: owner.value.identityId, toIdentityId: target.id, subscriptionLedgerCreditsUnchanged: true },
        });
      });
    }
    return getTeamOwnershipSnapshot(params.targetUserId, params.workspaceId);
  } catch (error) {
    return currentFromUnknown(error, "Current Team Owner Transfer 失败。", true);
  }
}

export async function dissolveTeam(params: {
  actorUserId: string;
  workspaceId: string;
  confirmationText: string;
  idempotencyKey: string;
  reason?: string;
}): Promise<CurrentResult<TeamDissolutionState>> {
  try {
    const owner = await assertCurrentOwner(params.actorUserId, params.workspaceId);
    if (!owner.ok) return owner;
    if (params.confirmationText !== `${DISSOLUTION_CONFIRM_PREFIX}${owner.value.workspace.slug ?? params.workspaceId}`) {
      return currentErr("VALIDATION_ERROR", `请输入 ${DISSOLUTION_CONFIRM_PREFIX}${owner.value.workspace.slug ?? params.workspaceId} 以确认解散。`, { field: "confirmationText" });
    }
    const existing = await findAuditEventByIdempotency({ action: CURRENT_A4_AUDIT_ACTION.TEAM_DISSOLVED, targetType: "workspace", targetId: params.workspaceId, idempotencyKey: params.idempotencyKey });
    if (!existing) {
      const dissolvedAt = new Date();
      const restoreDeadline = new Date(dissolvedAt.getTime() + TEAM_RESTORE_WINDOW_MS);
      await currentDb.$transaction(async (tx) => {
        const pages = await tx.currentPage.findMany({ where: { workspaceId: params.workspaceId }, select: { id: true, status: true } });
        await tx.currentWorkspace.update({ where: { id: params.workspaceId }, data: { isActive: false } });
        await tx.currentPage.updateMany({ where: { workspaceId: params.workspaceId }, data: { status: "disabled" } });
        await tx.currentLifecycleRecord.create({ data: { id: crypto.randomUUID(), subjectType: "workspace", subjectId: params.workspaceId, state: "pending_deletion", scheduledAt: dissolvedAt, restoreDeadlineAt: restoreDeadline, purgeDeadlineAt: restoreDeadline, reason: params.reason ?? "owner_dissolution", metadata: toJsonValue({ creditsFrozen: true, autoRenewFrozen: true, invitesDisabled: true, newLeadsDisabled: true, visitorAiDisabled: true }) } });
        await appendAudit(tx, { actorIdentityId: owner.value.identityId, workspaceId: params.workspaceId, action: CURRENT_A4_AUDIT_ACTION.TEAM_DISSOLVED, targetType: "workspace", targetId: params.workspaceId, idempotencyKey: params.idempotencyKey, metadata: { dissolvedAt: dissolvedAt.toISOString(), restoreDeadlineAt: restoreDeadline.toISOString(), pageStates: Object.fromEntries(pages.map((page) => [page.id, page.status])), reason: params.reason ?? null } });
      });
    }
    return getTeamDissolutionState(params.workspaceId);
  } catch (error) {
    return currentFromUnknown(error, "Current Team 解散失败。", true);
  }
}

export async function restoreTeam(params: { actorUserId: string; workspaceId: string; idempotencyKey: string }): Promise<CurrentResult<TeamDissolutionState>> {
  try {
    const owner = await assertCurrentOwner(params.actorUserId, params.workspaceId);
    if (!owner.ok) return owner;
    const state = await getTeamDissolutionState(params.workspaceId);
    if (!state.ok) return state;
    if (state.value.status !== "pending_deletion" || !state.value.restoreAvailable) return currentErr("INVALID_STATE", "Team 已不在 30 天 restore window 内。", { field: "workspaceId" });
    const existing = await findAuditEventByIdempotency({ action: CURRENT_A4_AUDIT_ACTION.TEAM_RESTORED, targetType: "workspace", targetId: params.workspaceId, idempotencyKey: params.idempotencyKey });
    if (!existing) {
      const dissolved = await readAuditEvents<LifecycleMetadata>({ targetType: "workspace", targetId: params.workspaceId, actions: [CURRENT_A4_AUDIT_ACTION.TEAM_DISSOLVED], limit: 1 });
      const pageStates = dissolved[0]?.metadata?.pageStates ?? {};
      await currentDb.$transaction(async (tx) => {
        await tx.currentWorkspace.update({ where: { id: params.workspaceId }, data: { isActive: true } });
        for (const [pageId, status] of Object.entries(pageStates)) await tx.currentPage.update({ where: { id: pageId }, data: { status } });
        await tx.currentLifecycleRecord.create({ data: { id: crypto.randomUUID(), subjectType: "workspace", subjectId: params.workspaceId, state: "restored", scheduledAt: new Date(), restoreDeadlineAt: null, purgeDeadlineAt: null, reason: "owner_restore", metadata: toJsonValue({ creditsFrozen: false }) } });
        await appendAudit(tx, { actorIdentityId: owner.value.identityId, workspaceId: params.workspaceId, action: CURRENT_A4_AUDIT_ACTION.TEAM_RESTORED, targetType: "workspace", targetId: params.workspaceId, idempotencyKey: params.idempotencyKey, metadata: { restoredAt: new Date().toISOString() } });
      });
    }
    return getTeamDissolutionState(params.workspaceId);
  } catch (error) {
    return currentFromUnknown(error, "Current Team restore 失败。", true);
  }
}
