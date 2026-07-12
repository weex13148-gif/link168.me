import assert from "node:assert/strict";
import test from "node:test";
import {
  getEmailVerificationCredentialHashes,
  hashAuthCredential,
  hashEmailVerificationCode,
  isEmailVerificationOverdue,
} from "./auth-credential-policy.ts";

test("email verification becomes overdue exactly 30 days after registration", () => {
  const now = new Date("2026-07-12T00:00:00.000Z");
  assert.equal(isEmailVerificationOverdue(new Date("2026-06-12T00:00:00.000Z"), now), true);
  assert.equal(isEmailVerificationOverdue(new Date("2026-06-12T00:00:00.001Z"), now), false);
});

test("six digit verification codes are scoped to the user id", () => {
  const code = "123456";
  assert.notEqual(hashEmailVerificationCode("user-a", code), hashEmailVerificationCode("user-b", code));
});

test("verification code lookup keeps a legacy hash fallback", () => {
  const hashes = getEmailVerificationCredentialHashes("123456", "user-a");
  assert.deepEqual(hashes, [
    hashEmailVerificationCode("user-a", "123456"),
    hashAuthCredential("123456"),
  ]);
});

test("link tokens use only the raw credential hash", () => {
  assert.deepEqual(getEmailVerificationCredentialHashes("token-value", null), [hashAuthCredential("token-value")]);
});
