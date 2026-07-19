import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  deleteProfileAvatar,
  replaceProfileAvatar,
  type AvatarObjectStorage,
} from "@/infrastructure/media/avatar-pipeline";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];

class MemoryAvatarStorage implements AvatarObjectStorage {
  readonly objects = new Map<string, Buffer>();
  failDelete = false;

  async write(storageKey: string, data: Buffer) {
    if (this.objects.has(storageKey)) throw new Error("OBJECT_EXISTS");
    this.objects.set(storageKey, Buffer.from(data));
  }

  async read(storageKey: string) {
    const data = this.objects.get(storageKey);
    if (!data) {
      const error = new Error("NOT_FOUND") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return Buffer.from(data);
  }

  async delete(storageKey: string): Promise<"deleted" | "not_found"> {
    if (this.failDelete) throw new Error("STORAGE_UNAVAILABLE");
    return this.objects.delete(storageKey) ? "deleted" : "not_found";
  }
}

async function createOwner() {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const username = `phase1-avatar-${userId.slice(0, 10)}`;
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase1-avatar-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username,
          isPublic: true,
        },
      },
    },
  });
  return { userId, profileId, username };
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 avatar MediaAsset pipeline", () => {
  test("approved upload writes one exact object, assigns it, and reports public effectiveness", async () => {
    const owner = await createOwner();
    const storage = new MemoryAvatarStorage();
    const data = Buffer.from("approved-avatar");

    const result = await replaceProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      username: owner.username,
      originalName: "avatar.jpg",
      mimeType: "image/jpeg",
      data,
      storage,
      moderate: async () => ({ status: "approved", reason: null }),
    });

    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect(result.moderationStatus).toBe("approved");
    expect(result.publicEffective).toBe(true);
    expect(storage.objects.get(result.asset.storageKey)).toEqual(data);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true, avatarUrl: true, avatarModerationStatus: true },
      }),
    ).toEqual({
      avatarAssetId: result.asset.id,
      avatarUrl: `/api/avatar/${owner.username}`,
      avatarModerationStatus: "approved",
    });
  });

  test("pending upload is assigned but truthfully reports that it is not public yet", async () => {
    const owner = await createOwner();
    const storage = new MemoryAvatarStorage();

    const result = await replaceProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      username: owner.username,
      originalName: "avatar.png",
      mimeType: "image/png",
      data: Buffer.from("pending-avatar"),
      storage,
      moderate: async () => ({ status: "pending_review", reason: "manual review" }),
    });

    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect(result.moderationStatus).toBe("pending_review");
    expect(result.publicEffective).toBe(false);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarModerationStatus: true },
      }),
    ).toEqual({ avatarModerationStatus: "pending_manual_review" });
  });

  test("rejected upload removes the exact object and never assigns it", async () => {
    const owner = await createOwner();
    const storage = new MemoryAvatarStorage();

    const result = await replaceProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      username: owner.username,
      originalName: "avatar.webp",
      mimeType: "image/webp",
      data: Buffer.from("rejected-avatar"),
      storage,
      moderate: async () => ({ status: "rejected", reason: "unsafe" }),
    });

    expect(result).toMatchObject({ kind: "rejected", reason: "unsafe" });
    expect(storage.objects.size).toBe(0);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: null });
    expect(await db.mediaAsset.findMany({ where: { profileId: owner.profileId } })).toEqual([
      expect.objectContaining({ status: "rejected" }),
    ]);
  });

  test("delete failure restores the assignment and never claims deletion", async () => {
    const owner = await createOwner();
    const storage = new MemoryAvatarStorage();
    const uploaded = await replaceProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      username: owner.username,
      originalName: "avatar.jpg",
      mimeType: "image/jpeg",
      data: Buffer.from("delete-failure-avatar"),
      storage,
      moderate: async () => ({ status: "approved", reason: null }),
    });
    expect(uploaded.kind).toBe("accepted");
    if (uploaded.kind !== "accepted") return;

    storage.failDelete = true;
    const deleted = await deleteProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      storage,
    });

    expect(deleted).toEqual({ ok: false, reason: "STORAGE_DELETE_FAILED" });
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true },
      }),
    ).toEqual({ avatarAssetId: uploaded.asset.id });
    expect(await db.mediaAsset.findUniqueOrThrow({ where: { id: uploaded.asset.id } })).toMatchObject({
      status: "approved",
      deletedAt: null,
    });
  });

  test("successful delete clears the assignment and marks the asset deleted", async () => {
    const owner = await createOwner();
    const storage = new MemoryAvatarStorage();
    const uploaded = await replaceProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      username: owner.username,
      originalName: "avatar.jpg",
      mimeType: "image/jpeg",
      data: Buffer.from("delete-avatar"),
      storage,
      moderate: async () => ({ status: "approved", reason: null }),
    });
    expect(uploaded.kind).toBe("accepted");
    if (uploaded.kind !== "accepted") return;

    const deleted = await deleteProfileAvatar({
      ownerUserId: owner.userId,
      profileId: owner.profileId,
      storage,
    });

    expect(deleted).toEqual({ ok: true, storageResult: "deleted" });
    expect(storage.objects.size).toBe(0);
    expect(
      await db.profile.findUniqueOrThrow({
        where: { id: owner.profileId },
        select: { avatarAssetId: true, avatarUrl: true },
      }),
    ).toEqual({ avatarAssetId: null, avatarUrl: null });
    expect(await db.mediaAsset.findUniqueOrThrow({ where: { id: uploaded.asset.id } })).toMatchObject({
      status: "deleted",
      deletedAt: expect.any(Date),
    });
  });
});

describe("Phase 1 avatar route and client contracts", () => {
  test("public avatar route performs exact MediaAsset lookup without recursive directory scans", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/infrastructure/media/avatar-read.ts"),
      "utf8",
    );
    expect(source).toContain("getCurrentAvatarAssetByUsername");
    expect(source).toContain("storage.read(avatarAsset.storageKey)");
    expect(source).not.toMatch(/\breaddir\b/);
    expect(source).not.toMatch(/\bstat\b/);
    expect(source).not.toContain("findAvatarFile");
    expect(source).not.toContain("getLegacyAvatarDirs");
  });

  test("client accepts sources up to 10MB, compresses first, then enforces the 2MB server limit", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/components/dashboard-v1/core-store.ts"),
      "utf8",
    );
    expect(source).toContain("MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024");
    expect(source).toContain("MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024");
    expect(source.indexOf("await compressAvatarImage(file)")).toBeLessThan(
      source.indexOf("uploadFile.size > MAX_AVATAR_UPLOAD_BYTES"),
    );
    expect(source).toContain("头像已上传，审核通过后将在公开主页生效。");
  });
});
