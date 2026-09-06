import type {
  CurrentConsentRecord,
  CurrentPolicyVersionRecord,
  CurrentResult,
} from "@/lib/current/contracts";
import { currentErr, currentOk } from "@/lib/current/domain/shared";

export function validatePolicyVersion(record: CurrentPolicyVersionRecord): CurrentResult<CurrentPolicyVersionRecord> {
  if (!record.version.trim()) {
    return currentErr("VALIDATION_ERROR", "policy version 不能为空。", "version");
  }

  if (!record.contentReference.trim()) {
    return currentErr("VALIDATION_ERROR", "policy contentReference 不能为空。", "contentReference");
  }

  if (!record.contentHash.trim()) {
    return currentErr("VALIDATION_ERROR", "policy contentHash 不能为空。", "contentHash");
  }

  const effectiveAt = new Date(record.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime())) {
    return currentErr("VALIDATION_ERROR", "effectiveAt 不是合法时间。", "effectiveAt");
  }

  if (record.publishedAt) {
    const publishedAt = new Date(record.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) {
      return currentErr("VALIDATION_ERROR", "publishedAt 不是合法时间。", "publishedAt");
    }

    if (publishedAt < effectiveAt) {
      return currentErr("VALIDATION_ERROR", "publishedAt 不能早于 effectiveAt。", "publishedAt");
    }
  }

  return currentOk(record);
}

export function validateConsentRecord(record: CurrentConsentRecord): CurrentResult<CurrentConsentRecord> {
  if (!record.policyVersionId.trim()) {
    return currentErr("VALIDATION_ERROR", "policyVersionId 不能为空。", "policyVersionId");
  }

  if (!record.purpose.trim()) {
    return currentErr("VALIDATION_ERROR", "purpose 不能为空。", "purpose");
  }

  if (!record.dataCategory.trim()) {
    return currentErr("VALIDATION_ERROR", "dataCategory 不能为空。", "dataCategory");
  }

  if (!record.sourceScene.trim()) {
    return currentErr("VALIDATION_ERROR", "sourceScene 不能为空。", "sourceScene");
  }

  return currentOk(record);
}
