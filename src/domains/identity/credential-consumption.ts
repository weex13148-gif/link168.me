export type CredentialConsumeFailure =
  | "INVALID_OR_EXPIRED"
  | "ACCOUNT_MISMATCH"
  | "ACCOUNT_INACTIVE";

export type CredentialConsumeResult =
  | Readonly<{ ok: true; userId: string }>
  | Readonly<{ ok: false; reason: CredentialConsumeFailure }>;

export function credentialConsumed(userId: string): CredentialConsumeResult {
  return Object.freeze({ ok: true, userId });
}

export function credentialRejected(
  reason: CredentialConsumeFailure,
): CredentialConsumeResult {
  return Object.freeze({ ok: false, reason });
}
