import { NextResponse } from "next/server";
import {
  canShowPublicProfile,
  getActiveRestrictions,
  getCurrentUserFromRequest,
} from "@/lib/auth";

export const PUBLIC_AVATAR_CACHE_CONTROL = "public, max-age=86400, must-revalidate";
export const PRIVATE_AVATAR_CACHE_CONTROL = "private, no-store";

type AvatarAccessProfile = {
  userId: string;
  isPublic: boolean;
  user: { emailVerified: boolean };
};

export async function resolveAvatarAccess(
  request: Request,
  profile: AvatarAccessProfile,
): Promise<{ allowed: boolean; publiclyVisible: boolean }> {
  const currentUser = await getCurrentUserFromRequest(request).catch(() => null);
  const isOwnerPreview = currentUser?.id === profile.userId;
  let publiclyVisible = false;

  if (profile.isPublic && profile.user.emailVerified) {
    try {
      publiclyVisible = canShowPublicProfile(
        await getActiveRestrictions(profile.userId),
      ).ok;
    } catch {
      publiclyVisible = false;
    }
  }

  return {
    allowed: isOwnerPreview || publiclyVisible,
    publiclyVisible,
  };
}

export function createAvatarImageResponse(
  data: Buffer,
  contentType: string,
  publiclyVisible: boolean,
) {
  return new NextResponse(Uint8Array.from(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": publiclyVisible
        ? PUBLIC_AVATAR_CACHE_CONTROL
        : PRIVATE_AVATAR_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
