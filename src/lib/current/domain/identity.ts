import type { CurrentIdentityRecord, CurrentResult } from "@/lib/current/contracts";
import { currentErr, currentOk, ensureOptionalString, normalizeComparableString } from "@/lib/current/domain/shared";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "console",
  "dashboard",
  "jeepwork",
  "login",
  "invite",
  "team",
  "privacy",
  "public",
  "report",
  "settings",
  "signup",
  "terms",
  "workbench",
]);

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export interface CurrentIdentityInput {
  userId: string;
  username: string;
  displayName?: string | null;
  personalWorkspaceId?: string | null;
}

export function normalizeUsername(username: string): string {
  return normalizeComparableString(username);
}

export function validateUsername(username: string): CurrentResult<string> {
  const normalized = normalizeUsername(username);

  if (normalized.length < 3 || normalized.length > 30) {
    return currentErr("VALIDATION_ERROR", "username 长度必须在 3 到 30 个字符之间。", "username");
  }

  if (!USERNAME_RE.test(normalized)) {
    return currentErr(
      "VALIDATION_ERROR",
      "username 仅允许小写字母、数字和连字符，且不能以连字符开头或结尾。",
      "username",
    );
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return currentErr("CONFLICT", "该 username 属于系统保留词，无法使用。", "username");
  }

  return currentOk(normalized);
}

export function buildCurrentIdentity(input: CurrentIdentityInput): CurrentResult<CurrentIdentityRecord> {
  const usernameResult = validateUsername(input.username);
  if (!usernameResult.ok) {
    return usernameResult;
  }

  const displayName = ensureOptionalString(input.displayName, 120);

  return currentOk({
    identityId: "",
    userId: input.userId,
    username: usernameResult.value,
    normalizedUsername: usernameResult.value,
    displayName,
    accountStatus: "active",
    personalWorkspaceId: input.personalWorkspaceId ?? null,
    createdAt: "",
    updatedAt: "",
  });
}
