import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertMediaAssetTransition,
  canTransitionMediaAsset,
} from "@/domains/media/media-asset";
import { createLocalMediaStorage } from "@/infrastructure/media/local-media-storage";
import {
  createUploadingMediaAsset,
  setProfileAvatarAsset,
  transitionMediaAsset,
} from "@/infrastructure/media/prisma-media-assets";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];
const tempRoots: string[] = [];

async function createOwner() {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase1-media-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username: `phase1-media-${userId.slice(0, 10)}`,
          isPublic: false,
        },
      },
    },
  });
  return { userId, profileId };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 MediaAsset lifecycle", () => {
  test("only approved lifecycle transitions are accepted", () => {
    expect(canTransitionMediaAsset("uploading", "pending_review")).toBe(true);
    expect(canTransitionMediaAsset("uploading", "approved")).toBe(true);
    expect(canTransitionMediaAsset("uploading", "rejected")).toBe(true);
    expect(canTransitionMediaAsset("pending_review", "approved")).toBe(true);
    expect(canTransitionMediaAsset("pending_review", "rejected")).toBe(true);
    expect(canTransitionMediaAsset("pending_review", "deleted")).toBe(true);
    expect(canTransitionMediaAsset("approved", "deleted")).toBe(true);
    expect(canTransitionMediaAsset("rejected", "deleted")).toBe(true);

    expect(canTransitionMediaAsset("approved", "pending_review")).toBe(false);
    expect(canTransitionMediaAsset("rejected", "approved")).toBe(false);
    expect(canTransitionMediaAsset("deleted", "approved")).toBe(false);
    expect(() => assertMediaAssetTransition("approved", "pending_review")).toThrow(
      "INVALID_MEDIA_ASSET_TRANSITION",
    );
  });

  test("Prisma repository permits exactly one concurrent lifecycle claim", async () => {
    const owner = await createOwner();
    const asset = await createUploadingMediaAsset({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      purpose: "avatar",
      storageProvider: "local",
      storageKey: `avatars/${owner.userId}/${crypto.randomUUID()}.png`,
      originalName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: 9,
      checksumSha256: crypto.createHash("sha256").update("avatar").digest("hex"),
    });
    expect(asset.status).toBe("uploading");

    const results = await Promise.all([
      transitionMediaAsset({
        assetId: asset.id,
        ownerUserId: owner.userId,
        from: "uploading",
        to: "approved",
      }),
      transitionMediaAsset({
        assetId: asset.id,
        ownerUserId: owner.userId,
        from: "uploading",
        to: "rejected",
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });

  test("only an owned non-deleted avatar asset can become the profile avatar", async () => {
    const owner = await createOwner();
    const other = await createOwner();
    const asset = await createUploadingMediaAsset({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      purpose: "avatar",
      storageProvider: "local",
      storageKey: `avatars/${owner.userId}/${crypto.randomUUID()}.png`,
      originalName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: 9,
      checksumSha256: crypto.createHash("sha256").update("avatar").digest("hex"),
    });
    await transitionMediaAsset({
      assetId: asset.id,
      ownerUserId: owner.userId,
      from: "uploading",
      to: "approved",
    });

    await expect(
      setProfileAvatarAsset({
        ownerUserId: other.userId,
        profileId: other.profileId,
        assetId: asset.id,
      }),
    ).rejects.toThrow("MEDIA_ASSET_NOT_OWNED");

    await setProfileAvatarAsset({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      assetId: asset.id,
    });
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: asset.id });

    const deleted = await transitionMediaAsset({
      assetId: asset.id,
      ownerUserId: owner.userId,
      from: "approved",
      to: "deleted",
    });
    expect(deleted.ok).toBe(true);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: null });
  });
});

describe("Phase 1 local media storage", () => {
  test("writes, reads and deletes a relative storage key without path traversal", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "link168-media-"));
    tempRoots.push(root);
    const storage = createLocalMediaStorage(root);
    const storageKey = `avatars/test/${crypto.randomUUID()}.png`;
    const data = Buffer.from("media-asset");

    await storage.write(storageKey, data);
    expect(await storage.read(storageKey)).toEqual(data);
    await storage.delete(storageKey);
    await expect(storage.read(storageKey)).rejects.toMatchObject({ code: "ENOENT" });

    await expect(storage.write("../escape.png", data)).rejects.toThrow(
      "INVALID_MEDIA_STORAGE_KEY",
    );
    await expect(storage.read("/absolute.png")).rejects.toThrow(
      "INVALID_MEDIA_STORAGE_KEY",
    );
  });
});
