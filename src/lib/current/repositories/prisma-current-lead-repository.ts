import "server-only";

import { randomUUID } from "node:crypto";

import type { CurrentLeadInput, CurrentLeadRecord, CurrentLeadRepository, CurrentResult } from "@/lib/current/contracts";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { buildLeadRecord, routeLead, validateLeadInput } from "@/lib/current/domain/lead";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { mapMembership, mapPublishedFacts, mapWorkspace } from "@/lib/current/repositories/mappers";

export class PrismaCurrentLeadRepository implements CurrentLeadRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async create(input: CurrentLeadInput): Promise<CurrentResult<CurrentLeadRecord>> {
    const leadResult = validateLeadInput(input);
    if (!leadResult.ok) {
      return leadResult;
    }

    const page = await this.prisma.currentPage.findUnique({
      where: { id: input.originPageId },
      include: {
        workspace: true,
        publishedPointer: {
          include: {
            currentFacts: true,
          },
        },
      },
    });

    if (!page || !page.publishedPointer?.currentFacts) {
      return currentErr("NOT_FOUND", "Lead 只能从已发布页面产生。");
    }

    const workspace = mapWorkspace(page.workspace);
    const facts = mapPublishedFacts(page.publishedPointer.currentFacts);
    const activeMembers = (
      await this.prisma.currentWorkspaceMember.findMany({
        where: {
          workspaceId: workspace.workspaceId,
          status: "active",
        },
      })
    ).map(mapMembership);
    const routing = routeLead({
      lead: leadResult.value,
      facts,
      workspace,
      activeMembers,
    });

    if (!routing.ok) {
      return routing;
    }

    if (leadResult.value.idempotencyKey) {
      const existing = await this.prisma.currentLead.findUnique({
        where: {
          workspaceId_idempotencyKey: {
            workspaceId: workspace.workspaceId,
            idempotencyKey: leadResult.value.idempotencyKey,
          },
        },
        include: {
          assigneeIdentity: true,
        },
      });

      if (existing) {
        return currentOk(
          buildLeadRecord({
            leadId: existing.id,
            createdAt: existing.createdAt.toISOString(),
            lead: leadResult.value,
            assigneeUserId: existing.assigneeIdentity.userId,
            assigneeIdentityId: existing.assigneeIdentityId,
            routingReason: existing.routingReason,
          }),
        );
      }
    }

    const assigneeIdentity = await this.prisma.currentIdentity.findUnique({
      where: { id: routing.value.assigneeIdentityId },
    });

    if (!assigneeIdentity) {
      return currentErr("INVALID_STATE", "Lead 分配目标 identity 不存在。");
    }

    const created = await this.prisma.currentLead.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.workspaceId,
        originPageId: leadResult.value.originPageId,
        source: leadResult.value.source,
        status: "new",
        contact: toJsonValue(leadResult.value.contact),
        commercialIntent: leadResult.value.commercialIntent,
        conversationId: leadResult.value.conversationId ?? null,
        idempotencyKey: leadResult.value.idempotencyKey ?? null,
        offeringId: leadResult.value.offeringId ?? null,
        sourceMemberIdentityId: leadResult.value.sourceMemberIdentityId ?? null,
        assigneeIdentityId: assigneeIdentity.id,
        routingReason: routing.value.routingReason,
      },
    });

    return currentOk(
      buildLeadRecord({
        leadId: created.id,
        createdAt: created.createdAt.toISOString(),
        lead: leadResult.value,
        assigneeUserId: assigneeIdentity.userId,
        assigneeIdentityId: assigneeIdentity.id,
        routingReason: created.routingReason,
      }),
    );
  }
}
