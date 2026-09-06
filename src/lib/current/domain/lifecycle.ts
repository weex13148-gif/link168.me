import type { CurrentLifecycleRecord, CurrentResult } from "@/lib/current/contracts";
import { currentErr, currentOk } from "@/lib/current/domain/shared";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function buildPendingCancellationLifecycle(input: {
  recordId: string;
  subjectType: CurrentLifecycleRecord["subjectType"];
  subjectId: string;
  scheduledAt: string;
  reason: string | null;
}): CurrentLifecycleRecord {
  const scheduledAt = new Date(input.scheduledAt);
  const restoreDeadline = new Date(scheduledAt.getTime() + THIRTY_DAYS_MS);

  return {
    recordId: input.recordId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    state: "pending_cancellation",
    scheduledAt: scheduledAt.toISOString(),
    restoreDeadlineAt: restoreDeadline.toISOString(),
    purgeDeadlineAt: restoreDeadline.toISOString(),
    legalHoldUntil: null,
    reason: input.reason,
  };
}

export function validateLifecycleRecord(record: CurrentLifecycleRecord): CurrentResult<CurrentLifecycleRecord> {
  const scheduledAt = new Date(record.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return currentErr("VALIDATION_ERROR", "scheduledAt 不是合法时间。", "scheduledAt");
  }

  if (record.restoreDeadlineAt && new Date(record.restoreDeadlineAt) < scheduledAt) {
    return currentErr("VALIDATION_ERROR", "restoreDeadlineAt 不能早于 scheduledAt。", "restoreDeadlineAt");
  }

  if (record.purgeDeadlineAt && new Date(record.purgeDeadlineAt) < scheduledAt) {
    return currentErr("VALIDATION_ERROR", "purgeDeadlineAt 不能早于 scheduledAt。", "purgeDeadlineAt");
  }

  return currentOk(record);
}
