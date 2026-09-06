import "server-only";

import type {
  CurrentError,
  CurrentLeadRecord,
  CurrentResult,
} from "@/lib/current/contracts";
import type { CurrentLeadAuditHooks } from "@/lib/current/leads/audit";
import { noopCurrentLeadAuditHooks } from "@/lib/current/leads/audit";
import type { CurrentLeadCreateRequest } from "@/lib/current/leads/request";
import type {
  CurrentLeadIdempotencyStore,
  CurrentLeadPersistencePort,
  CurrentLeadRateLimiter,
} from "@/lib/current/leads/runtime";

interface CurrentLeadServiceDeps {
  persistence: CurrentLeadPersistencePort;
  idempotencyStore?: CurrentLeadIdempotencyStore;
  rateLimiter?: CurrentLeadRateLimiter;
  audit?: CurrentLeadAuditHooks;
}

function currentError(code: CurrentError["code"], message: string, field?: string): { ok: false; error: CurrentError } {
  return {
    ok: false,
    error: {
      code,
      message,
      field,
    },
  };
}

function hasExplicitCommercialIntent(intent: string): boolean {
  return intent.trim().length >= 5;
}

function hasValidContact(contact: CurrentLeadCreateRequest["contact"]): boolean {
  const validEmail = Boolean(contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(contact.email));
  const phoneDigits = contact.phone?.replace(/\D/g, "") ?? "";
  const validPhone = phoneDigits.length >= 7 && phoneDigits.length <= 20;
  const validWechat = Boolean(contact.wechat && /^[A-Za-z][A-Za-z0-9_-]{4,63}$/.test(contact.wechat));
  return validEmail || validPhone || validWechat;
}

function isPersistedLeadSafe(record: CurrentLeadRecord, request: CurrentLeadCreateRequest): boolean {
  return (
    record.workspaceId === request.workspaceId &&
    record.originPageId === request.originPageId &&
    (record.status === "new" || record.status === "contacted" || record.status === "closed") &&
    record.assigneeUserId.length > 0 &&
    record.routing.assigneeUserId === record.assigneeUserId &&
    record.handoff.assigneeUserId === record.assigneeUserId &&
    record.handoff.workspaceId === request.workspaceId
  );
}

export interface CurrentLeadRequestContext {
  rateLimitKey?: string;
}

export function createCurrentLeadService(deps: CurrentLeadServiceDeps) {
  const audit = deps.audit ?? noopCurrentLeadAuditHooks;

  return {
    async createLead(
      request: CurrentLeadCreateRequest,
      context: CurrentLeadRequestContext = {},
    ): Promise<CurrentResult<CurrentLeadRecord>> {
      await audit.onRequestParsed?.(request);

      const rateLimitKey = context.rateLimitKey ?? `${request.workspaceId}:${request.originPageId}`;
      const rateLimitResult = deps.rateLimiter?.check(rateLimitKey);
      if (rateLimitResult && !rateLimitResult.ok) {
        await audit.onRejected?.({ request, reason: rateLimitResult.error.message });
        return rateLimitResult;
      }

      if (!hasExplicitCommercialIntent(request.commercialIntent)) {
        await audit.onRejected?.({
          request,
          reason: "Explicit commercialIntent is missing or too short.",
        });
        return currentError(
          "VALIDATION_ERROR",
          "Lead requires explicit commercialIntent.",
          "commercialIntent",
        );
      }

      if (!hasValidContact(request.contact)) {
        const contactResult = currentError(
          "VALIDATION_ERROR",
          "Lead requires at least one valid contact: email, phone, or wechat.",
          "contact",
        );
        await audit.onRejected?.({ request, reason: contactResult.error.message });
        return contactResult;
      }

      await audit.onLeadAccepted?.({ request });

      if (deps.idempotencyStore && request.idempotencyKey) {
        const existing = await deps.idempotencyStore.get(request.workspaceId, request.idempotencyKey);
        if (!existing.ok) {
          return existing;
        }
        if (existing.value) {
          if (!isPersistedLeadSafe(existing.value, request)) {
            return currentError("IDEMPOTENCY_ERROR", "Existing idempotent lead does not match the current request.");
          }
          await audit.onIdempotencyHit?.({
            request,
            lead: existing.value,
          });
          return {
            ok: true,
            value: existing.value,
          };
        }
      }

      const persisted = await deps.persistence.create({ request });
      if (!persisted.ok) {
        await audit.onPersistFailure?.({
          request,
          reason: persisted.error.message,
        });
        return persisted;
      }

      if (!isPersistedLeadSafe(persisted.value, request)) {
        const unsafeResult = currentError("INTERNAL_ERROR", "Current lead routing or handoff validation failed.");
        await audit.onPersistFailure?.({ request, reason: unsafeResult.error.message });
        return unsafeResult;
      }

      await audit.onRouted?.({ request, routing: persisted.value.routing });

      if (deps.idempotencyStore && request.idempotencyKey) {
        await deps.idempotencyStore.put(request.workspaceId, request.idempotencyKey, persisted.value);
      }

      await audit.onPersisted?.({
        request,
        lead: persisted.value,
      });

      return persisted;
    },
  };
}
