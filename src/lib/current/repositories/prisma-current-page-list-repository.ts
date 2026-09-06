import "server-only";

import type { CurrentPageRef, CurrentResult } from "@/lib/current/contracts";
import { currentDb, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { mapPageRef } from "@/lib/current/repositories/mappers";

export class PrismaCurrentPageListRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async listForActor(userId: string): Promise<CurrentResult<readonly CurrentPageRef[]>> {
    const identity = await this.prisma.currentIdentity.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!identity) return currentErr("NOT_FOUND", "当前用户尚未绑定 CURRENT identity。");

    const memberships = await this.prisma.currentWorkspaceMember.findMany({
      where: {
        identityId: identity.id,
        status: "active",
        workspace: { kind: "team", isActive: true },
      },
      select: { workspaceId: true, role: true },
    });
    const managedTeamIds = memberships.filter((membership) => membership.role === "owner" || membership.role === "admin").map((membership) => membership.workspaceId);
    const memberTeamIds = memberships.filter((membership) => membership.role === "member").map((membership) => membership.workspaceId);

    const pages = await this.prisma.currentPage.findMany({
      where: {
        status: { not: "disabled" },
        OR: [
          {
            kind: "personal",
            ownerIdentityId: identity.id,
            workspace: { kind: "personal", ownerIdentityId: identity.id },
          },
          ...(managedTeamIds.length > 0
            ? [{ workspaceId: { in: managedTeamIds }, kind: { in: ["team", "member"] } }]
            : []),
          ...(memberTeamIds.length > 0
            ? [{ workspaceId: { in: memberTeamIds }, kind: "member", ownerIdentityId: identity.id }]
            : []),
        ],
      },
      include: { workspace: { select: { name: true } } },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    });

    return currentOk(pages.map(mapPageRef));
  }
}
