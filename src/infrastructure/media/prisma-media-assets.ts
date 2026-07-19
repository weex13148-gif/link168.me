import crypto from "node:crypto";
import {
  assertMediaAssetTransition,
  type MediaAssetStatus,
} from "@/domains/media/media-asset";
import { db } from "@/lib/db";

export type CreateUploadingMediaAssetInput = Readonly<{
  ownerUserId: string;
  profileId: string | null;
  purpose: string;
  storageProvider: string;
  storageKey: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
}>;

export async function createUploadingMediaAsset(
  input: CreateUploadingMediaAssetInput,
) {
  return db.mediaAsset.create({
    data: {
      id: crypto.randomUUID(),
      ownerUserId: input.ownerUserId,
      profileId: input.profileId,
      purpose: input.purpose,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      status: "uploading",
    },
  });
}

export type TransitionMediaAssetResult =
  | Readonly<{ ok: true; asset: Awaited<ReturnType<typeof createUploadingMediaAsset>> }>
  | Readonly<{ ok: false; reason: "STALE_OR_NOT_OWNED" }>;

export async function transitionMediaAsset(input: {
  assetId: string;
  ownerUserId: string;
  from: MediaAssetStatus;
  to: MediaAssetStatus;
  moderationReason?: string | null;
  now?: Date;
}): Promise<TransitionMediaAssetResult> {
  assertMediaAssetTransition(input.from, input.to);
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    const claimed = await tx.mediaAsset.updateMany({
      where: {
        id: input.assetId,
        ownerUserId: input.ownerUserId,
        status: input.from,
      },
      data: {
        status: input.to,
        moderationReason:
          input.moderationReason === undefined ? undefined : input.moderationReason,
        deletedAt: input.to === "deleted" ? now : undefined,
      },
    });

    if (claimed.count !== 1) {
      return Object.freeze({ ok: false, reason: "STALE_OR_NOT_OWNED" as const });
    }

    if (input.to === "deleted") {
      await tx.profile.updateMany({
        where: { avatarAssetId: input.assetId },
        data: {
          avatarAssetId: null,
          avatarUrl: null,
          avatarModerationStatus: "pending",
        },
      });
    }

    const asset = await tx.mediaAsset.findUniqueOrThrow({
      where: { id: input.assetId },
    });
    return Object.freeze({ ok: true, asset });
  });
}

export async function setProfileAvatarAsset(input: {
  ownerUserId: string;
  profileId: string;
  assetId: string | null;
}) {
  return db.$transaction(async (tx) => {
    const profile = await tx.profile.findFirst({
      where: { id: input.profileId, userId: input.ownerUserId },
      select: { id: true },
    });
    if (!profile) throw new Error("MEDIA_PROFILE_NOT_OWNED");

    if (input.assetId) {
      const asset = await tx.mediaAsset.findFirst({
        where: {
          id: input.assetId,
          ownerUserId: input.ownerUserId,
          profileId: input.profileId,
          purpose: "avatar",
          status: { in: ["pending_review", "approved"] },
        },
        select: { id: true },
      });
      if (!asset) throw new Error("MEDIA_ASSET_NOT_OWNED");
    }

    return tx.profile.update({
      where: { id: input.profileId },
      data: { avatarAssetId: input.assetId },
    });
  });
}

export async function getCurrentAvatarAssetByUsername(username: string) {
  return db.profile.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: {
      id: true,
      userId: true,
      avatarAsset: true,
    },
  });
}
