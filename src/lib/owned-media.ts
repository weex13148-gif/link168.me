import { rm } from "fs/promises";
import path from "path";
import {
  getLinkIconUploadDir,
  getMediaUploadDir,
  isSafeLinkIconFileName,
  isSafeMediaFileName,
} from "@/lib/upload-storage";

type ManagedMediaKind = "cover" | "popup" | "carousel" | "background" | "link-icon";

export type OwnedMediaObject = {
  kind: ManagedMediaKind;
  ownerId: string;
  relativePath: string;
  fullPath: string;
  url: string;
};

export type OwnedMediaDeleteResult = {
  url: string;
  status: "deleted" | "not_found" | "not_owned" | "shared" | "failed";
  reason?: "reference_check_failed" | "storage_delete_failed";
};

type DeleteOwnedMediaOptions = {
  url: string;
  ownerId: string;
  isStillReferenced: (url: string) => Promise<boolean>;
  removeFile?: (filePath: string) => Promise<void>;
};

const MEDIA_TYPES = new Set(["cover", "popup", "carousel", "background"]);
const DATE_SEGMENT = /^\d{4}$|^\d{2}$/;
const MANAGED_URL_PATTERN = /\/api\/dashboard\/(?:media\/(?:cover|popup|carousel|background)|links\/icon)\/[^"'\\\s?#]+/g;

function normalizeManagedUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  try {
    const parsed = new URL(trimmed, "http://link168.local");
    return parsed.pathname;
  } catch {
    return null;
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function validOwnedPathSegments(segments: string[], ownerId: string): boolean {
  if (segments.length !== 5 || segments[0] !== ownerId) return false;
  if (!DATE_SEGMENT.test(segments[1]) || segments[1].length !== 4) return false;
  return DATE_SEGMENT.test(segments[2])
    && segments[2].length === 2
    && DATE_SEGMENT.test(segments[3])
    && segments[3].length === 2;
}

export function resolveOwnedMediaObject(url: string, ownerId: string): OwnedMediaObject | null {
  const normalizedUrl = normalizeManagedUrl(url);
  const normalizedOwnerId = ownerId.trim().toLowerCase();
  if (!normalizedUrl || !normalizedOwnerId) return null;

  let kind: ManagedMediaKind;
  let root: string;
  let relativePath: string;

  const mediaMatch = normalizedUrl.match(/^\/api\/dashboard\/media\/([^/]+)\/(.+)$/);
  if (mediaMatch && MEDIA_TYPES.has(mediaMatch[1])) {
    kind = mediaMatch[1] as Exclude<ManagedMediaKind, "link-icon">;
    root = getMediaUploadDir(kind);
    relativePath = mediaMatch[2];
  } else {
    const iconMatch = normalizedUrl.match(/^\/api\/dashboard\/links\/icon\/(.+)$/);
    if (!iconMatch) return null;
    kind = "link-icon";
    root = getLinkIconUploadDir();
    relativePath = iconMatch[1];
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (!validOwnedPathSegments(segments, normalizedOwnerId)) return null;

  const fileName = segments[segments.length - 1];
  const safeFile = kind === "link-icon"
    ? isSafeLinkIconFileName(fileName)
    : isSafeMediaFileName(fileName);
  if (!safeFile) return null;

  const fullPath = path.resolve(root, ...segments);
  if (!isInside(root, fullPath)) return null;

  return {
    kind,
    ownerId: normalizedOwnerId,
    relativePath: segments.join("/"),
    fullPath,
    url: normalizedUrl,
  };
}

export function collectManagedMediaUrls(...values: unknown[]): Set<string> {
  const urls = new Set<string>();

  function collect(value: unknown): void {
    if (typeof value === "string") {
      const matches = value.match(MANAGED_URL_PATTERN) || [];
      for (const match of matches) {
        const normalized = normalizeManagedUrl(match);
        if (normalized) urls.add(normalized);
      }
      if ((value.startsWith("{") || value.startsWith("[")) && value.length <= 100_000) {
        try {
          collect(JSON.parse(value));
        } catch {
          // A non-JSON string may still contain a managed URL found above.
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(collect);
    }
  }

  values.forEach(collect);
  return urls;
}

export async function deleteOwnedMediaObject(
  options: DeleteOwnedMediaOptions,
): Promise<OwnedMediaDeleteResult> {
  const object = resolveOwnedMediaObject(options.url, options.ownerId);
  if (!object) return { url: options.url, status: "not_owned" };

  try {
    if (await options.isStillReferenced(object.url)) {
      return { url: object.url, status: "shared" };
    }
  } catch {
    return { url: object.url, status: "failed", reason: "reference_check_failed" };
  }

  try {
    const removeFile = options.removeFile || (async (filePath: string) => rm(filePath));
    await removeFile(object.fullPath);
    return { url: object.url, status: "deleted" };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { url: object.url, status: "not_found" };
    }
    return { url: object.url, status: "failed", reason: "storage_delete_failed" };
  }
}
