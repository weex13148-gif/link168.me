import crypto from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(async () => ({ passed: true, remaining: 9, resetMs: 60_000 })),
}));

jest.mock("@/lib/mail", () => ({
  sendVerificationCodeWithPolicy: jest.fn(async () => ({
    ok: false,
    reason: "disabled-in-test",
    message: "测试环境不发送邮件。",
  })),
}));

jest.mock("@/lib/cache/public-profile", () => ({
  revalidatePublicProfileByUser: jest.fn(async () => undefined),
}));

import { POST as register } from "@/app/api/auth/register/route";
import { GET as readAvatar } from "@/app/api/avatar/[username]/route";
import { PUT as putProfileSettings } from "@/app/api/dashboard/profile/route";
import { GET as followLink } from "@/app/go/[linkId]/route";
import { evaluateAccountCapabilities } from "@/domains/identity/account-capabilities";
import {
  deleteProfileAvatar,
  replaceProfileAvatar,
} from "@/infrastructure/media/avatar-pipeline";
import { createLocalMediaStorage } from "@/infrastructure/media/local-media-storage";
import {
  consumeEmailVerificationCredential,
  consumePasswordResetCredential,
} from "@/infrastructure/identity/prisma-credential-consumption";
import { resolvePublicProfileAccess } from "@/infrastructure/profile/prisma-public-profile-access";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];
const tempRoots: string[] = [];
const previousUploadRoot = process.env.LINK168_UPLOAD_ROOT;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionTokenFrom(response: Response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const matched = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!matched) throw new Error("SESSION_COOKIE_MISSING");
  return matched[1];
}

