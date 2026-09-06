import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import type { CurrentResult, CurrentPageRef } from "@/lib/current/contracts";
import { currentErr, currentOk } from "@/lib/current/team/result";
import { emptyDraftDocument } from "@/lib/current/domain/page";
import { validateUsername } from "@/lib/current/domain/identity";
import { currentTeamSeatLimit as seatLimit } from "@/lib/current/domain/team-seats";
import { mapPageRef } from "@/lib/current/repositories/mappers";

type Tx = CurrentPrismaClient;
export interface CurrentTeamSummary { workspaceId: string; name: string; slug: string | null; role: string; ownerIdentityId: string; isActive: boolean; teamPageId: string | null }
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
class RejectedTransaction extends Error { constructor(readonly result: Extract<CurrentResult<never>, { ok: false }>) { super("Team operation rejected"); } }

async function transact<T>(work: (tx: Tx) => Promise<CurrentResult<T>>): Promise<CurrentResult<T>> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await currentDb.$transaction(async (tx) => {
        const result = await work(tx);
        if (!result.ok) throw new RejectedTransaction(result);
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof RejectedTransaction) return error.result;
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        if (attempt < 2) continue;
        return currentErr("CONFLICT", "操作发生并发或唯一约束冲突，请刷新后重试。");
      }
      return currentErr("DEPENDENCY_UNAVAILABLE", "团队数据暂时不可用，请稍后重试。", { retryable: true });
    }
  }
  return currentErr("CONFLICT", "操作冲突，请重试。");
}
async function actor(tx: Tx, userId: string) {
  return tx.currentIdentity.findFirst({ where: { userId, accountStatus: "active" } });
}
async function access(tx: Tx, userId: string, workspaceId: string, manage = false) {
  const identity = await actor(tx, userId);
  if (!identity) return currentErr("FORBIDDEN", "请先完成账号初始化。");
  const workspace = await tx.currentWorkspace.findUnique({ where: { id: workspaceId }, include: { members: true, billingAccount: true } });
  const member = workspace?.members.find((row) => row.identityId === identity.id && row.status === "active");
  if (!workspace || workspace.kind !== "team" || !member) return currentErr("FORBIDDEN", "无权访问此团队。");
  if (manage && !["owner", "admin"].includes(member.role)) return currentErr("FORBIDDEN", "只有团队所有者或管理员可以执行此操作。");
  return currentOk({ identity, workspace, member });
}
async function operationAllowed(tx: Tx, workspace: { id: string; isActive: boolean; members: { status: string }[]; billingAccount: { planCode: string; status: string; graceEndsAt: Date | null } | null }, adding = false) {
  const lifecycle = await tx.currentLifecycleRecord.findFirst({ where: { subjectType: "workspace", subjectId: workspace.id }, orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }] });
  if (!workspace.isActive || ["pending_deletion", "restricted_retention", "deleted"].includes(lifecycle?.state ?? "")) return currentErr("INVALID_STATE", "团队当前不可用。");
  const count = workspace.members.filter((m) => m.status === "active").length;
  if (count + Number(adding) > seatLimit(workspace.billingAccount)) return currentErr("INVALID_STATE", "团队席位已达上限或超限，请升级套餐或联系销售；现有数据保留。");
  return currentOk(true);
}
async function audit(tx: Tx, identityId: string, workspaceId: string, action: string, targetId: string, metadata: Record<string, unknown> = {}, idempotencyKey?: string) {
  await tx.currentAuditLog.create({ data: { id: randomUUID(), actorIdentityId: identityId, workspaceId, action, targetType: action.startsWith("current.lead.") ? "lead" : "team", targetId, metadata: toJsonValue(metadata), idempotencyKey } });
}
async function memberPage(tx: Tx, workspace: { id: string; slug: string | null; name: string }, identity: { id: string; username: string; displayName: string | null }, actorId: string) {
  let page = await tx.currentPage.findUnique({ where: { workspaceId_kind_ownerIdentityId: { workspaceId: workspace.id, kind: "member", ownerIdentityId: identity.id } } });
  if (!page) {
    const publicIdentity = `team/${workspace.slug}/${identity.username}`;
    page = await tx.currentPage.create({ data: { id: randomUUID(), workspaceId: workspace.id, ownerIdentityId: identity.id, kind: "member", publicIdentity, publicIdentityNormalized: publicIdentity.toLowerCase(), status: "draft_only" } });
    const document = emptyDraftDocument(); document.profile.displayName = identity.displayName ?? identity.username;
    await tx.currentPageDraft.create({ data: { id: randomUUID(), pageId: page.id, document: toJsonValue(document) } });
    await audit(tx, actorId, workspace.id, "current.team.member_page.created", page.id, { memberIdentityId: identity.id });
  }
  return mapPageRef({ ...page, workspace });
}
export async function createCurrentTeam(input: { actorUserId: string; name: string; slug: string; idempotencyKey: string }): Promise<CurrentResult<{ workspaceId: string; teamPageId: string }>> {
  const slug = validateUsername(input.slug);
  if (!slug.ok) return slug;
  if (!input.name.trim() || input.name.trim().length > 120 || !input.idempotencyKey.trim() || input.idempotencyKey.length > 128) return currentErr("VALIDATION_ERROR", "请填写团队名称和有效操作标识。");
  return transact(async (tx) => {
    const identity = await actor(tx, input.actorUserId);
    if (!identity) return currentErr("FORBIDDEN", "请先完成账号初始化。");
    const existing = await tx.currentAuditLog.findFirst({ where: { actorIdentityId: identity.id, action: "current.team.created", idempotencyKey: input.idempotencyKey } });
    if (existing) {
      const workspace = await tx.currentWorkspace.findUnique({ where: { id: existing.workspaceId! }, include: { pages: { where: { kind: "team" } } } });
      if (workspace?.ownerIdentityId === identity.id && workspace.name === input.name.trim() && workspace.slug === slug.value && workspace.pages[0]) return currentOk({ workspaceId: workspace.id, teamPageId: workspace.pages[0].id });
      return currentErr("CONFLICT", "操作标识已用于其他团队请求。");
    }
    if (await tx.currentWorkspace.findFirst({ where: { ownerIdentityId: identity.id, kind: "team" } })) return currentErr("CONFLICT", "每个账号最多拥有一个团队，仍可接受邀请加入其他团队。");
    const workspace = await tx.currentWorkspace.create({ data: { id: randomUUID(), name: input.name.trim(), slug: slug.value, kind: "team", ownerIdentityId: identity.id, defaultLeadIdentityId: identity.id } });
    await tx.currentWorkspaceMember.create({ data: { id: randomUUID(), workspaceId: workspace.id, identityId: identity.id, role: "owner", status: "active", joinedAt: new Date() } });
    const publicIdentity = `team/${slug.value}`;
    const page = await tx.currentPage.create({ data: { id: randomUUID(), workspaceId: workspace.id, ownerIdentityId: identity.id, kind: "team", publicIdentity, publicIdentityNormalized: publicIdentity } });
    const document = emptyDraftDocument(); document.profile.displayName = workspace.name;
    await tx.currentPageDraft.create({ data: { id: randomUUID(), pageId: page.id, document: toJsonValue(document) } });
    await tx.currentBillingAccount.create({ data: { id: randomUUID(), workspaceId: workspace.id, scope: "team", ownerIdentityId: identity.id, billingContactIdentityId: identity.id, planCode: "free", status: "active" } });
    await audit(tx, identity.id, workspace.id, "current.team.created", workspace.id, { name: workspace.name, slug: workspace.slug }, input.idempotencyKey);
    await memberPage(tx, workspace, identity, identity.id);
    return currentOk({ workspaceId: workspace.id, teamPageId: page.id });
  });
}
export async function listCurrentTeamsForActor(userId: string): Promise<CurrentResult<CurrentTeamSummary[]>> {
  return transact(async (tx) => {
    const identity = await actor(tx, userId);
    if (!identity) return currentOk([]);
    const memberships = await tx.currentWorkspaceMember.findMany({ where: { identityId: identity.id, status: "active", workspace: { kind: "team" } }, include: { workspace: { include: { pages: { where: { kind: "team" } } } } }, orderBy: { createdAt: "asc" } });
    return currentOk(memberships.map(({ role, workspace: w }) => ({ workspaceId: w.id, name: w.name, slug: w.slug, role, ownerIdentityId: w.ownerIdentityId, isActive: w.isActive, teamPageId: w.pages[0]?.id ?? null })));
  });
}
export async function getCurrentTeamDetail(userId: string, workspaceId: string) {
  return transact(async (tx) => {
    const a = await access(tx, userId, workspaceId); if (!a.ok) return a;
    const { workspace: w, member, identity } = a.value;
    const pages = await tx.currentPage.findMany({ where: { workspaceId }, include: { workspace: true } });
    const members = await tx.currentWorkspaceMember.findMany({ where: { workspaceId }, include: { identity: true } });
    const invitations = member.role === "member" ? [] : await tx.currentTeamInvitation.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 });
    const leads = member.role === "member" ? [] : await tx.currentLead.groupBy({ by: ["assigneeIdentityId"], where: { workspaceId, status: { in: ["new", "contacted"] } }, _count: { _all: true } });
    return currentOk({ workspaceId, name: w.name, slug: w.slug, role: member.role, ownerIdentityId: w.ownerIdentityId, isActive: w.isActive, actorIdentityId: identity.id, teamPageId: pages.find((p) => p.kind === "team")?.id ?? null,
      members: members.map((m) => ({ identityId: m.identityId, displayName: m.identity.displayName, username: m.identity.username, role: m.role, status: m.status, pageId: pages.find((p) => p.kind === "member" && p.ownerIdentityId === m.identityId)?.id ?? null, activeLeadCount: leads.find((l) => l.assigneeIdentityId === m.identityId)?._count._all ?? 0 })),
      pages: pages.filter((p) => member.role !== "member" || p.ownerIdentityId === identity.id).map(mapPageRef), seatLimit: seatLimit(w.billingAccount), activeMemberCount: members.filter((m) => m.status === "active").length,
      invitations: invitations.map((i) => ({ id: i.id, role: i.role, status: invitationStatus(i), expiresAt: i.expiresAt.toISOString() })) });
  });
}
export async function ensureCurrentMemberPage(input: { actorUserId: string; workspaceId: string; memberIdentityId: string }): Promise<CurrentResult<CurrentPageRef>> {
  return transact(async (tx) => {
    const a = await access(tx, input.actorUserId, input.workspaceId); if (!a.ok) return a;
    if (a.value.member.role === "member" && a.value.identity.id !== input.memberIdentityId) return currentErr("FORBIDDEN", "只能建立自己的成员页面。");
    const gate = await operationAllowed(tx, a.value.workspace); if (!gate.ok) return gate;
    const membership = a.value.workspace.members.find((m) => m.identityId === input.memberIdentityId && m.status === "active");
    const identity = membership ? await tx.currentIdentity.findUnique({ where: { id: membership.identityId } }) : null;
    if (!identity || identity.accountStatus !== "active") return currentErr("INVALID_STATE", "目标必须是活跃团队成员。");
    return currentOk(await memberPage(tx, a.value.workspace, identity, a.value.identity.id));
  });
}
function invitationStatus(i: { status: string; expiresAt: Date }) { return i.status === "pending" && i.expiresAt.getTime() <= Date.now() ? "expired" : i.status; }
export async function createCurrentTeamInvitation(input: { actorUserId: string; workspaceId: string; role: string }) {
  if (!["admin", "member"].includes(input.role)) return currentErr("VALIDATION_ERROR", "邀请角色只能是管理员或成员。");
  return transact(async (tx) => {
    const a = await access(tx, input.actorUserId, input.workspaceId, true); if (!a.ok) return a;
    const gate = await operationAllowed(tx, a.value.workspace, true); if (!gate.ok) return gate;
    const token = randomBytes(32).toString("hex");
    const invitation = await tx.currentTeamInvitation.create({ data: { id: randomUUID(), workspaceId: input.workspaceId, createdByIdentityId: a.value.identity.id, createdByRole: a.value.member.role, role: input.role, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    await audit(tx, a.value.identity.id, input.workspaceId, "current.team.invitation.created", invitation.id, { role: input.role, delivery: "link_only" });
    return currentOk({ id: invitation.id, token, expiresAt: invitation.expiresAt.toISOString(), role: invitation.role, delivery: "link_only" as const });
  });
}
export async function getCurrentTeamInvitation(token: string) {
  if (!validToken(token)) return currentErr("NOT_FOUND", "邀请链接无效。");
  return transact(async (tx) => {
    const i = await tx.currentTeamInvitation.findUnique({ where: { tokenHash: tokenHash(token) }, include: { workspace: true } });
    if (!i) return currentErr("NOT_FOUND", "邀请链接无效。");
    const creator = await tx.currentWorkspaceMember.findUnique({ where: { workspaceId_identityId: { workspaceId: i.workspaceId, identityId: i.createdByIdentityId } } });
    const creatorIdentity = await tx.currentIdentity.findUnique({ where: { id: i.createdByIdentityId }, select: { accountStatus: true } });
    const currentStatus = invitationStatus(i);
    const status = currentStatus !== "pending" ? currentStatus : !i.workspace.isActive ? "unavailable" : creator?.status !== "active" || creator.role !== i.createdByRole || creatorIdentity?.accountStatus !== "active" ? "role_changed" : currentStatus;
    return currentOk({ workspaceId: i.workspaceId, workspaceName: i.workspace.name, role: i.role, status, expiresAt: i.expiresAt.toISOString() });
  });
}
export async function acceptCurrentTeamInvitation(userId: string, token: string) {
  if (!validToken(token)) return currentErr("NOT_FOUND", "邀请链接无效。");
  return transact(async (tx) => {
    const identity = await actor(tx, userId); if (!identity) return currentErr("FORBIDDEN", "请先完成账号初始化。");
    const i = await tx.currentTeamInvitation.findUnique({ where: { tokenHash: tokenHash(token) }, include: { workspace: { include: { members: true, billingAccount: true } } } });
    if (!i) return currentErr("NOT_FOUND", "邀请链接无效。");
    const state = invitationStatus(i);
    if (state !== "pending") return currentErr("INVALID_STATE", ({ used: "邀请已使用。", revoked: "邀请已撤销。", expired: "邀请已过期。" }[state] ?? "邀请不可用。"));
    const creator = i.workspace.members.find((m) => m.identityId === i.createdByIdentityId);
    const creatorIdentity = await tx.currentIdentity.findUnique({ where: { id: i.createdByIdentityId }, select: { accountStatus: true } });
    if (creator?.status !== "active" || creator.role !== i.createdByRole || !["owner", "admin"].includes(creator.role) || creatorIdentity?.accountStatus !== "active") return currentErr("INVALID_STATE", "邀请人角色已变化，请联系团队重新邀请。");
    if (i.workspace.ownerIdentityId === identity.id) return currentErr("CONFLICT", "团队所有者无需接受本团队邀请。");
    const existing = i.workspace.members.find((m) => m.identityId === identity.id);
    if (existing?.status === "active") return currentErr("CONFLICT", "你已经是此团队成员，无需再次加入。");
    const gate = await operationAllowed(tx, i.workspace, true); if (!gate.ok) return gate;
    await tx.currentWorkspaceMember.upsert({ where: { workspaceId_identityId: { workspaceId: i.workspaceId, identityId: identity.id } }, create: { id: randomUUID(), workspaceId: i.workspaceId, identityId: identity.id, role: i.role, status: "active", joinedAt: new Date() }, update: { role: i.role, status: "active", joinedAt: new Date(), removedAt: null, disabledAt: null } });
    const page = await memberPage(tx, i.workspace, identity, identity.id);
    // Rejoining preserves history but requires a new explicit publication.
    if (page.status === "disabled") {
      await tx.currentPublishedPointer.deleteMany({ where: { pageId: page.pageId } });
    }
    await tx.currentPage.updateMany({ where: { id: page.pageId, status: "disabled" }, data: { status: "draft_only" } });
    await tx.currentTeamInvitation.update({ where: { id: i.id }, data: { status: "used", acceptedByIdentityId: identity.id, usedAt: new Date() } });
    await audit(tx, identity.id, i.workspaceId, "current.team.invitation.accepted", i.id, { memberIdentityId: identity.id, role: i.role, pageId: page.pageId });
    return currentOk({ workspaceId: i.workspaceId, pageId: page.pageId });
  });
}
export async function revokeCurrentTeamInvitation(userId: string, workspaceId: string, invitationId: string) {
  return transact(async (tx) => {
    const a = await access(tx, userId, workspaceId, true); if (!a.ok) return a;
    const i = await tx.currentTeamInvitation.findFirst({ where: { id: invitationId, workspaceId } });
    if (!i) return currentErr("NOT_FOUND", "邀请不存在。");
    if (i.status !== "pending") return currentErr("INVALID_STATE", "此邀请不能撤销。");
    await tx.currentTeamInvitation.update({ where: { id: i.id }, data: { status: "revoked" } });
    await audit(tx, a.value.identity.id, workspaceId, "current.team.invitation.revoked", i.id);
    return currentOk({ revoked: true });
  });
}
export async function removeCurrentTeamMember(input: { actorUserId: string; workspaceId: string; memberIdentityId: string; successorIdentityId?: string }) {
  return transact(async (tx) => {
    const a = await access(tx, input.actorUserId, input.workspaceId, true); if (!a.ok) return a;
    const { workspace: w, identity } = a.value;
    if (!w.isActive) return currentErr("INVALID_STATE", "团队当前不可用。");
    const target = w.members.find((m) => m.identityId === input.memberIdentityId);
    if (!target) return currentErr("NOT_FOUND", "成员不存在。");
    if (target.role === "owner" || target.identityId === w.ownerIdentityId) return currentErr("FORBIDDEN", "不能移除团队所有者，请先完成所有权转让。");
    if (target.status === "removed") return currentOk({ removed: true, transferredLeadCount: 0 });
    const successor = w.members.find((m) => m.identityId === input.successorIdentityId && m.status === "active" && m.identityId !== target.identityId);
    const successorAccount = successor ? await tx.currentIdentity.findUnique({ where: { id: successor.identityId } }) : null;
    const assigneeIdentityId = successorAccount?.accountStatus === "active" ? successorAccount.id : w.ownerIdentityId;
    const leads = await tx.currentLead.findMany({ where: { workspaceId: w.id, assigneeIdentityId: target.identityId, status: { in: ["new", "contacted"] } }, select: { id: true } });
    for (const lead of leads) {
      await tx.currentLead.update({ where: { id: lead.id }, data: { assigneeIdentityId, routingReason: "member_removed" } });
      await audit(tx, identity.id, w.id, "current.lead.member_removal_reassigned", lead.id, { fromIdentityId: target.identityId, toIdentityId: assigneeIdentityId, reason: "member_removed" });
    }
    await tx.currentWorkspaceMember.update({ where: { id: target.id }, data: { status: "removed", removedAt: new Date() } });
    await tx.currentPage.updateMany({ where: { workspaceId: w.id, ownerIdentityId: target.identityId, kind: "member" }, data: { status: "disabled" } });
    if (w.defaultLeadIdentityId === target.identityId) await tx.currentWorkspace.update({ where: { id: w.id }, data: { defaultLeadIdentityId: w.ownerIdentityId } });
    await audit(tx, identity.id, w.id, "current.team.member.removed", target.id, { memberIdentityId: target.identityId, successorIdentityId: assigneeIdentityId, reassignedLeadIds: leads.map((l) => l.id) });
    return currentOk({ removed: true, transferredLeadCount: leads.length });
  });
}



