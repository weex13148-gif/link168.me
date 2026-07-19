import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  consumeEmailVerificationCredential,
  consumePasswordResetCredential,
} from "@/infrastructure/identity/prisma-credential-consumption";

const createdUserIds: string[] = [];

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createUser(input?: { emailVerified?: boolean; accountStatus?: string }) {
  const id = crypto.randomUUID();
  createdUserIds.push(id);
  return db.user.create({
    data: {
      id,
      email: `phase1-${id}@example.com`,
      passwordHash: "initial-password-hash",
      emailVerified: input?.emailVerified ?? false,
      accountStatus: input?.accountStatus ?? "active",
    },
  });
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 atomic credential consumption", () => {
  test("exactly one concurrent email verification succeeds and only email restrictions clear", async () => {
    const user = await createUser();
    const credential = `verify-${crypto.randomUUID()}`;
    await db.emailVerificationToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: hashToken(credential),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await db.freezeRecord.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: user.id,
          type: "EMAIL_UNVERIFIED",
          source: "system",
          isActive: true,
        },
        {
          id: crypto.randomUUID(),
          userId: user.id,
          type: "ADMIN_FREEZE",
          source: "admin",
          isActive: true,
        },
      ],
    });
    await db.user.update({
      where: { id: user.id },
      data: { frozenReason: "FROZEN_EMAIL_UNVERIFIED_30D" },
    });

    const results = await Promise.all([
      consumeEmailVerificationCredential({ credential, expectedUserId: user.id }),
      consumeEmailVerificationCredential({ credential, expectedUserId: user.id }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "INVALID_OR_EXPIRED" },
    ]);

    const storedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(storedUser.emailVerified).toBe(true);
    expect(storedUser.frozenReason).toBeNull();

    const restrictions = await db.freezeRecord.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    });
    expect(restrictions.find((record) => record.type === "EMAIL_UNVERIFIED")?.isActive).toBe(false);
    expect(restrictions.find((record) => record.type === "ADMIN_FREEZE")?.isActive).toBe(true);
  });

  test("account mismatch does not consume an email credential", async () => {
    const user = await createUser();
    const credential = `verify-${crypto.randomUUID()}`;
    await db.emailVerificationToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: hashToken(credential),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await expect(
      consumeEmailVerificationCredential({
        credential,
        expectedUserId: crypto.randomUUID(),
      }),
    ).resolves.toEqual({ ok: false, reason: "ACCOUNT_MISMATCH" });

    const token = await db.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(credential) },
    });
    expect(token.used).toBe(false);
  });

  test("exactly one concurrent password reset succeeds and revokes all sessions and reset tokens", async () => {
    const user = await createUser({ emailVerified: true });
    const token = `reset-${crypto.randomUUID()}`;
    await db.passwordResetToken.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(`sibling-${crypto.randomUUID()}`),
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    });
    await db.session.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(`session-${crypto.randomUUID()}`),
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(`session-${crypto.randomUUID()}`),
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    });

    const passwordHashes = ["new-password-hash-a", "new-password-hash-b"];
    const results = await Promise.all(
      passwordHashes.map((passwordHash) =>
        consumePasswordResetCredential({ token, passwordHash }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "INVALID_OR_EXPIRED" },
    ]);

    const storedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(passwordHashes).toContain(storedUser.passwordHash);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect(
      await db.passwordResetToken.count({ where: { userId: user.id, used: false } }),
    ).toBe(0);
  });

  test.each([
    ["email", consumeEmailVerificationCredential],
    ["password", consumePasswordResetCredential],
  ])("inactive account cannot consume %s credentials", async (kind, consume) => {
    const user = await createUser({ accountStatus: "deactivated" });
    const raw = `${kind}-${crypto.randomUUID()}`;
    if (kind === "email") {
      await db.emailVerificationToken.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await expect(
        consume({ credential: raw, expectedUserId: user.id } as never),
      ).resolves.toEqual({ ok: false, reason: "ACCOUNT_INACTIVE" });
    } else {
      await db.passwordResetToken.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await expect(
        consume({ token: raw, passwordHash: "new-hash" } as never),
      ).resolves.toEqual({ ok: false, reason: "ACCOUNT_INACTIVE" });
    }
  });
});