function profileRequest(token: string, body: unknown) {
  return new Request("http://localhost/api/dashboard/profile", {
    method: "PUT",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function follow(linkId: string) {
  return followLink(
    new NextRequest(`http://localhost/go/${linkId}`, {
      headers: { "user-agent": "phase1-final-gate", "x-real-ip": "127.0.0.1" },
    }),
    { params: Promise.resolve({ linkId }) },
  );
}

async function avatar(username: string) {
  return readAvatar(new Request(`http://localhost/api/avatar/${username}`), {
    params: Promise.resolve({ username }),
  });
}

afterEach(async () => {
  process.env.LINK168_UPLOAD_ROOT = previousUploadRoot;
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 complete identity, profile and media chain", () => {
  test("registration through reset preserves one permission and asset authority", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "link168-phase1-gate-"));
    tempRoots.push(root);
    process.env.LINK168_UPLOAD_ROOT = root;
    const storage = createLocalMediaStorage(root);

    const email = `phase1-gate-${crypto.randomUUID()}@example.com`;
    const registration = await register(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
        body: JSON.stringify({
          email,
          password: "phase1-password",
          confirmPassword: "phase1-password",
          agreeTerms: true,
        }),
      }),
    );
    expect(registration.status).toBe(200);
    const registered = await registration.json() as {
      user: { id: string; emailVerified: boolean };
      profile: { username: string };
    };
    createdUserIds.push(registered.user.id);
    const sessionToken = sessionTokenFrom(registration);

    const initialProfile = await db.profile.findUniqueOrThrow({
      where: { userId: registered.user.id },
    });
    expect(initialProfile.isPublic).toBe(false);
    const unverifiedCapabilities = evaluateAccountCapabilities({
      accountStatus: "active",
      emailVerified: false,
      role: "user",
      restrictionTypes: [],
    });
    expect(unverifiedCapabilities).toMatchObject({
      canLogin: true,
      canEnterDashboard: true,
      canPublishProfile: false,
      canExposePublicResources: false,
    });

    const edited = await putProfileSettings(
      profileRequest(sessionToken, {
        displayName: "Phase 1 验收主页",
        bio: "未验证可以编辑，但不能公开。",
      }),
    );
    expect(edited.status).toBe(200);
    const deniedPublish = await putProfileSettings(
      profileRequest(sessionToken, { isPublic: true }),
    );
    expect(deniedPublish.status).toBe(403);

    const linkId = crypto.randomUUID();
    await db.link.create({
      data: {
        id: linkId,
        profileId: initialProfile.id,
        title: "Phase 1 验收链接",
        url: "https://example.com/phase1",
        isActive: true,
      },
    });
    const privateResolution = await resolvePublicProfileAccess(registered.profile.username);
    expect(privateResolution.type).toBe("current");
    if (privateResolution.type === "current") expect(privateResolution.access.allowed).toBe(false);
    expect((await follow(linkId)).headers.get("location")).toBe("http://localhost/");
    expect((await avatar(registered.profile.username)).status).toBe(404);

    const verificationCredential = `verify-${crypto.randomUUID()}`;
    await db.emailVerificationToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: registered.user.id,
        tokenHash: hashToken(verificationCredential),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const verificationResults = await Promise.all([
      consumeEmailVerificationCredential({
        credential: verificationCredential,
        expectedUserId: registered.user.id,
      }),
      consumeEmailVerificationCredential({
        credential: verificationCredential,
        expectedUserId: registered.user.id,
      }),
    ]);
    expect(verificationResults.filter((result) => result.ok)).toHaveLength(1);
    expect(verificationResults.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "INVALID_OR_EXPIRED" },
    ]);

    const published = await putProfileSettings(
      profileRequest(sessionToken, { isPublic: true }),
    );
    expect(published.status).toBe(200);

    const approvedAvatar = await replaceProfileAvatar({
      ownerUserId: registered.user.id,
      profileId: initialProfile.id,
      username: registered.profile.username,
      originalName: "approved.png",
      mimeType: "image/png",
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]),
      storage,
      moderate: async () => ({ status: "approved", reason: null }),
    });
    expect(approvedAvatar).toMatchObject({
      kind: "accepted",
      moderationStatus: "approved",
      publicEffective: true,
    });
    const publicResolution = await resolvePublicProfileAccess(registered.profile.username);
    expect(publicResolution.type).toBe("current");
    if (publicResolution.type === "current") expect(publicResolution.access.allowed).toBe(true);
    expect((await follow(linkId)).headers.get("location")).toBe("https://example.com/phase1");
    expect((await avatar(registered.profile.username)).status).toBe(200);

    const freezeId = crypto.randomUUID();
    await db.freezeRecord.create({
      data: {
        id: freezeId,
        userId: registered.user.id,
        type: "ADMIN_FREEZE",
        source: "admin",
        isActive: true,
      },
    });
    const frozenResolution = await resolvePublicProfileAccess(registered.profile.username);
    expect(frozenResolution.type).toBe("current");
    if (frozenResolution.type === "current") {
      expect(frozenResolution.access).toMatchObject({ allowed: false, reason: "ADMIN_FREEZE" });
    }
    expect((await follow(linkId)).headers.get("location")).toBe("http://localhost/");
    expect((await avatar(registered.profile.username)).status).toBe(404);

    await db.user.update({
      where: { id: registered.user.id },
      data: { accountStatus: "deactivated" },
    });
    const inactiveResolution = await resolvePublicProfileAccess(registered.profile.username);
    expect(inactiveResolution.type).toBe("current");
    if (inactiveResolution.type === "current") {
      expect(inactiveResolution.access).toMatchObject({ allowed: false, reason: "ACCOUNT_INACTIVE" });
    }

    await db.$transaction([
      db.user.update({
        where: { id: registered.user.id },
        data: { accountStatus: "active" },
      }),
      db.freezeRecord.update({
        where: { id: freezeId },
        data: { isActive: false, clearedAt: new Date(), clearedBySource: "SYSTEM" },
      }),
    ]);

    const resetToken = `reset-${crypto.randomUUID()}`;
    await db.passwordResetToken.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: registered.user.id,
          tokenHash: hashToken(resetToken),
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          id: crypto.randomUUID(),
          userId: registered.user.id,
          tokenHash: hashToken(`sibling-${crypto.randomUUID()}`),
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    });
    await createSession(registered.user.id);
    expect(await db.session.count({ where: { userId: registered.user.id } })).toBeGreaterThan(1);
    const resetResults = await Promise.all([
      consumePasswordResetCredential({ token: resetToken, passwordHash: "phase1-reset-a" }),
      consumePasswordResetCredential({ token: resetToken, passwordHash: "phase1-reset-b" }),
    ]);
    expect(resetResults.filter((result) => result.ok)).toHaveLength(1);
    expect(resetResults.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "INVALID_OR_EXPIRED" },
    ]);
    expect(await db.session.count({ where: { userId: registered.user.id } })).toBe(0);
    expect(
      await db.passwordResetToken.count({
        where: { userId: registered.user.id, used: false },
      }),
    ).toBe(0);

    const pendingAvatar = await replaceProfileAvatar({
      ownerUserId: registered.user.id,
      profileId: initialProfile.id,
      username: registered.profile.username,
      originalName: "pending.png",
      mimeType: "image/png",
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]),
      storage,
      moderate: async () => ({ status: "pending_review", reason: "manual" }),
    });
    expect(pendingAvatar).toMatchObject({
      kind: "accepted",
      moderationStatus: "pending_review",
      publicEffective: false,
    });
    expect((await avatar(registered.profile.username)).status).toBe(403);

    const rejectedAvatar = await replaceProfileAvatar({
      ownerUserId: registered.user.id,
      profileId: initialProfile.id,
      username: registered.profile.username,
      originalName: "rejected.png",
      mimeType: "image/png",
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x03]),
      storage,
      moderate: async () => ({ status: "rejected", reason: "unsafe" }),
    });
    expect(rejectedAvatar).toEqual({ kind: "rejected", reason: "unsafe" });

    const deleted = await deleteProfileAvatar({
      ownerUserId: registered.user.id,
      profileId: initialProfile.id,
      storage,
    });
    expect(deleted).toMatchObject({ ok: true });
    expect((await avatar(registered.profile.username)).status).toBe(404);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: initialProfile.id },
        select: { avatarAssetId: true, avatarUrl: true },
      }),
    ).toEqual({ avatarAssetId: null, avatarUrl: null });
  });

  test("the Phase 1 ordered verification runner is registered", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts["verify:phase1"]).toBe(
      "node scripts/refactor/run-phase1-verification.mjs",
    );
    await expect(
      readFile(path.join(process.cwd(), "scripts/refactor/run-phase1-verification.mjs"), "utf8"),
    ).resolves.toContain("phase-1-verification.json");
  });
});
