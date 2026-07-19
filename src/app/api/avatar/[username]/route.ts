import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { resolvePublicProfileAccess } from "@/infrastructure/profile/prisma-public-profile-access";
import {
  getAvatarUploadDir,
  getAvatarContentType,
  getLegacyAvatarDirs,
  isSafeAvatarFileName,
} from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODERATION_STATUSES = new Set(["approved", "legacy_approved"]);

function sanitizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function privateError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
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
                      const matched = files.filter(
                        (file) => file.startsWith(prefix) && isSafeAvatarFileName(file),
                      );
                      for (const file of matched) {
                        const fullPath = path.join(dayDir, file);
                        try {
                          const stats = await stat(fullPath);
                          if (stats.mtimeMs > newestMtime) {
                            newestMtime = stats.mtimeMs;
                            newestFile = fullPath;
                          }
                        } catch {
                          // Continue checking other candidate files.
                        }
                      }
                    } catch {
                      // Continue checking other date directories.
                    }
                  }
                }
              } catch {
                // Continue checking other year directories.
              }
            }
          }
        } catch {
          // Continue checking top-level entries.
        }
      } else if (
        entry.isFile() &&
        entry.name.startsWith(prefix) &&
        isSafeAvatarFileName(entry.name)
      ) {
        const fullPath = path.join(uploadDir, entry.name);
        try {
          const stats = await stat(fullPath);
          if (stats.mtimeMs > newestMtime) {
            newestMtime = stats.mtimeMs;
            newestFile = fullPath;
          }
        } catch {
          // Continue checking other candidate files.
        }
      }
    }
  } catch {
    // Fall back to legacy directories.
  }

  if (newestFile) return newestFile;

  for (const dir of getLegacyAvatarDirs()) {
    try {
      const files = await readdir(dir);
      const matched = files.filter(
        (file) => file.startsWith(prefix) && isSafeAvatarFileName(file),
      );
      if (matched.length > 0) {
        matched.sort().reverse();
        return path.join(dir, matched[0]);
      }
    } catch {
      // Continue checking remaining legacy directories.
    }
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const safeUsername = sanitizeUsername(username);

  if (!safeUsername) {
    return privateError("无效的用户名。", 400);
  }

  const resolution = await resolvePublicProfileAccess(safeUsername);
  if (resolution.type === "unavailable") {
    return privateError("头像服务暂时不可用。", 503);
  }
  if (resolution.type !== "current" || !resolution.access.allowed) {
    return privateError("头像不存在。", 404);
  }

  const profile = resolution.profile;
  if (
    profile.avatarModerationStatus &&
    !ALLOWED_MODERATION_STATUSES.has(profile.avatarModerationStatus)
  ) {
    return privateError("头像审核未通过或待审核。", 403);
  }

  if (profile.avatarUrl?.startsWith("/uploads/")) {
    const legacyPath = profile.avatarUrl.split("?")[0];
    const fileName = path.basename(legacyPath);
    if (isSafeAvatarFileName(fileName)) {
      for (const dir of getLegacyAvatarDirs()) {
        try {
          const filePath = path.join(dir, fileName);
          const data = await readFile(filePath);
          return new NextResponse(data, {
            headers: {
              "Content-Type": getAvatarContentType(fileName),
              "Cache-Control": "public, max-age=86400, must-revalidate",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          // Continue checking remaining legacy directories.
        }
      }
    }
  }

  const avatarFilePath = await findAvatarFile(safeUsername);
  if (!avatarFilePath) {
    return privateError("头像不存在。", 404);
  }

  const fileName = path.basename(avatarFilePath);
  try {
    const data = await readFile(avatarFilePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": getAvatarContentType(fileName),
        "Cache-Control": "public, max-age=86400, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return privateError("头像读取失败。", 500);
  }
}
