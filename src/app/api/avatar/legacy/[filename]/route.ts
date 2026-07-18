import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  createAvatarImageResponse,
  resolveAvatarAccess,
} from "@/lib/avatar-access";
import { db } from "@/lib/db";
import {
  getAvatarContentType,
  getLegacyAvatarDirs,
  isSafeAvatarFileName,
} from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODERATION_STATUSES = new Set(["approved", "legacy_approved"]);

function unavailable() {
  return NextResponse.json({ error: "头像不存在。" }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = path.basename(rawFilename);
  if (filename !== rawFilename || !isSafeAvatarFileName(filename)) {
    return unavailable();
  }

  const legacyUrls = [
    `/uploads/avatars/${filename}`,
    `/uploads/${filename}`,
  ];
  const profile = await db.profile.findFirst({
    where: {
      OR: legacyUrls.flatMap((avatarUrl) => [
        { avatarUrl },
        { avatarUrl: { startsWith: `${avatarUrl}?` } },
      ]),
    },
    select: {
      userId: true,
      isPublic: true,
      avatarModerationStatus: true,
      user: { select: { emailVerified: true } },
    },
  }).catch(() => null);

  if (!profile) return unavailable();

  const access = await resolveAvatarAccess(request, profile);
  if (!access.allowed) return unavailable();

  if (
    profile.avatarModerationStatus &&
    !ALLOWED_MODERATION_STATUSES.has(profile.avatarModerationStatus)
  ) {
    return unavailable();
  }

  for (const directory of getLegacyAvatarDirs()) {
    try {
      const data = await readFile(path.join(directory, filename));
      return createAvatarImageResponse(
        data,
        getAvatarContentType(filename),
        access.publiclyVisible,
      );
    } catch {
      // Continue to the next legacy location.
    }
  }

  return unavailable();
}
