import crypto from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];
const tempRoots: string[] = [];

async function createLegacyProfile(input: {
  avatarUrl: string;
  username?: string;
}) {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const username = input.username ?? `phase1-backfill-${userId.slice(0, 8)}`;
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase1-backfill-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username,
          isPublic: false,
          avatarUrl: input.avatarUrl,
          avatarModerationStatus: "legacy_approved",
        },
      },
    },
  });
  return { userId, profileId, username };
}

async function writeLegacyAvatar(root: string, profile: { profileId: string; username: string }, suffix: string) {
  const directory = path.join(root, "avatars", "2026", "07", "19");
  await mkdir(directory, { recursive: true });
  const filename = `${profile.username.toLowerCase()}-${profile.profileId}-${suffix}.png`;
  const filePath = path.join(directory, filename);
  const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, suffix.length]);
  await writeFile(filePath, data);
  return filePath;
}

function runBackfill(root: string, args: string[] = []) {
  return spawnSync(
    process.execPath,
    ["scripts/refactor/backfill-avatar-media-assets.mjs", ...args],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LINK168_UPLOAD_ROOT: root,
        NODE_ENV: "test",
      },
      encoding: "utf8",
    },
  );
}

function parseSummary(stdout: string) {
  return JSON.parse(stdout.trim()) as {
    mode: "dry-run" | "apply";
    scanned: number;
    wouldCreate: number;
    created: number;
    missing: number;
    duplicates: number;
    externalSkipped: number;
    errors: number;
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 legacy avatar backfill", () => {
  test("dry-run is the default and apply is idempotent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "link168-avatar-backfill-"));
    tempRoots.push(root);
    const profile = await createLegacyProfile({ avatarUrl: "/api/avatar/legacy" });
    await writeLegacyAvatar(root, profile, "only");

    const dryRun = runBackfill(root);
    expect(dryRun.status).toBe(0);
    expect(parseSummary(dryRun.stdout)).toMatchObject({
      mode: "dry-run",
      scanned: 1,
      wouldCreate: 1,
      created: 0,
      missing: 0,
      duplicates: 0,
      externalSkipped: 0,
      errors: 0,
    });
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: profile.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: null });

    const applied = runBackfill(root, ["--apply"]);
    expect(applied.status).toBe(0);
    expect(parseSummary(applied.stdout)).toMatchObject({
      mode: "apply",
      scanned: 1,
      wouldCreate: 0,
      created: 1,
      errors: 0,
    });
    const stored = await db.profile.findUniqueOrThrow({
      where: { id: profile.profileId },
      include: { avatarAsset: true },
    });
    expect(stored.avatarAsset).toMatchObject({
      ownerUserId: profile.userId,
      profileId: profile.profileId,
      purpose: "avatar",
      storageProvider: "local",
      status: "approved",
      mimeType: "image/png",
    });
    expect(stored.avatarUrl).toBe(`/api/avatar/${profile.username}`);

    const repeated = runBackfill(root, ["--apply"]);
    expect(repeated.status).toBe(0);
    expect(parseSummary(repeated.stdout)).toMatchObject({
      mode: "apply",
      scanned: 0,
      created: 0,
      errors: 0,
    });
    expect(await db.mediaAsset.count({ where: { profileId: profile.profileId } })).toBe(1);
  });

  test("missing and external avatars are skipped while duplicate matches use the newest mtime", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "link168-avatar-backfill-"));
    tempRoots.push(root);
    const missing = await createLegacyProfile({ avatarUrl: "/api/avatar/missing" });
    const duplicate = await createLegacyProfile({ avatarUrl: "/api/avatar/duplicate" });
    const older = await writeLegacyAvatar(root, duplicate, "older");
    const newer = await writeLegacyAvatar(root, duplicate, "newer");
    await utimes(older, new Date("2026-07-18T00:00:00Z"), new Date("2026-07-18T00:00:00Z"));
    await utimes(newer, new Date("2026-07-19T00:00:00Z"), new Date("2026-07-19T00:00:00Z"));
    await createLegacyProfile({ avatarUrl: "https://cdn.example.com/avatar.png" });

    const result = runBackfill(root, ["--apply"]);
    expect(result.status).toBe(0);
    expect(parseSummary(result.stdout)).toMatchObject({
      mode: "apply",
      scanned: 3,
      created: 1,
      missing: 1,
      duplicates: 1,
      externalSkipped: 1,
      errors: 0,
    });
    const stored = await db.profile.findUniqueOrThrow({
      where: { id: duplicate.profileId },
      include: { avatarAsset: true },
    });
    expect(stored.avatarAsset?.storageKey).toBe(
      path.relative(root, newer).split(path.sep).join("/"),
    );
    expect(await db.mediaAsset.count({ where: { profileId: duplicate.profileId } })).toBe(1);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: missing.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: null });
  });

  test("the script rejects database URL command-line overrides", () => {
    const root = path.join(os.tmpdir(), "link168-avatar-backfill-unused");
    const result = runBackfill(root, ["--database-url=postgresql://example"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_URL_OVERRIDE_FORBIDDEN");
  });

  test("the approved npm command uses the exact avatar-assets name", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts["backfill:avatar-assets"]).toBe(
      "node scripts/refactor/backfill-avatar-media-assets.mjs",
    );
    expect(packageJson.scripts["backfill:avatars"]).toBeUndefined();
  });
});
