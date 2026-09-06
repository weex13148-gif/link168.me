import "server-only";

import { randomUUID } from "node:crypto";

import type {
  CurrentPageDraftWriteCommand,
  CurrentPageDraftDocument,
  CurrentPageReadCommand,
  CurrentPageDraftSnapshot,
  CurrentPageKind,
  CurrentPageRepository,
  CurrentPublishCommand,
  CurrentPublicationSnapshot,
  CurrentPublishedFacts,
  CurrentResult,
} from "@/lib/current/contracts";
import {
  currentDb,
  toJsonValue,
  toNullableJsonValue,
  type CurrentPrismaClient,
} from "@/lib/current/data/prisma-current";
import { validateUsername } from "@/lib/current/domain/identity";
import {
  buildPublishedFactsFromDraft,
  ensurePublishableDraft,
  sanitizeDraftDocument,
  validateDraftSnapshot,
} from "@/lib/current/domain/page";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { authorizeMemberDraftChanges, authorizePageMutation } from "@/lib/current/domain/team";
import { currentTeamSeatLimit } from "@/lib/current/domain/team-seats";
import {
  mapDraftSnapshot,
  mapMembership,
  mapPageRef,
  mapPublicationSnapshot,
  mapPublishedFacts,
  mapWorkspace,
} from "@/lib/current/repositories/mappers";

