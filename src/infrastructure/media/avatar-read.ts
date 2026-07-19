import { createLocalMediaStorage } from "@/infrastructure/media/local-media-storage";
import { getCurrentAvatarAssetByUsername } from "@/infrastructure/media/prisma-media-assets";
import { resolvePublicProfileAccess } from "@/infrastructure/profile/prisma-public-profile-access";
import { getUploadRoot } from "@/lib/upload-storage";

export type AvatarReadResult =
  | Readonly<{
      ok: true;
      data: Buffer;
      mimeType: string;
      ownerPreview: boolean;
    }>
  | Readonly<{
      ok: false;
      status: 400 | 403 | 404 | 500 | 503;
      error: string;
    }>;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

export async function readAvatarAsset(input: {
  username: string;
  viewerUserId: string | null;
}): Promise<AvatarReadResult> {
  const username = normalizeUsername(input.username);
  if (!username) return Object.freeze({ ok: false, status: 400, error: "无效的用户名。" });

  const resolution = await resolvePublicProfileAccess(username);
  if (resolution.type === "unavailable") {
    return Object.freeze({ ok: false, status: 503, error: "头像服务暂时不可用。" });
  }
  if (resolution.type !== "current") {
    return Object.freeze({ ok: false, status: 404, error: "头像不存在。" });
  }

  const ownerPreview = input.viewerUserId === resolution.profile.userId;
  if (!resolution.access.allowed && !ownerPreview) {
    return Object.freeze({ ok: false, status: 404, error: "头像不存在。" });
  }

  let record: Awaited<ReturnType<typeof getCurrentAvatarAssetByUsername>>;
  try {
    record = await getCurrentAvatarAssetByUsername(username);
  } catch {
    return Object.freeze({ ok: false, status: 503, error: "头像服务暂时不可用。" });
  }

  const avatarAsset = record?.avatarAsset;
  if (!avatarAsset || avatarAsset.status === "deleted" || avatarAsset.status === "rejected") {
    return Object.freeze({ ok: false, status: 404, error: "头像不存在。" });
  }
  if (!ownerPreview && avatarAsset.status !== "approved") {
    return Object.freeze({ ok: false, status: 403, error: "头像审核未通过或待审核。" });
  }
  if (ownerPreview && !["approved", "pending_review"].includes(avatarAsset.status)) {
    return Object.freeze({ ok: false, status: 403, error: "头像暂不可预览。" });
  }

  const storage = createLocalMediaStorage(getUploadRoot());
  try {
    const data = await storage.read(avatarAsset.storageKey);
    return Object.freeze({
      ok: true,
      data,
      mimeType: avatarAsset.mimeType,
      ownerPreview,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Object.freeze({ ok: false, status: 404, error: "头像不存在。" });
    }
    return Object.freeze({ ok: false, status: 500, error: "头像读取失败。" });
  }
}
