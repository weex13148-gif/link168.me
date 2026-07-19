export type AuditOutcome = "success" | "denied" | "failed";

export type AuditEvent = Readonly<{
  eventId: string;
  occurredAt: Date;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: AuditOutcome;
  metadata: Readonly<Record<string, unknown>>;
}>;

export interface AuditRecorder {
  record(event: AuditEvent): Promise<void>;
}
