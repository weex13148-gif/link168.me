import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getAvatarUploadDir,
  getAvatarContentType,
  getLegacyAvatarDirs,
  isSafeAvatarFileName,
} from "@/lib/upload-storage";
import {
  createAvatarImageResponse,
  resolveAvatarAccess,
} from "@/lib/avatar-access";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODERATION_STATUSES = new Set(["approved", "legacy_approved"]);

function sanitizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

async function findAvatarFile(username: string): Promise<string | null> {
  const safeUsername = sanitizeUsername(username);
  if (!safeUsername) return null;

  const uploadDir = getAvatarUploadDir();
  const prefix = `${safeUsername}-`;

  let newestFile: string | null = null;
  let newestMtime = 0;

  try {
    const topLevelEntries = await readdir(uploadDir, { withFileTypes: true });
    for (const entry of topLevelEntries) {
      if (entry.isDirectory()) {
        const yearDir = path.join(uploadDir, entry.name);
        try {
          const monthEntries = await readdir(yearDir, { withFileTypes: true });
          for (const monthEntry of monthEntries) {
            if (monthEntry.isDirectory()) {
              const monthDir = path.join(yearDir, monthEntry.name);
              try {
                const dayEntries = await readdir(monthDir, { withFileTypes: true });
                for (const dayEntry of dayEntries) {
                  if (dayEntry.isDirectory()) {
                    const dayDir = path.join(monthDir, dayEntry.name);
                    try {
                      const files = await readdir(dayDir);
                      const matched = files.filter((f) => f.startsWith(prefix) && isSafeAvatarFileName(f));
                      for (const file of matched) {
                        const fullPath = path.join(dayDir, file);
                        try {
                          const stats = await stat(fullPath);
                          if (stats.mtimeMs > newestMtime) {
                            newestMtime = stats.mtimeMs;
                            newestFile = fullPath;
                          }
                        } catch {
                          // ignore
                        }
                      }
                    } catch {
                      // ignore
                    }
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
      } else if (entry.isFile()) {
        if (entry.name.startsWith(prefix) && isSafeAvatarFileName(entry.name)) {
          const fullPath = path.join(uploadDir, entry.name);
          try {
            const stats = await stat(fullPath);
            if (stats.mtimeMs > newestMtime) {
              newestMtime = stats.mtimeMs;
              newestFile = fullPath;
            }
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }

  if (newestFile) {
    return newestFile;
  }

  const legacyDirs = getLegacyAvatarDirs();
  for (const dir of legacyDirs) {
    try {
      const files = await readdir(dir);
      const matched = files.filter((f) => f.startsWith(prefix) && isSafeAvatarFileName(f));
      if (matched.length > 0) {
        matched.sort().reverse();
        return path.join(dir, matched[0]);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const safeUsername = sanitizeUsername(username);

  if (!safeUsername) {
    return NextResponse.json({ error: "无效的用户名。" }, { status: 400 });
  }

  const profile = await db.profile.findUnique({
    where: { username: safeUsername },
    select: {
      userId: true,
      isPublic: true,
      avatarUrl: true,
      updatedAt: true,
      avatarModerationStatus: true,
      user: { select: { emailVerified: true } },
    },
  }).catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "用户不存在。" }, { status: 404 });
  }

  const access = await resolveAvatarAccess(request, profile);
  if (!access.allowed) {
    return NextResponse.json({ error: "头像不存在。" }, { status: 404 });
  }

  if (profile.avatarModerationStatus && !ALLOWED_MODERATION_STATUSES.has(profile.avatarModerationStatus)) {
    return NextResponse.json({ error: "头像审核未通过或待审核。" }, { status: 403 });
  }

  if (profile?.avatarUrl && profile.avatarUrl.startsWith("/uploads/")) {
    const legacyPath = profile.avatarUrl.split("?")[0];
    const fileName = path.basename(legacyPath);
    if (isSafeAvatarFileName(fileName)) {
      const legacyDirs = getLegacyAvatarDirs();
      for (const dir of legacyDirs) {
        try {
          const filePath = path.join(dir, fileName);
          const data = await readFile(filePath);
          const contentType = getAvatarContentType(fileName);
          return createAvatarImageResponse(data, contentType, access.publiclyVisible);
        } catch {
          // continue
        }
      }
    }
  }

  const avatarFilePath = await findAvatarFile(safeUsername);
  if (!avatarFilePath) {
    return NextResponse.json({ error: "头像不存在。" }, { status: 404 });
  }

  const fileName = path.basename(avatarFilePath);
  try {
    const data = await readFile(avatarFilePath);
    const contentType = getAvatarContentType(fileName);
    return createAvatarImageResponse(data, contentType, access.publiclyVisible);
  } catch {
    return NextResponse.json({ error: "头像读取失败。" }, { status: 500 });
  }
}
