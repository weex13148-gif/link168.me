import "server-only";

import type {
  CurrentError,
  CurrentLeadInput,
  CurrentLeadRecord,
  CurrentLeadRepository,
  CurrentResult,
} from "@/lib/current/contracts";
import type { CurrentLeadAuditHooks } from "@/lib/current/leads/audit";
import type { CurrentLeadCreateRequest } from "@/lib/current/leads/request";
import { currentDb } from "@/lib/current/data/prisma-current";
import { PrismaCurrentLeadRepository } from "@/lib/current/repositories/prisma-current-lead-repository";

export interface CurrentLeadPersistencePort {
  create(input: {
    request: CurrentLeadCreateRequest;
  }): Promise<CurrentResult<CurrentLeadRecord>>;
}

export interface CurrentLeadIdempotencyStore {
  get(workspaceId: string, key: string): Promise<CurrentResult<CurrentLeadRecord | null>>;
  put(workspaceId: string, key: string, record: CurrentLeadRecord): Promise<CurrentResult<void>>;
}

export interface CurrentLeadRateLimiter {
  check(key: string): CurrentResult<void>;
}

export interface CurrentLeadRuntime {
  persistence: CurrentLeadPersistencePort;
  idempotencyStore?: CurrentLeadIdempotencyStore;
  rateLimiter?: CurrentLeadRateLimiter;
  audit?: CurrentLeadAuditHooks;
}

let currentLeadRuntime: CurrentLeadRuntime | null = null;

function currentError(code: CurrentError["code"], message: string): CurrentResult<never> {
  return {
    ok: false,
    error: { code, message },
  };
}

function isPublishedOffering(value: unknown, offeringId: string): boolean {
  if (!Array.isArray(value)) return false;

  return value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return record.id === offeringId && record.visible !== false;
  });
}

function toServerLeadInput(request: CurrentLeadCreateRequest, input: {
  sourceMemberIdentityId?: string;
  offeringId?: string;
}): CurrentLeadInput {
  return {
    source: request.source,
    originPageId: request.originPageId,
    workspaceId: request.workspaceId,
    originPublicIdentity: request.originPublicIdentity,
    originMemberUserId: request.originMemberUserId,
    originOfferingId: request.originOfferingId,
    contact: request.contact,
    commercialIntent: request.commercialIntent,
    conversationId: request.conversationId,
    idempotencyKey: request.idempotencyKey,
    offeringId: input.offeringId,
    sourceMemberIdentityId: input.sourceMemberIdentityId,
  };
}

class PrismaCurrentLeadPersistence implements CurrentLeadPersistencePort {
  constructor(
    private readonly repository: CurrentLeadRepository = new PrismaCurrentLeadRepository(),
  ) {}

  async create(input: { request: CurrentLeadCreateRequest }): Promise<CurrentResult<CurrentLeadRecord>> {
    try {
      const page = await currentDb.currentPage.findUnique({
        where: { id: input.request.originPageId },
        include: {
          workspace: true,
          publishedPointer: { include: { currentFacts: true } },
        },
      });

      if (!page || page.workspaceId !== input.request.workspaceId || page.status !== "published") {
        return currentError("VALIDATION_ERROR", "Lead origin must be an active published CURRENT page.");
      }

      if (!page.workspace.isActive || !page.publishedPointer?.currentFacts) {
        return currentError("DEPENDENCY_UNAVAILABLE", "CURRENT workspace or Published Facts is unavailable.");
      }

      let sourceMemberIdentityId: string | undefined;
      if (page.kind === "member") {
        const membership = await currentDb.currentWorkspaceMember.findUnique({
          where: {
            workspaceId_identityId: {
              workspaceId: page.workspaceId,
              identityId: page.ownerIdentityId,
            },
          },
        });
        if (membership?.status === "active") {
          sourceMemberIdentityId = page.ownerIdentityId;
        }
      }

      let offeringId: string | undefined;
      if (input.request.originOfferingId) {
        if (!isPublishedOffering(page.publishedPointer.currentFacts.offerings, input.request.originOfferingId)) {
          return currentError("VALIDATION_ERROR", "Lead offering must exist in the current Published Facts.");
        }
        offeringId = input.request.originOfferingId;
      }

      const persisted = await this.repository.create(
        toServerLeadInput(input.request, { sourceMemberIdentityId, offeringId }),
      );
      if (!persisted.ok) {
        return persisted;
      }

      if (!persisted.value.assigneeIdentityId) {
        return currentError("INVALID_STATE", "Current lead repository returned no server-validated assignee.");
      }

      const assignee = await currentDb.currentIdentity.findUnique({
        where: { id: persisted.value.assigneeIdentityId },
        select: { accountStatus: true },
      });
      if (!assignee || assignee.accountStatus !== "active") {
        return currentError("INVALID_STATE", "Current lead assignee is not active.");
      }

      return persisted;
    } catch {
      return currentError("DEPENDENCY_UNAVAILABLE", "Current lead repository is unavailable.");
    }
  }
}

function createInMemoryIdempotencyStore(): CurrentLeadIdempotencyStore {
  const records = new Map<string, CurrentLeadRecord>();
  return {
    async get(workspaceId, key) {
      return { ok: true, value: records.get(`${workspaceId}:${key}`) ?? null };
    },
    async put(workspaceId, key, record) {
      records.set(`${workspaceId}:${key}`, record);
      return { ok: true, value: undefined };
    },
  };
}

function createInMemoryRateLimiter(maxRequests = 30, windowMs = 60_000): CurrentLeadRateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key) {
      const now = Date.now();
      const current = windows.get(key);
      if (!current || current.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, value: undefined };
      }
      if (current.count >= maxRequests) {
        return {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Lead submission rate limit exceeded. Please retry later.",
            retryable: true,
          },
        };
      }
      current.count += 1;
      return { ok: true, value: undefined };
    },
  };
}

function createDefaultCurrentLeadRuntime(): CurrentLeadRuntime {
  return {
    persistence: new PrismaCurrentLeadPersistence(),
    idempotencyStore: createInMemoryIdempotencyStore(),
    rateLimiter: createInMemoryRateLimiter(),
  };
}

export function registerCurrentLeadRuntime(runtime: CurrentLeadRuntime) {
  currentLeadRuntime = runtime;
}

export function getCurrentLeadRuntime(): CurrentLeadRuntime {
  currentLeadRuntime ??= createDefaultCurrentLeadRuntime();
  return currentLeadRuntime;
}
