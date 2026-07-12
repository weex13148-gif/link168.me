import crypto from "node:crypto";

export const EMAIL_VERIFICATION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function hashAuthCredential(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashEmailVerificationCode(userId: string, code: string): string {
  return hashAuthCredential(`${userId}:${code.trim()}`);
}

export function getEmailVerificationCredentialHashes(
  credential: string,
  expectedUserId?: string | null,
): string[] {
  const normalized = credential.trim();
  if (/^\d{6}$/.test(normalized) && expectedUserId) {
    return [hashEmailVerificationCode(expectedUserId, normalized), hashAuthCredential(normalized)];
  }
  return [hashAuthCredential(normalized)];
}

export function isEmailVerificationOverdue(createdAt: Date, now = new Date()): boolean {
  return createdAt.getTime() <= now.getTime() - EMAIL_VERIFICATION_GRACE_PERIOD_MS;
}
