export type MediaAssetStatus =
  | "uploading"
  | "pending_review"
  | "approved"
  | "rejected"
  | "deleted";

const ALLOWED_TRANSITIONS = {
  uploading: ["pending_review", "approved", "rejected"],
  pending_review: ["approved", "rejected", "deleted"],
  approved: ["deleted"],
  rejected: ["deleted"],
  deleted: [],
} as const satisfies Readonly<
  Record<MediaAssetStatus, readonly MediaAssetStatus[]>
>;

export function canTransitionMediaAsset(
  from: MediaAssetStatus,
  to: MediaAssetStatus,
): boolean {
  return (ALLOWED_TRANSITIONS[from] as readonly MediaAssetStatus[]).includes(to);
}

export function assertMediaAssetTransition(
  from: MediaAssetStatus,
  to: MediaAssetStatus,
): void {
  if (!canTransitionMediaAsset(from, to)) {
    throw new Error(`INVALID_MEDIA_ASSET_TRANSITION: ${from} -> ${to}`);
  }
}
