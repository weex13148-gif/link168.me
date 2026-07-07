import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { deletePreviousAvatar } from "../src/app/api/dashboard/avatar/cleanup.ts";

const safeAvatarFileName = (fileName) =>
  /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(fileName) &&
  path.basename(fileName) === fileName;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withAvatarDirs(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "link168-avatar-cleanup-"));
  const avatarDir = path.join(root, "avatars");
  const legacyDir = path.join(root, "legacy");
  await mkdir(avatarDir, { recursive: true });
  await mkdir(legacyDir, { recursive: true });

  try {
    await run({ avatarDir, legacyDir, root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeFixture(baseDir, relativePath, content = "avatar") {
  const filePath = path.join(baseDir, ...relativePath.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return filePath;
}

function cleanupOptions(overrides) {
  return {
    previousAvatarUrl: "/api/avatar/alice",
    profileId: "profile_a",
    username: "alice",
    currentFilePath: "",
    currentFileName: "alice-profile_a-new.jpg",
    avatarUploadDir: "",
    legacyAvatarDirs: [],
    isSafeAvatarFileName: safeAvatarFileName,
    logger: () => undefined,
    ...overrides,
  };
}

test("deletes only the current user's previous avatar", async () => {
  await withAvatarDirs(async ({ avatarDir }) => {
    const oldAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-old.jpg");
    const currentAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-new.jpg");
    const otherUserAvatar = await writeFixture(avatarDir, "2026/07/04/bob-profile_b-old.jpg");
    const nonAvatarFile = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-note.txt");

    await deletePreviousAvatar(cleanupOptions({
      avatarUploadDir: avatarDir,
      currentFilePath: currentAvatar,
    }));

    assert.equal(await exists(oldAvatar), false);
    assert.equal(await exists(currentAvatar), true);
    assert.equal(await exists(otherUserAvatar), true);
    assert.equal(await exists(nonAvatarFile), true);
  });
});

test("does not bulk-delete avatars on first upload", async () => {
  await withAvatarDirs(async ({ avatarDir }) => {
    const currentAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-new.jpg");
    const otherUserAvatar = await writeFixture(avatarDir, "2026/07/04/bob-profile_b-old.jpg");

    await deletePreviousAvatar(cleanupOptions({
      previousAvatarUrl: null,
      avatarUploadDir: avatarDir,
      currentFilePath: currentAvatar,
    }));

    assert.equal(await exists(currentAvatar), true);
    assert.equal(await exists(otherUserAvatar), true);
  });
});

test("skips external avatar URLs", async () => {
  await withAvatarDirs(async ({ avatarDir }) => {
    const oldAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-old.jpg");

    await deletePreviousAvatar(cleanupOptions({
      previousAvatarUrl: "https://example.com/avatar.png",
      avatarUploadDir: avatarDir,
    }));

    assert.equal(await exists(oldAvatar), true);
  });
});

test("rejects path traversal in previous avatar URLs", async () => {
  await withAvatarDirs(async ({ avatarDir, legacyDir, root }) => {
    const outsideFile = await writeFixture(root, "secret.jpg");
    const legacyAvatar = await writeFixture(legacyDir, "alice-profile_a-old.jpg");

    await deletePreviousAvatar(cleanupOptions({
      previousAvatarUrl: "/uploads/../secret.jpg",
      avatarUploadDir: avatarDir,
      legacyAvatarDirs: [legacyDir],
    }));

    assert.equal(await exists(outsideFile), true);
    assert.equal(await exists(legacyAvatar), true);
  });
});

test("skips default or non-upload avatar URLs", async () => {
  await withAvatarDirs(async ({ avatarDir }) => {
    const oldAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-old.jpg");

    await deletePreviousAvatar(cleanupOptions({
      previousAvatarUrl: "/images/default-avatar.png",
      avatarUploadDir: avatarDir,
    }));

    assert.equal(await exists(oldAvatar), true);
  });
});

test("missing previous avatar file does not fail cleanup", async () => {
  await withAvatarDirs(async ({ avatarDir, legacyDir }) => {
    const currentAvatar = await writeFixture(avatarDir, "2026/07/04/alice-profile_a-new.jpg");

    await deletePreviousAvatar(cleanupOptions({
      previousAvatarUrl: "/uploads/alice-profile_a-missing.jpg",
      avatarUploadDir: avatarDir,
      legacyAvatarDirs: [legacyDir],
      currentFilePath: currentAvatar,
    }));

    assert.equal(await exists(currentAvatar), true);
  });
});
