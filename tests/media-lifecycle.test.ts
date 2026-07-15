import { access, mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  collectManagedMediaUrls,
  deleteOwnedMediaObject,
  resolveOwnedMediaObject,
} from "@/lib/owned-media";
import { deletePreviousAvatar } from "@/app/api/dashboard/avatar/cleanup";
import { isSafeAvatarFileName } from "@/lib/upload-storage";

const ownerId = "11111111-1111-4111-8111-111111111111";
const foreignOwnerId = "22222222-2222-4222-8222-222222222222";
const ownedUrl = `/api/dashboard/media/cover/${ownerId}/2026/07/15/owned.png`;

describe("owned media lifecycle", () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(path.join(os.tmpdir(), "link168-media-"));
    process.env.LINK168_UPLOAD_ROOT = uploadRoot;
  });

  afterEach(async () => {
    delete process.env.LINK168_UPLOAD_ROOT;
    await rm(uploadRoot, { recursive: true, force: true });
  });

  test("resolves only an allowlisted local object owned by the current profile", () => {
    expect(resolveOwnedMediaObject(ownedUrl, ownerId)).toMatchObject({
      kind: "cover",
      ownerId,
      relativePath: `${ownerId}/2026/07/15/owned.png`,
    });
    expect(resolveOwnedMediaObject(ownedUrl, foreignOwnerId)).toBeNull();
    expect(resolveOwnedMediaObject("https://attacker.example/owned.png", ownerId)).toBeNull();
    expect(resolveOwnedMediaObject("/api/dashboard/media/cover/../../owned.png", ownerId)).toBeNull();
  });

  test("deletes an unreferenced owned object and makes repeat deletion idempotent", async () => {
    const resolved = resolveOwnedMediaObject(ownedUrl, ownerId);
    expect(resolved).not.toBeNull();
    await mkdir(path.dirname(resolved!.fullPath), { recursive: true });
    await writeFile(resolved!.fullPath, "owned");

    await expect(deleteOwnedMediaObject({
      url: ownedUrl,
      ownerId,
      isStillReferenced: async () => false,
    })).resolves.toMatchObject({ status: "deleted" });
    await expect(access(resolved!.fullPath)).rejects.toMatchObject({ code: "ENOENT" });

    await expect(deleteOwnedMediaObject({
      url: ownedUrl,
      ownerId,
      isStillReferenced: async () => false,
    })).resolves.toMatchObject({ status: "not_found" });
  });

  test("retains shared files and never removes foreign or external targets", async () => {
    const resolved = resolveOwnedMediaObject(ownedUrl, ownerId)!;
    await mkdir(path.dirname(resolved.fullPath), { recursive: true });
    await writeFile(resolved.fullPath, "shared");

    await expect(deleteOwnedMediaObject({
      url: ownedUrl,
      ownerId,
      isStillReferenced: async () => true,
    })).resolves.toMatchObject({ status: "shared" });
    await expect(access(resolved.fullPath)).resolves.toBeUndefined();

    await expect(deleteOwnedMediaObject({
      url: ownedUrl.replace(ownerId, foreignOwnerId),
      ownerId,
      isStillReferenced: async () => false,
    })).resolves.toMatchObject({ status: "not_owned" });
    await expect(deleteOwnedMediaObject({
      url: "https://cdn.example.com/image.png",
      ownerId,
      isStillReferenced: async () => false,
    })).resolves.toMatchObject({ status: "not_owned" });
  });

  test("reports storage deletion failures instead of claiming success", async () => {
    const removeFile = jest.fn(async () => {
      throw Object.assign(new Error("storage unavailable"), { code: "EIO" });
    });

    await expect(deleteOwnedMediaObject({
      url: ownedUrl,
      ownerId,
      isStillReferenced: async () => false,
      removeFile,
    })).resolves.toMatchObject({ status: "failed", reason: "storage_delete_failed" });
    expect(removeFile).toHaveBeenCalledTimes(1);
  });

  test("finds persisted local media references without treating remote URLs as owned", () => {
    const iconUrl = `/api/dashboard/links/icon/${ownerId}/2026/07/15/icon.png`;
    const payload = JSON.stringify({
      coverImageUrl: ownedUrl,
      images: [{ imageUrl: iconUrl }, { imageUrl: "https://cdn.example.com/shared.png" }],
    });

    expect(collectManagedMediaUrls(payload)).toEqual(new Set([ownedUrl, iconUrl]));
  });

  test("replaces and deletes only avatars owned by the current profile", async () => {
    const avatarRoot = path.join(uploadRoot, "avatars");
    const avatarDir = path.join(avatarRoot, "2026", "07", "15");
    const oldName = `alice-${ownerId}-old.png`;
    const currentName = `alice-${ownerId}-current.png`;
    const oldPath = path.join(avatarDir, oldName);
    const currentPath = path.join(avatarDir, currentName);
    await mkdir(avatarDir, { recursive: true });
    await writeFile(oldPath, "old");
    await writeFile(currentPath, "current");

    const options = {
      previousAvatarUrl: "/api/avatar/alice",
      profileId: ownerId,
      username: "alice",
      currentFilePath: currentPath,
      currentFileName: currentName,
      avatarUploadDir: avatarRoot,
      legacyAvatarDirs: [],
      isSafeAvatarFileName,
    };

    await expect(deletePreviousAvatar(options)).resolves.toMatchObject({
      status: "deleted",
      deletedCount: 1,
      failedCount: 0,
    });
    await expect(access(oldPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(currentPath)).resolves.toBeUndefined();

    await expect(deletePreviousAvatar(options)).resolves.toMatchObject({ status: "not_found" });
    await expect(deletePreviousAvatar({
      ...options,
      previousAvatarUrl: "https://cdn.example.com/avatar.png",
      currentFilePath: "",
      currentFileName: "",
    })).resolves.toMatchObject({ status: "not_owned" });
    await expect(access(currentPath)).resolves.toBeUndefined();
  });
});
