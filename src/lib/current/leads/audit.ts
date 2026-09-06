import type { CurrentLeadRecord, CurrentLeadRouting } from "@/lib/current/contracts";
import type { CurrentLeadCreateRequest } from "@/lib/current/leads/request";

export interface CurrentLeadAuditHooks {
  onRequestParsed?(request: CurrentLeadCreateRequest): Promise<void> | void;
  onRejected?(input: { request: CurrentLeadCreateRequest; reason: string }): Promise<void> | void;
  onLeadAccepted?(input: { request: CurrentLeadCreateRequest }): Promise<void> | void;
  onIdempotencyHit?(input: { request: CurrentLeadCreateRequest; lead: CurrentLeadRecord }): Promise<void> | void;
  onRouted?(input: { request: CurrentLeadCreateRequest; routing: CurrentLeadRouting }): Promise<void> | void;
  onPersisted?(input: { request: CurrentLeadCreateRequest; lead: CurrentLeadRecord }): Promise<void> | void;
  onPersistFailure?(input: { request: CurrentLeadCreateRequest; reason: string }): Promise<void> | void;
}

export const noopCurrentLeadAuditHooks: CurrentLeadAuditHooks = {};