export class PrismaCurrentPageRepository implements CurrentPageRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  private canStartTransaction(): boolean {
    return "$transaction" in this.prisma;
  }

  private async assertPageAvailable(page: {
    workspaceId: string; ownerIdentityId: string; kind: string; status: string;
  }): Promise<CurrentResult<true>> {
    const workspace = await this.prisma.currentWorkspace.findUnique({ where: { id: page.workspaceId } });
    if (!workspace?.isActive || page.status === "disabled") {
      return currentErr("FORBIDDEN", "当前页面或所属业务空间已停用。");
    }
    if (workspace.kind === "team") {
      const lifecycle = await this.prisma.currentLifecycleRecord.findFirst({
        where: { subjectType: "workspace", subjectId: workspace.id },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      });
      if (["pending_deletion", "restricted_retention", "deleted"].includes(lifecycle?.state ?? "")) {
        return currentErr("FORBIDDEN", "团队已暂停服务。");
      }
    }
    if (page.kind === "member") {
      const member = await this.prisma.currentWorkspaceMember.findUnique({
        where: { workspaceId_identityId: { workspaceId: page.workspaceId, identityId: page.ownerIdentityId } },
      });
      if (member?.status !== "active") return currentErr("FORBIDDEN", "页面所属成员已停用或离开团队。");
    }
    return currentOk(true);
  }

  private async assertTeamWithinSeatLimit(page: { workspaceId: string; kind: string }): Promise<CurrentResult<true>> {
    if (page.kind === "personal") return currentOk(true);
    const [account, count] = await Promise.all([
      this.prisma.currentBillingAccount.findUnique({ where: { workspaceId: page.workspaceId } }),
      this.prisma.currentWorkspaceMember.count({ where: { workspaceId: page.workspaceId, status: "active" } }),
    ]);
    if (count > currentTeamSeatLimit(account)) {
      return currentErr("INVALID_STATE", "团队席位已超限，请调整套餐或成员后再编辑发布；原有资料保持不变。");
    }
    return currentOk(true);
  }

  private async checkMemberDocument(
    command: CurrentPageReadCommand,
    current: CurrentPageDraftSnapshot,
    proposed: unknown,
  ): Promise<CurrentResult<true>> {
    if (current.page.kind !== "member") return currentOk(true);
    const identity = await this.prisma.currentIdentity.findUnique({ where: { userId: command.actor.actorUserId } });
    if (!identity) return currentErr("UNAUTHORIZED", "当前 actor 尚未绑定 current identity。");
    const member = await this.prisma.currentWorkspaceMember.findUnique({
      where: { workspaceId_identityId: { workspaceId: current.page.workspaceId, identityId: identity.id } },
    });
    if (!member || member.status !== "active") return currentErr("FORBIDDEN", "当前成员已失效。");
    if (member.role === "owner" || member.role === "admin") return currentOk(true);
    const teamPage = await this.prisma.currentPage.findFirst({
      where: { workspaceId: current.page.workspaceId, kind: "team" }, include: { draft: true },
    });
    let teamDocument: CurrentPageDraftDocument | null = null;
    if (teamPage?.draft) {
      const parsed = sanitizeDraftDocument(teamPage.draft.document);
      if (!parsed.ok) return parsed;
      teamDocument = parsed.value;
    }
    return authorizeMemberDraftChanges(current.document, proposed, identity.id, teamDocument?.offerings ?? []);
  }

  private async authorizeActor(command: CurrentPageReadCommand): Promise<CurrentResult<true>> {
    const identity = await this.prisma.currentIdentity.findUnique({ where: { userId: command.actor.actorUserId } });
    if (!identity) return currentErr("UNAUTHORIZED", "当前 actor 尚未绑定 current identity。");
    const page = await this.prisma.currentPage.findUnique({ where: { id: command.pageId }, include: { workspace: true } });
    if (!page) return currentErr("NOT_FOUND", "当前页面不存在。");
    const available = await this.assertPageAvailable(page);
    if (!available.ok) return available;
    const workspace = mapWorkspace(page.workspace);
    const membershipRow = workspace.kind === "team"
      ? await this.prisma.currentWorkspaceMember.findUnique({ where: { workspaceId_identityId: { workspaceId: workspace.workspaceId, identityId: identity.id } } })
      : null;
    const access = authorizePageMutation(
      command.actor,
      identity.id,
      workspace,
      membershipRow ? mapMembership(membershipRow) : null,
      page.kind as CurrentPageKind,
      page.ownerIdentityId,
    );
    return access;
  }

  async getPublicationForActor(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPublicationSnapshot>> {
    const access = await this.authorizeActor(command);
    if (!access.ok) return access;
    return this.getPublication(command.pageId);
  }

  async getDraftForActor(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
    const access = await this.authorizeActor(command);
    if (!access.ok) return access;
    return this.getDraft(command.pageId);
  }

  async saveDraftForActor(command: CurrentPageDraftWriteCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
    if (this.canStartTransaction()) {
      return this.prisma.$transaction(
        (tx) => new PrismaCurrentPageRepository(tx).saveDraftForActor(command),
        { isolationLevel: "Serializable" },
      );
    }
    const access = await this.authorizeActor(command);
    if (!access.ok) return access;
    const current = await this.getDraft(command.pageId);
    if (!current.ok) return current;
    const seats = await this.assertTeamWithinSeatLimit(current.value.page);
    if (!seats.ok) return seats;
    const memberFields = await this.checkMemberDocument(command, current.value, command.document);
    if (!memberFields.ok) return memberFields;
    if (command.expectedRevision !== undefined && command.expectedRevision !== current.value.revision) {
      return currentErr("CONFLICT", "Draft 已被其他操作更新，请重新读取后再保存。", "expectedRevision");
    }
    return this.saveDraft({
      page: current.value.page,
      draftId: current.value.draftId,
      revision: current.value.revision + 1,
      updatedAt: new Date().toISOString(),
      document: command.document as CurrentPageDraftSnapshot["document"],
    });
  }

  async getPublication(pageId: string): Promise<CurrentResult<CurrentPublicationSnapshot>> {
    const row = await this.prisma.currentPage.findUnique({
      where: { id: pageId },
      include: {
        draft: true,
        publishedPointer: {
          include: {
            currentFacts: true,
            currentVersion: true,
          },
        },
      },
    });

    if (!row) {
      return currentErr("NOT_FOUND", "当前页面不存在。");
    }

    return currentOk(
      mapPublicationSnapshot({
        page: row,
        draft: row.draft,
        facts: row.publishedPointer?.currentFacts ?? null,
        publishedVersionId: row.publishedPointer?.currentVersionId ?? null,
      }),
    );
  }

  async readPublishedFacts(pageId: string): Promise<CurrentResult<CurrentPublishedFacts>> {
    const row = await this.prisma.currentPublishedPointer.findUnique({
      where: { pageId },
      include: {
        currentFacts: true,
        page: true,
      },
    });

    if (!row?.currentFacts || row.page.status === "disabled") {
      return currentErr("NOT_FOUND", "当前页面尚未发布或已下线。");
    }

    const available = await this.assertPageAvailable(row.page);
    if (!available.ok) return currentErr("NOT_FOUND", "当前页面尚未发布或已下线。");

    return currentOk(mapPublishedFacts(row.currentFacts));
  }

  async readPublishedFactsByPublicIdentity(publicIdentity: string): Promise<CurrentResult<CurrentPublishedFacts>> {
    const page = await this.prisma.currentPage.findUnique({
      where: { publicIdentityNormalized: publicIdentity.trim().toLowerCase() },
      select: { id: true, status: true },
    });

    if (!page || page.status === "disabled") {
      return currentErr("NOT_FOUND", "公开页面不存在或已下线。");
    }

    return this.readPublishedFacts(page.id);
  }

  async getDraft(pageId: string): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
    const row = await this.prisma.currentPage.findUnique({
      where: { id: pageId },
      include: {
        draft: true,
      },
    });

    if (!row || !row.draft) {
      return currentErr("NOT_FOUND", "当前页面 Draft 不存在。");
    }

    return currentOk(mapDraftSnapshot(row, row.draft));
  }

  async saveDraft(draft: CurrentPageDraftSnapshot): Promise<CurrentResult<CurrentPageDraftSnapshot>> {
    if (this.canStartTransaction()) {
      return this.prisma.$transaction(
        (tx) => new PrismaCurrentPageRepository(tx).saveDraft(draft),
        { isolationLevel: "Serializable" },
      );
    }
    const validated = validateDraftSnapshot(draft);
    if (!validated.ok) {
      return validated;
    }

    const usernameCheck = validateUsername(validated.value.page.publicIdentity);
    if (!usernameCheck.ok && validated.value.page.kind === "personal") {
      return usernameCheck;
    }

    const row = await this.prisma.currentPage.findUnique({
      where: { id: draft.page.pageId },
      include: {
        publishedPointer: true,
      },
    });

    if (!row) {
      return currentErr("NOT_FOUND", "当前页面不存在。");
    }

    const available = await this.assertPageAvailable(row);
    if (!available.ok) return available;

    const saved = await this.prisma.currentPageDraft.upsert({
      where: { pageId: draft.page.pageId },
      create: {
        id: draft.draftId || randomUUID(),
        pageId: draft.page.pageId,
        revision: Math.max(1, draft.revision),
        document: toJsonValue(validated.value.document),
      },
      update: {
        revision: Math.max(1, draft.revision),
        document: toJsonValue(validated.value.document),
      },
    });

    await this.prisma.currentPage.update({
      where: { id: draft.page.pageId },
      data: {
        status: row.publishedPointer ? "draft_changes" : "draft_only",
        publicIdentity: validated.value.page.publicIdentity,
        publicIdentityNormalized: validated.value.page.publicIdentity.toLowerCase(),
      },
    });

    return currentOk(
      mapDraftSnapshot(
        {
          ...row,
          status: row.publishedPointer ? "draft_changes" : "draft_only",
        },
        saved,
      ),
    );
  }

  async publish(command: CurrentPublishCommand): Promise<CurrentResult<CurrentPublicationSnapshot>> {
    if (this.canStartTransaction()) {
      try {
        return await this.prisma.$transaction(
          (tx) => new PrismaCurrentPageRepository(tx).publish(command),
          { isolationLevel: "Serializable" },
        );
      } catch {
        return currentErr("INTERNAL_ERROR", "发布失败或页面状态已变化，请刷新后重试；旧公开版本保持不变。", undefined, true);
      }
    }
    const actorIdentity = await this.prisma.currentIdentity.findUnique({
      where: { userId: command.actor.actorUserId },
    });

    if (!actorIdentity) {
      return currentErr("UNAUTHORIZED", "当前 actor 尚未绑定 current identity。");
    }

    const page = await this.prisma.currentPage.findUnique({
      where: { id: command.pageId },
      include: {
        workspace: true,
        draft: true,
        publishedPointer: {
          include: {
            currentFacts: true,
            currentVersion: true,
          },
        },
      },
    });

    if (!page) {
      return currentErr("NOT_FOUND", "当前页面不存在。");
    }

    const available = await this.assertPageAvailable(page);
    if (!available.ok) return available;

    if (!page.draft) {
      return currentErr("INVALID_STATE", "页面还没有可发布的 Draft。");
    }
    const seats = await this.assertTeamWithinSeatLimit(page);
    if (!seats.ok) return seats;

    const workspace = mapWorkspace(page.workspace);
    const membershipRow =
      workspace.kind === "team"
        ? await this.prisma.currentWorkspaceMember.findUnique({
            where: {
              workspaceId_identityId: {
                workspaceId: workspace.workspaceId,
                identityId: actorIdentity.id,
              },
            },
          })
        : null;
    const membership = membershipRow ? mapMembership(membershipRow) : null;
    const access = authorizePageMutation(
      command.actor,
      actorIdentity.id,
      workspace,
      membership,
      page.kind as CurrentPageKind,
      page.ownerIdentityId,
    );
    if (!access.ok) {
      return access;
    }

    const draftSnapshot = mapDraftSnapshot(page, page.draft);
    const memberFields = await this.checkMemberDocument(command, draftSnapshot, draftSnapshot.document);
    if (!memberFields.ok) return memberFields;
    const validatedDraft = validateDraftSnapshot(draftSnapshot);
    if (!validatedDraft.ok) {
      return validatedDraft;
    }

    const publishable = ensurePublishableDraft(mapPageRef(page), validatedDraft.value.document);
    if (!publishable.ok) {
      return publishable;
    }

    const existingVersion = await this.prisma.currentPublishedVersion.findUnique({
      where: {
        pageId_idempotencyKey: {
          pageId: page.id,
          idempotencyKey: command.idempotencyKey,
        },
      },
      include: {
        facts: true,
      },
    });

    if (existingVersion?.facts) {
      const existingPublication = await this.getPublication(page.id);
      return existingPublication.ok
        ? existingPublication
        : currentOk(
            mapPublicationSnapshot({
              page,
              draft: page.draft,
              facts: existingVersion.facts,
              publishedVersionId: existingVersion.id,
            }),
          );
    }

    {
      const publishedAt = new Date();
      const versionId = randomUUID();
      const factsId = randomUUID();
      const factsResult = buildPublishedFactsFromDraft({
        page: mapPageRef(page),
        versionId,
        publishedAt: publishedAt.toISOString(),
        draft: validatedDraft.value.document,
      });

      if (!factsResult.ok) {
        return factsResult;
      }

      const tx = this.prisma;
        await tx.currentPublishedVersion.create({
          data: {
            id: versionId,
            pageId: page.id,
            draftId: page.draft!.id,
            versionNumber: page.lastPublishedVersionNumber + 1,
            idempotencyKey: command.idempotencyKey,
            snapshotDocument: toJsonValue(validatedDraft.value.document),
            createdByIdentityId: actorIdentity.id,
          },
        });

        await tx.currentPublishedFacts.create({
          data: {
            id: factsId,
            pageId: page.id,
            workspaceId: page.workspaceId,
            versionId,
            publishedAt,
            profile: toJsonValue(factsResult.value.profile),
            sections: toJsonValue(factsResult.value.sections),
            offerings: toJsonValue(factsResult.value.offerings),
            publicContact: toNullableJsonValue(factsResult.value.publicContact),
            responsibleMembers: toJsonValue(factsResult.value.responsibleMembers),
          },
        });

        await tx.currentPublishedPointer.upsert({
          where: { pageId: page.id },
          create: {
            id: randomUUID(),
            pageId: page.id,
            currentVersionId: versionId,
            currentFactsId: factsId,
            previousVersionId: page.publishedPointer?.currentVersionId ?? null,
            switchedByIdentityId: actorIdentity.id,
            switchedAt: publishedAt,
          },
          update: {
            previousVersionId: page.publishedPointer?.currentVersionId ?? null,
            currentVersionId: versionId,
            currentFactsId: factsId,
            switchedByIdentityId: actorIdentity.id,
            switchedAt: publishedAt,
          },
        });

        await tx.currentPage.update({
          where: { id: page.id },
          data: {
            status: "published",
            lastPublishedVersionNumber: page.lastPublishedVersionNumber + 1,
          },
        });
      const publication = await this.getPublication(page.id);
      if (!publication.ok) {
        return publication;
      }

      return publication;
    }
  }
}
