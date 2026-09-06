import "server-only";

import type {
  CurrentActorContext,
  CurrentPageRef,
  CurrentResult,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
} from "@/lib/current/contracts";
import { ensureCurrentPersonalRuntime } from "@/lib/current/bootstrap/service";
import { currentDb } from "@/lib/current/data/prisma-current";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { authorizePageMutation, authorizeWorkspaceActor } from "@/lib/current/domain/team";
import { mapMembership, mapPageRef, mapWorkspace } from "@/lib/current/repositories/mappers";
import { PrismaCurrentPageListRepository } from "@/lib/current/repositories/prisma-current-page-list-repository";

const pageListRepository = new PrismaCurrentPageListRepository();

export interface CurrentPageContext {
  actor: CurrentActorContext;
  page: CurrentPageRef;
  workspace: CurrentWorkspaceRecord;
  membership: CurrentWorkspaceMemberRecord | null;
}

async function loadPageContext(userId: string, pageId: string) {
  const [identity, page] = await Promise.all([
    currentDb.currentIdentity.findUnique({ where: { userId } }),
    currentDb.currentPage.findUnique({ where: { id: pageId }, include: { workspace: true } }),
  ]);

  if (!identity) return currentErr("NOT_FOUND", "当前用户尚未绑定 CURRENT identity。");
  if (!page) return currentErr("NOT_FOUND", "CURRENT 页面不存在。");

  const workspace = mapWorkspace(page.workspace);
  const membershipRow =
    workspace.kind === "team"
      ? await currentDb.currentWorkspaceMember.findUnique({
          where: { workspaceId_identityId: { workspaceId: workspace.workspaceId, identityId: identity.id } },
        })
      : null;
  const membership = membershipRow ? mapMembership(membershipRow) : null;
  const actor: CurrentActorContext = {
    actorUserId: userId,
    scope: workspace.kind === "personal" ? "personal" : "team",
    workspaceId: workspace.workspaceId,
    role: workspace.kind === "personal" ? "owner" : membership?.role ?? "member",
  };

  return currentOk({
    identityId: identity.id,
    actor,
    page: mapPageRef(page),
    workspace,
    membership,
    ownerIdentityId: page.ownerIdentityId,
  });
}

export async function getCurrentPageContext(
  userId: string,
  pageId: string,
  mode: "read" | "mutation" = "read",
): Promise<CurrentResult<CurrentPageContext>> {
  const loaded = await loadPageContext(userId, pageId);
  if (!loaded.ok) return loaded;

  const access =
    mode === "mutation"
      ? authorizePageMutation(
          loaded.value.actor,
          loaded.value.identityId,
          loaded.value.workspace,
          loaded.value.membership,
          loaded.value.page.kind,
          loaded.value.ownerIdentityId,
        )
      : loaded.value.page.kind === "personal"
        ? authorizePageMutation(
            loaded.value.actor,
            loaded.value.identityId,
            loaded.value.workspace,
            loaded.value.membership,
            loaded.value.page.kind,
            loaded.value.ownerIdentityId,
          )
        : authorizeWorkspaceActor(loaded.value.actor, loaded.value.workspace, loaded.value.membership, "member");

  if (!access.ok) return access;

  return currentOk({
    actor: loaded.value.actor,
    page: loaded.value.page,
    workspace: loaded.value.workspace,
    membership: loaded.value.membership,
  });
}

export async function getCurrentPersonalPageForUser(userId: string): Promise<CurrentResult<CurrentPageRef>> {
  const identity = await currentDb.currentIdentity.findUnique({ where: { userId } });
  if (!identity?.personalWorkspaceId) {
    return currentErr("NOT_FOUND", "当前用户还没有可编辑的个人 CURRENT 页面。");
  }

  const page = await currentDb.currentPage.findFirst({
    where: {
      workspaceId: identity.personalWorkspaceId,
      ownerIdentityId: identity.id,
      kind: "personal",
    },
  });
  return page ? currentOk(mapPageRef(page)) : currentErr("NOT_FOUND", "当前用户还没有可编辑的个人 CURRENT 页面。");
}

export async function ensureCurrentPersonalPageForUser(userId: string): Promise<CurrentResult<CurrentPageRef>> {
  const runtime = await ensureCurrentPersonalRuntime(userId);
  if (!runtime.ok) return runtime;

  return getCurrentPersonalPageForUser(userId);
}

export function listCurrentPagesForActor(userId: string): Promise<CurrentResult<readonly CurrentPageRef[]>> {
  return pageListRepository.listForActor(userId);
}
