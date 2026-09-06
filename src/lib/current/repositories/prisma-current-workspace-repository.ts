import "server-only";

import type {
  CurrentResult,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
  CurrentWorkspaceRepository,
} from "@/lib/current/contracts";
import { currentDb, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { mapMembership, mapWorkspace } from "@/lib/current/repositories/mappers";

export class PrismaCurrentWorkspaceRepository implements CurrentWorkspaceRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async getWorkspace(workspaceId: string): Promise<CurrentResult<CurrentWorkspaceRecord>> {
    const row = await this.prisma.currentWorkspace.findUnique({ where: { id: workspaceId } });
    if (!row) {
      return currentErr("NOT_FOUND", "当前 workspace 不存在。");
    }

    return currentOk(mapWorkspace(row));
  }

  async getMembership(
    workspaceId: string,
    identityId: string,
  ): Promise<CurrentResult<CurrentWorkspaceMemberRecord>> {
    const row = await this.prisma.currentWorkspaceMember.findUnique({
      where: {
        workspaceId_identityId: {
          workspaceId,
          identityId,
        },
      },
    });

    if (!row) {
      return currentErr("NOT_FOUND", "当前用户不是该 workspace 成员。");
    }

    return currentOk(mapMembership(row));
  }
}
