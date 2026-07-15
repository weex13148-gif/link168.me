import { readdir, rm, stat } from "fs/promises";
import path from "path";

const AVATAR_API_PREFIX = "/api/avatar/";
const LEGACY_UPLOAD_PREFIX = "/uploads/";
const MAX_AVATAR_SCAN_DEPTH = 4;

type CleanupLogger = (message: string, details: Record<string, string>) => void;

export type DeletePreviousAvatarOptions = {
  previousAvatarUrl: string | null | undefined;
  profileId: string;
  username: string | null | undefined;
  currentFilePath: string;
  currentFileName: string;
  avatarUploadDir: string;
  legacyAvatarDirs: string[];
  isSafeAvatarFileName: (fileName: string) => boolean;
  logger?: CleanupLogger;
};

type AvatarCandidate = {
  fullPath: string;
  fileName: string;
};

export type AvatarCleanupResult = {
  status: "deleted" | "not_found" | "not_owned" | "failed";
  deletedCount: number;
  failedCount: number;
};

type AvatarFileDeleteStatus = AvatarCleanupResult["status"];

export async function deletePreviousAvatar(options: DeletePreviousAvatarOptions): Promise<AvatarCleanupResult> {
  const previousPath = normalizePreviousAvatarPath(options.previousAvatarUrl);
  if (!previousPath) return summarizeCleanup(["not_owned"]);

  try {
    if (previousPath.startsWith(AVATAR_API_PREFIX)) {
      return summarizeCleanup(await deleteOwnedAvatarsForApiUrl(options, previousPath));
    }

    if (previousPath.startsWith(LEGACY_UPLOAD_PREFIX)) {
      return summarizeCleanup(await deleteExplicitLegacyAvatar(options, previousPath));
    }
  } catch {
    logCleanupIssue(options, "unexpected_cleanup_error");
    return summarizeCleanup(["failed"]);
  }

  return summarizeCleanup(["not_owned"]);
}

function normalizePreviousAvatarPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\")) return null;

  const decoded = safeDecodeURIComponent(trimmed);
  if (decoded.includes("..")) return null;

  const [pathOnly] = trimmed.split(/[?#]/);
  if (!pathOnly.startsWith("/")) return null;
  if (!pathOnly.startsWith(AVATAR_API_PREFIX) && !pathOnly.startsWith(LEGACY_UPLOAD_PREFIX)) return null;

  return pathOnly;
}

async function deleteOwnedAvatarsForApiUrl(
  options: DeletePreviousAvatarOptions,
  previousPath: string,
): Promise<AvatarFileDeleteStatus[]> {
  const previousUsername = sanitizeOwnerPart(previousPath.slice(AVATAR_API_PREFIX.length));
  const currentUsername = sanitizeOwnerPart(options.username || "");
  if (!previousUsername || previousUsername !== currentUsername) return ["not_owned"];

  const candidates = await findOwnedAvatarCandidates(options);
  if (!candidates.length) return ["not_found"];
  const results: AvatarFileDeleteStatus[] = [];
  for (const candidate of candidates) {
    results.push(await removeAvatarFile(options, candidate.fullPath, candidate.fileName, path.resolve(options.avatarUploadDir)));
  }
  return results;
}

async function deleteExplicitLegacyAvatar(
  options: DeletePreviousAvatarOptions,
  previousPath: string,
): Promise<AvatarFileDeleteStatus[]> {
  const fileName = path.basename(previousPath);
  if (!isOwnedAvatarFileName(options, fileName)) return ["not_owned"];

  const results: AvatarFileDeleteStatus[] = [];
  for (const legacyDir of options.legacyAvatarDirs) {
    const targetPath = resolveFileInsideDirectory(legacyDir, fileName);
    if (!targetPath) continue;
    results.push(await removeAvatarFile(options, targetPath, fileName, path.resolve(legacyDir)));
  }
  return results.length ? results : ["not_found"];
}

async function findOwnedAvatarCandidates(options: DeletePreviousAvatarOptions): Promise<AvatarCandidate[]> {
  const root = path.resolve(options.avatarUploadDir);
  const candidates: AvatarCandidate[] = [];

  async function walkDirectory(directory: string, depth: number): Promise<void> {
    if (depth > MAX_AVATAR_SCAN_DEPTH) return;

    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.resolve(directory, entry.name);
      if (!isInsideDirectory(root, fullPath)) continue;

      if (entry.isDirectory()) {
        await walkDirectory(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!isOwnedAvatarFileName(options, entry.name)) continue;
      if (isCurrentAvatar(options, fullPath, entry.name)) continue;

      candidates.push({ fullPath, fileName: entry.name });
    }
  }

  await walkDirectory(root, 0);
  return candidates;
}

async function removeAvatarFile(
  options: DeletePreviousAvatarOptions,
  targetPath: string,
  fileName: string,
  allowedRoot: string,
): Promise<AvatarFileDeleteStatus> {
  const resolvedTarget = path.resolve(targetPath);
  if (!isInsideDirectory(allowedRoot, resolvedTarget)) return "not_owned";
  if (!isOwnedAvatarFileName(options, fileName)) return "not_owned";
  if (isCurrentAvatar(options, resolvedTarget, fileName)) return "not_owned";

  try {
    const fileStat = await stat(resolvedTarget).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!fileStat || !fileStat.isFile()) return "not_found";

    await rm(resolvedTarget, { force: true });
    return "deleted";
  } catch {
    logCleanupIssue(options, "delete_failed", fileName);
    return "failed";
  }
}

