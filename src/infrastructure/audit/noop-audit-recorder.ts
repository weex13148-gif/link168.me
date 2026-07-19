import type { AuditEvent, AuditRecorder } from "@/shared/audit";

export class NoopAuditRecorder implements AuditRecorder {
  async record(_event: AuditEvent): Promise<void> {
    return undefined;
  }
}
