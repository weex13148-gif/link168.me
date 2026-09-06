import "server-only";

import { randomUUID } from "node:crypto";

import type {
  CurrentAuditEntry,
  CurrentAuditRepository,
  CurrentBillingAccountRecord,
  CurrentBillingRepository,
  CurrentConsentRecord,
  CurrentConsentRepository,
  CurrentLifecycleRecord,
  CurrentLifecycleRepository,
  CurrentResult,
} from "@/lib/current/contracts";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { validateAuditEntry } from "@/lib/current/domain/audit";
import { assertBillingWorkspaceIsolation } from "@/lib/current/domain/billing";
import { validateConsentRecord } from "@/lib/current/domain/consent";
import { validateLifecycleRecord } from "@/lib/current/domain/lifecycle";
import { currentErr, currentOk } from "@/lib/current/domain/shared";
import { mapAuditEntry, mapBillingAccount, mapConsentRecord, mapLifecycleRecord } from "@/lib/current/repositories/mappers";

export class PrismaCurrentBillingRepository implements CurrentBillingRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async getAccountByWorkspaceId(workspaceId: string): Promise<CurrentResult<CurrentBillingAccountRecord>> {
    const row = await this.prisma.currentBillingAccount.findUnique({
      where: { workspaceId },
      include: {
        billingContactIdentity: true,
      },
    });

    if (!row) {
      return currentErr("NOT_FOUND", "当前 workspace 的计费账户不存在。");
    }

    const mapped = mapBillingAccount(row);
    return assertBillingWorkspaceIsolation(mapped, workspaceId);
  }
}

export class PrismaCurrentLifecycleRepository implements CurrentLifecycleRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async getLatest(
    subjectType: CurrentLifecycleRecord["subjectType"],
    subjectId: string,
  ): Promise<CurrentResult<CurrentLifecycleRecord>> {
    const row = await this.prisma.currentLifecycleRecord.findFirst({
      where: {
        subjectType,
        subjectId,
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    if (!row) {
      return currentErr("NOT_FOUND", "当前主体还没有 lifecycle 记录。");
    }

    const mapped = mapLifecycleRecord(row);
    return validateLifecycleRecord(mapped);
  }
}

export class PrismaCurrentConsentRepository implements CurrentConsentRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async listForIdentity(identityId: string): Promise<CurrentResult<readonly CurrentConsentRecord[]>> {
    const rows = await this.prisma.currentConsentRecord.findMany({
      where: {
        identityId,
      },
      orderBy: {
        grantedAt: "desc",
      },
    });

    const records = rows.map(mapConsentRecord);
    for (const record of records) {
      const validation = validateConsentRecord(record);
      if (!validation.ok) {
        return validation;
      }
    }

    return currentOk(records);
  }
}

export class PrismaCurrentAuditRepository implements CurrentAuditRepository {
  constructor(private readonly prisma: CurrentPrismaClient = currentDb) {}

  async append(entry: Omit<CurrentAuditEntry, "auditId" | "createdAt">): Promise<CurrentResult<CurrentAuditEntry>> {
    const validation = validateAuditEntry(entry);
    if (!validation.ok) {
      return validation;
    }

    const created = await this.prisma.currentAuditLog.create({
      data: {
        id: randomUUID(),
        actorIdentityId: entry.actorIdentityId,
        workspaceId: entry.workspaceId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        idempotencyKey: entry.idempotencyKey,
        metadata: toJsonValue(entry.metadata),
      },
    });

    return currentOk(mapAuditEntry(created));
  }
}
