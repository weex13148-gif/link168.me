import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  getEmailVerificationCredentialHashes,
  hashAuthCredential,
  isEmailVerificationOverdue,
} from "@/lib/auth-credential-policy";

const EMAIL_UNVERIFIED_RESTRICTION = "EMAIL_UNVERIFIED";

export async function syncEmailVerificationRestrictionAtBoundary(
  userId: string,
  now = new Date(),
): Promise<{ created: boolean }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, emailVerified: true },
  });

  if (!user || user.emailVerified || !isEmailVerificationOverdue(user.createdAt, now)) {
    return { created: false };
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.freezeRecord.findFirst({
      where: { userId, type: EMAIL_UNVERIFIED_RESTRICTION, isActive: true },
      select: { id: true },
    });
    if (existing) return { created: false };

    const ageDays = Math.floor((now.getTime() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    await tx.freezeRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: EMAIL_UNVERIFIED_RESTRICTION,
        reason: `注册 ${ageDays} 天未验证邮箱`,
        source: "system",
        isActive: true,
      },
    });
    await tx.user.updateMany({
      where: { id: userId, frozenReason: null },
      data: { frozenReason: "FROZEN_EMAIL_UNVERIFIED_30D" },
    });
    return { created: true };
  });
}

export async function consumeEmailVerificationCredential(
  credential: string,
  expectedUserId?: string | null,
): Promise<string | null> {
  const tokenHashes = getEmailVerificationCredentialHashes(credential, expectedUserId);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findFirst({
      where: {
        tokenHash: { in: tokenHashes },
        used: false,
        expiresAt: { gt: now },
        ...(expectedUserId ? { userId: expectedUserId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, userId: true },
    });
    if (!record) return null;

    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, used: false, expiresAt: { gt: now } },
      data: { used: true, usedAt: now },
    });
    if (claimed.count !== 1) return null;

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    await tx.user.updateMany({
      where: { id: record.userId, frozenReason: { startsWith: "FROZEN_EMAIL_UNVERIFIED" } },
      data: { frozenReason: null },
    });
    await tx.freezeRecord.updateMany({
      where: {
        userId: record.userId,
        type: EMAIL_UNVERIFIED_RESTRICTION,
        isActive: true,
      },
      data: {
        isActive: false,
        clearedAt: now,
        clearedByUserId: null,
        clearedBySource: "EMAIL_VERIFICATION",
      },
    });
    await tx.emailVerificationToken.updateMany({
      where: { userId: record.userId, id: { not: record.id }, used: false },
      data: { used: true, usedAt: now },
    });

    return record.userId;
  });
}

export async function resetPasswordWithToken(
  token: string,
  passwordHash: string,
): Promise<string | null> {
  const tokenHash = hashAuthCredential(token);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
    if (!record) return null;

    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, used: false, expiresAt: { gt: now } },
      data: { used: true },
    });
    if (claimed.count !== 1) return null;

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false },
      data: { used: true },
    });

    return record.userId;
  });
}
