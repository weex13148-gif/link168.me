import crypto from "node:crypto";
import {
  createUploadingMediaAsset,
  transitionMediaAsset,
} from "@/infrastructure/media/prisma-media-assets";
import { db } from "@/lib/db";

export type AvatarObjectStorage = Readonly<{
  write(storageKey: string, data: Buffer): Promise<unknown>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<"deleted" | "not_found">;
}>;

export type AvatarModerationDecision = Readonly<{
  status: "approved" | "pending_review" | "rejected";
  reason?: string | null;
}>;

export type ReplaceProfileAvatarResult =
  | Readonly<{
      kind: "accepted";
      moderationStatus: "approved" | "pending_review";
      publicEffective: boolean;
      asset: Awaited<ReturnType<typeof createUploadingMediaAsset>>;
      profile: Awaited<ReturnType<typeof loadOwnedProfile>>;
      previousCleanup: "none" | "deleted" | "not_found" | "failed";
    }>
  | Readonly<{ kind: "rejected"; reason: string | null }>
  | Readonly<{
      kind: "failed";
      reason:
        | "PROFILE_NOT_OWNED"
        | "STORAGE_WRITE_FAILED"
        | "STORAGE_DELETE_FAILED"
        | "STATE_CONFLICT";
    }>;

function safeExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  throw new Error("UNSUPPORTED_AVATAR_MIME");
}

async function loadOwnedProfile(ownerUserId: string, profileId: string) {
  return db.profile.findFirst({
    where: { id: profileId, userId: ownerUserId },
    include: { avatarAsset: true },
  });
}

export async function replaceProfileAvatar(input: {
  ownerUserId: string;
  profileId: string;
  username: string;
  originalName: string | null;
  mimeType: string;
  data: Buffer;
  storage: AvatarObjectStorage;
  moderate: () => Promise<AvatarModerationDecision>;
}): Promise<ReplaceProfileAvatarResult> {
  const existingProfile = await loadOwnedProfile(input.ownerUserId, input.profileId);
  if (!existingProfile) {
    return Object.freeze({ kind: "failed", reason: "PROFILE_NOT_OWNED" });
  }

  const storageKey = `avatars/${input.profileId}/${crypto.randomUUID()}.${safeExtension(input.mimeType)}`;
  const asset = await createUploadingMediaAsset({
    ownerUserId: input.ownerUserId,
    profileId: input.profileId,
    purpose: "avatar",
    storageProvider: "local",
    storageKey,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.data.byteLength,
    checksumSha256: crypto.createHash("sha256").update(input.data).digest("hex"),
  });

  try {
    await input.storage.write(storageKey, input.data);
  } catch {
    await transitionMediaAsset({
      assetId: asset.id,
      ownerUserId: input.ownerUserId,
      from: "uploading",
      to: "rejected",
      moderationReason: "storage_write_failed",
    }).catch(() => undefined);
    return Object.freeze({ kind: "failed", reason: "STORAGE_WRITE_FAILED" });
  }

  let moderation: AvatarModerationDecision;
  try {
    moderation = await input.moderate();
  } catch {
    moderation = Object.freeze({ status: "pending_review", reason: "moderation_unavailable" });
  }

  if (moderation.status === "rejected") {
    const transitioned = await transitionMediaAsset({
      assetId: asset.id,
      ownerUserId: input.ownerUserId,
      from: "uploading",
      to: "rejected",
      moderationReason: moderation.reason ?? null,
    });
    if (!transitioned.ok) {
      return Object.freeze({ kind: "failed", reason: "STATE_CONFLICT" });
    }
    try {
      await input.storage.delete(storageKey);
    } catch {
      return Object.freeze({ kind: "failed", reason: "STORAGE_DELETE_FAILED" });
    }
    return Object.freeze({ kind: "rejected", reason: moderation.reason ?? null });
  }

  const targetStatus = moderation.status;
  const transitioned = await transitionMediaAsset({
    assetId: asset.id,
    ownerUserId: input.ownerUserId,
    from: "uploading",
    to: targetStatus,
    moderationReason: moderation.reason ?? null,
  });
  if (!transitioned.ok) {
    return Object.freeze({ kind: "failed", reason: "STATE_CONFLICT" });
  }

  const assigned = await db.$transaction(async (tx) => {
    const profile = await tx.profile.findFirst({
      where: { id: input.profileId, userId: input.ownerUserId },
      include: { avatarAsset: true },
    });
    if (!profile) return null;

    const assignable = await tx.mediaAsset.findFirst({
      where: {
        id: asset.id,
        ownerUserId: input.ownerUserId,
        profileId: input.profileId,
        purpose: "avatar",
        status: { in: ["approved", "pending_review"] },
      },
      select: { id: true },
    });
    if (!assignable) return null;

    const previousAsset = profile.avatarAsset;
    const updatedProfile = await tx.profile.update({
      where: { id: input.profileId },
      data: {
        avatarAssetId: asset.id,
        avatarUrl: `/api/avatar/${input.username}`,
        avatarModerationStatus:
          targetStatus === "approved" ? "approved" : "pending_manual_review",
      },
      include: { avatarAsset: true },
    });
    return { previousAsset, updatedProfile };
  });

  if (!assigned) {
    return Object.freeze({ kind: "failed", reason: "PROFILE_NOT_OWNED" });
  }

  let previousCleanup: "none" | "deleted" | "not_found" | "failed" = "none";
  const previous = assigned.previousAsset;
  if (previous && previous.id !== asset.id && previous.status !== "deleted") {
    try {
      previousCleanup = await input.storage.delete(previous.storageKey);
      const previousTransition = await transitionMediaAsset({
        assetId: previous.id,
        ownerUserId: input.ownerUserId,
        from: previous.status as "pending_review" | "approved" | "rejected",
        to: "deleted",
      });
      if (!previousTransition.ok) previousCleanup = "failed";
    } catch {
      previousCleanup = "failed";
    }
  }

  return Object.freeze({
    kind: "accepted",
    moderationStatus: targetStatus,
    publicEffective: targetStatus === "approved" && assigned.updatedProfile.isPublic,
    asset: transitioned.asset,
    profile: assigned.updatedProfile,
    previousCleanup,
  });
}

