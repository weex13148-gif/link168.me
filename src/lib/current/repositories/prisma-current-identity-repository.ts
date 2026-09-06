import "server-only";

import type { CurrentIdentityRecord, CurrentIdentityRepository, CurrentResult } from "@/lib/current/contracts";
import { currentDb, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { mapIdentity } from "@/lib/current/repositories/mappers";

export class PrismaCurrentIdentityRepository implements CurrentIdentityRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async getByUserId(userId: string): Promise<CurrentResult<CurrentIdentityRecord>> {
    const row = await this.prisma.currentIdentity.findUnique({ where: { userId } });
    if (!row) {
      return currentErr("NOT_FOUND", "当前 identity 不存在。");
    }

    return currentOk(mapIdentity(row));
  }

  async getByUsername(username: string): Promise<CurrentResult<CurrentIdentityRecord>> {
    const row = await this.prisma.currentIdentity.findUnique({ where: { normalizedUsername: username.trim().toLowerCase() } });
    if (!row) {
      return currentErr("NOT_FOUND", "当前 username 未被注册。");
    }

    return currentOk(mapIdentity(row));
  }
}
