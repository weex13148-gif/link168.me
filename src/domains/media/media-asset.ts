export type MediaAssetStatus =
  | "uploading"
  | "pending_review"
  | "approved"
  | "rejected"
  | "deleted";

const ALLOWED_TRANSITIONS: Readonly<Record<MediaAssetStatus, readonly MediaAssetStatus[]>> =
  Object.freeze({
    uploading: Object.freeze(["pending_review", "approved", "rejected"]),
    pending_review: Object.freeze(["approved", "rejected", "deleted"]),
    approved: Object.freeze(["deleted"]),
    rejected: Object.freeze(["deleted"]),
    deleted: Object.freeze([]),
  });

export function canTransitionMediaAsset(
  from: MediaAssetStatus,
  to: MediaAssetStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertMediaAssetTransition(
  from: MediaAssetStatus,
  to: MediaAssetStatus,
): void {
  if (!canTransitionMediaAsset(from, to)) {
    throw new Error(`INVALID_MEDIA_ASSET_TRANSITION: ${from} -> ${to}`);
  }
}