export async function deleteProfileAvatar(input: {
  ownerUserId: string;
  profileId: string;
  storage: AvatarObjectStorage;
}): Promise<
  | Readonly<{ ok: true; storageResult: "deleted" | "not_found" }>
  | Readonly<{ ok: false; reason: "PROFILE_NOT_OWNED" | "STORAGE_DELETE_FAILED" | "STATE_CONFLICT" }>
> {
  const detached = await db.$transaction(async (tx) => {
    const profile = await tx.profile.findFirst({
      where: { id: input.profileId, userId: input.ownerUserId },
      include: { avatarAsset: true },
    });
    if (!profile) return { type: "missing" as const };

    await tx.profile.update({
      where: { id: profile.id },
      data: {
        avatarAssetId: null,
        avatarUrl: null,
        avatarModerationStatus: "pending",
      },
    });
    return { type: "detached" as const, asset: profile.avatarAsset };
  });

  if (detached.type === "missing") {
    return Object.freeze({ ok: false, reason: "PROFILE_NOT_OWNED" });
  }
  if (!detached.asset) {
    return Object.freeze({ ok: true, storageResult: "not_found" });
  }

  let storageResult: "deleted" | "not_found";
  try {
    storageResult = await input.storage.delete(detached.asset.storageKey);
  } catch {
    await db.profile.updateMany({
      where: {
        id: input.profileId,
        userId: input.ownerUserId,
        avatarAssetId: null,
      },
      data: {
        avatarAssetId: detached.asset.id,
        avatarUrl: `/api/avatar/${(await db.profile.findUniqueOrThrow({ where: { id: input.profileId }, select: { username: true } })).username}`,
        avatarModerationStatus:
          detached.asset.status === "approved" ? "approved" : "pending_manual_review",
      },
    });
    return Object.freeze({ ok: false, reason: "STORAGE_DELETE_FAILED" });
  }

  const transitioned = await transitionMediaAsset({
    assetId: detached.asset.id,
    ownerUserId: input.ownerUserId,
    from: detached.asset.status as "pending_review" | "approved" | "rejected",
    to: "deleted",
  });
  if (!transitioned.ok) {
    return Object.freeze({ ok: false, reason: "STATE_CONFLICT" });
  }

  return Object.freeze({ ok: true, storageResult });
}
