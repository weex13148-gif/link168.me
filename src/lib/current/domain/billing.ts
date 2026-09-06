import type { CurrentBillingAccountRecord, CurrentBillingOwner, CurrentResult } from "@/lib/current/contracts";
import { currentErr, currentOk } from "@/lib/current/domain/shared";

export function validateBillingOwner(owner: CurrentBillingOwner): CurrentResult<CurrentBillingOwner> {
  if (!owner.ownerId.trim()) {
    return currentErr("VALIDATION_ERROR", "billing ownerId 不能为空。", "ownerId");
  }

  if (!owner.billingContactUserId.trim()) {
    return currentErr("VALIDATION_ERROR", "billingContactUserId 不能为空。", "billingContactUserId");
  }

  return currentOk(owner);
}

export function assertBillingWorkspaceIsolation(
  account: CurrentBillingAccountRecord,
  workspaceId: string,
): CurrentResult<CurrentBillingAccountRecord> {
  if (account.workspaceId !== workspaceId) {
    return currentErr("FORBIDDEN", "计费账户与目标 workspace 不匹配。");
  }

  return currentOk(account);
}
