import type { CurrentAuditEntry, CurrentResult } from "@/lib/current/contracts";
import { currentErr, currentOk, isRecord } from "@/lib/current/domain/shared";

export function validateAuditEntry(entry: Omit<CurrentAuditEntry, "auditId" | "createdAt">): CurrentResult<true> {
  if (!entry.action.trim()) {
    return currentErr("VALIDATION_ERROR", "audit action 不能为空。", "action");
  }

  if (!entry.targetType.trim()) {
    return currentErr("VALIDATION_ERROR", "audit targetType 不能为空。", "targetType");
  }

  if (!entry.targetId.trim()) {
    return currentErr("VALIDATION_ERROR", "audit targetId 不能为空。", "targetId");
  }

  if (!isRecord(entry.metadata)) {
    return currentErr("VALIDATION_ERROR", "audit metadata 必须是对象。", "metadata");
  }

  return currentOk(true);
}
