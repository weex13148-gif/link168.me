const PUBLIC_AVATAR_STATUSES = new Set(["approved", "legacy_approved"]);

export function resolvePublicAvatarUrl(input: {
  avatarUrl: string | null;
  avatarModerationStatus: string | null;
  updatedAt: Date;
}): string | null {
  if (!input.avatarUrl || !PUBLIC_AVATAR_STATUSES.has(input.avatarModerationStatus || "")) {
    return null;
  }

  return `${input.avatarUrl.split("?")[0]}?v=${input.updatedAt.getTime()}`;
}
