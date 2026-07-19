import crypto from "node:crypto";
import {
  credentialConsumed,
  credentialRejected,
  type CredentialConsumeResult,
} from "@/domains/identity/credential-consumption";
import { db } from "@/lib/db";

function hashCredential(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function consumeEmailVerificationCredential(input: {
  credential: string;
  expectedUserId: string | null;
  now?: Date;
}): Promise<CredentialConsumeResult> {
  const tokenHash = hashCredential(input.credential);
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        user: { select: { accountStatus: true } },
      },
    });

    if (!record) return credentialRejected("INVALID_OR_EXPIRED");
    if (input.expectedUserId && input.expectedUserId !== record.userId) {
      return credentialRejected("ACCOUNT_MISMATCH");
    }
    if (record.user.accountStatus !== "active") {
      return credentialRejected("ACCOUNT_INACTIVE");
    }

    const claimed = await tx.emailVerificationToken.updateMany({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: now },
      },
      data: { used: true, usedAt: now },
    });
    if (claimed.count !== 1) {
      return credentialRejected("INVALID_OR_EXPIRED");
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    await tx.freezeRecord.updateMany({
      where: {
        userId: record.userId,
        type: "EMAIL_UNVERIFIED",
        isActive: true,
      },
      data: {
        isActive: false,
        clearedAt: now,
        clearedByUserId: null,
        clearedBySource: "EMAIL_VERIFICATION",
      },
    });
    await tx.user.updateMany({
      where: {
        id: record.userId,
        frozenReason: { startsWith: "FROZEN_EMAIL_UNVERIFIED" },
      },
      data: { frozenReason: null },
    });

    return credentialConsumed(record.userId);
  });
}

export async function consumePasswordResetCredential(input: {
  token: string;
  passwordHash: string;
  now?: Date;
}): Promise<CredentialConsumeResult> {
  const tokenHash = hashCredential(input.token);
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        user: { select: { accountStatus: true } },
      },
    });

    if (!record) return credentialRejected("INVALID_OR_EXPIRED");
    if (record.user.accountStatus !== "active") {
      return credentialRejected("ACCOUNT_INACTIVE");
    }

    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: now },
      },
      data: { used: true },
    });
    if (claimed.count !== 1) {
      return credentialRejected("INVALID_OR_EXPIRED");
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash: input.passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false },
      data: { used: true },
    });

    return credentialConsumed(record.userId);
  });
}