function summarizeCleanup(statuses: AvatarFileDeleteStatus[]): AvatarCleanupResult {
  const deletedCount = statuses.filter((status) => status === "deleted").length;
  const failedCount = statuses.filter((status) => status === "failed").length;
  if (failedCount) return { status: "failed", deletedCount, failedCount };
  if (deletedCount) return { status: "deleted", deletedCount, failedCount: 0 };
  if (statuses.some((status) => status === "not_found")) {
    return { status: "not_found", deletedCount: 0, failedCount: 0 };
  }
  return { status: "not_owned", deletedCount: 0, failedCount: 0 };
}

function resolveFileInsideDirectory(directory: string, fileName: string): string | null {
  const safeFileName = path.basename(fileName);
  if (safeFileName !== fileName) return null;

  const root = path.resolve(directory);
  const targetPath = path.resolve(root, safeFileName);
  if (!isInsideDirectory(root, targetPath)) return null;

  return targetPath;
}

function isOwnedAvatarFileName(options: DeletePreviousAvatarOptions, fileName: string): boolean {
  if (!options.isSafeAvatarFileName(fileName)) return false;

  const safeUsername = sanitizeOwnerPart(options.username || "");
  const safeProfileId = sanitizeOwnerPart(options.profileId);
  const lowerFileName = fileName.toLowerCase();

  if (safeUsername && lowerFileName.startsWith(`${safeUsername.toLowerCase()}-`)) return true;
  if (safeProfileId && lowerFileName.startsWith(`${safeProfileId.toLowerCase()}-`)) return true;
  if (safeProfileId && lowerFileName.includes(`-${safeProfileId.toLowerCase()}-`)) return true;

  return false;
}

function isCurrentAvatar(options: DeletePreviousAvatarOptions, targetPath: string, fileName: string): boolean {
  if (fileName === options.currentFileName) return true;
  return Boolean(options.currentFilePath) && path.resolve(options.currentFilePath) === path.resolve(targetPath);
}

function isInsideDirectory(root: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(targetPath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function sanitizeOwnerPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function logCleanupIssue(options: DeletePreviousAvatarOptions, reason: string, fileName?: string): void {
  const logger = options.logger || ((message, details) => console.warn(message, details));
  const details: Record<string, string> = {
    reason,
    profile: maskIdentifier(options.profileId),
  };

  if (fileName) {
    details.file = sanitizeLogFileName(fileName);
  }

  logger("[dashboard:avatar] previous avatar cleanup skipped", details);
}

function maskIdentifier(value: string): string {
  const safe = sanitizeOwnerPart(value);
  if (!safe) return "unknown";
  return `${safe.slice(0, 8)}...`;
}

function sanitizeLogFileName(value: string): string {
  return path.basename(value).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 96);
}
