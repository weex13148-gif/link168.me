import path from "path";
import crypto from "crypto";

const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i;

const FORBIDDEN_EXTENSIONS = new Set([
  ".svg", ".html", ".htm", ".js", ".mjs", ".cjs", ".ts", ".tsx",
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".sh", ".ps1",
  ".php", ".asp", ".aspx", ".jsp", ".py", ".rb", ".pl", ".cgi",
  ".vbs", ".wsf", ".wsh", ".hta", ".jar", ".class",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const AVATAR_FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i;
const LINK_ICON_FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i;

function projectRootFromCwd() {
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  const marker = `${path.sep}.next${path.sep}standalone`;
  const markerIndex = cwd.lastIndexOf(marker);
  return markerIndex >= 0 ? cwd.slice(0, markerIndex) : cwd;
}

export function getUploadRoot() {
  const configured = process.env.LINK168_UPLOAD_ROOT?.trim() || process.env.UPLOAD_ROOT?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(projectRootFromCwd(), configured);
  }
  return path.join(projectRootFromCwd(), "storage", "uploads");
}

export function getAvatarUploadDir() {
  return path.join(getUploadRoot(), "avatars");
}

export function getLinkIconUploadDir() {
  return path.join(getUploadRoot(), "links", "icons");
}

export type MediaType =
  | "avatar"
  | "background"
  | "cover"
  | "carousel"
  | "popup"
  | "product_cover"
  | "service_cover"
  | "enterprise_logo"
  | "enterprise_public_image"
  | "custom_link_icon";

export function getMediaUploadDir(mediaType: "cover" | "popup" | "carousel" | "background") {
  return path.join(getUploadRoot(), "media", mediaType);
}

export function getUploadDirForMediaType(mediaType: MediaType): string {
  switch (mediaType) {
    case "avatar":
      return getAvatarUploadDir();
    case "custom_link_icon":
      return getLinkIconUploadDir();
    case "cover":
    case "popup":
    case "carousel":
    case "background":
      return getMediaUploadDir(mediaType);
    case "product_cover":
      return path.join(getUploadRoot(), "media", "product_cover");
    case "service_cover":
      return path.join(getUploadRoot(), "media", "service_cover");
    case "enterprise_logo":
      return path.join(getUploadRoot(), "media", "enterprise_logo");
    case "enterprise_public_image":
      return path.join(getUploadRoot(), "media", "enterprise_public_image");
    default:
      return path.join(getUploadRoot(), "media", mediaType);
  }
}

export function isSafeAvatarFileName(fileName: string) {
  return AVATAR_FILE_PATTERN.test(fileName) && path.basename(fileName) === fileName;
}

export function isSafeLinkIconFileName(fileName: string) {
  return LINK_ICON_FILE_PATTERN.test(fileName) && path.basename(fileName) === fileName;
}

export function isSafeMediaFileName(fileName: string) {
  return SAFE_FILENAME_PATTERN.test(fileName) && path.basename(fileName) === fileName;
}

export function getAvatarContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "application/octet-stream";
}

export function getLinkIconContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

export function getLegacyAvatarDirs() {
  const root = projectRootFromCwd();
  return [
    path.join(root, "public", "uploads", "avatars"),
    path.join(root, ".next", "standalone", "public", "uploads", "avatars"),
  ];
}

export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 3) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return "image/png";
  }

  if (buffer.length >= 3 &&
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }

  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return "image/webp";
  }

  return null;
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function getExtensionForMime(mimeType: string): string | null {
  return MIME_TO_EXTENSION[mimeType.toLowerCase()] || null;
}

export function getMimeForExtension(ext: string): string | null {
  return EXTENSION_TO_MIME[ext.toLowerCase()] || null;
}

export function hasForbiddenExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return FORBIDDEN_EXTENSIONS.has(ext);
}

export function hasForbiddenMimeType(mimeType: string): boolean {
  const lower = mimeType.toLowerCase();
  if (lower.includes("svg")) return true;
  if (lower.includes("html")) return true;
  if (lower.includes("javascript") || lower.includes("ecmascript")) return true;
  if (lower.includes("application/") && (lower.includes("exe") || lower.includes("msi") || lower.includes("bat") || lower.includes("sh"))) return true;
  return false;
}

export function getDateSubdirectory(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return path.join(year, month, day);
}

export function generateSafeFileName(mimeType: string): string {
  const ext = getExtensionForMime(mimeType);
  if (!ext) {
    throw new Error("Unsupported MIME type");
  }
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return `${uuid}${ext}`;
}

export function validateUploadPath(baseDir: string, fileName: string): { valid: boolean; fullPath: string; reason?: string } {
  const safeFileName = path.basename(fileName);

  if (safeFileName !== fileName) {
    return { valid: false, fullPath: "", reason: "文件名包含路径分隔符" };
  }

  if (!SAFE_FILENAME_PATTERN.test(safeFileName)) {
    return { valid: false, fullPath: "", reason: "文件名格式不安全" };
  }

  const resolvedBase = path.resolve(baseDir);
  const fullPath = path.resolve(path.join(resolvedBase, safeFileName));

  if (!fullPath.startsWith(resolvedBase)) {
    return { valid: false, fullPath: "", reason: "路径穿越检测" };
  }

  return { valid: true, fullPath };
}

export function validateUploadPathWithDate(baseDir: string, fileName: string): { valid: boolean; fullPath: string; reason?: string } {
  const dateSubdir = getDateSubdirectory();
  const targetDir = path.join(baseDir, dateSubdir);
  return validateUploadPath(targetDir, fileName);
}

export function getPublicUrlForMedia(mediaType: "cover" | "popup" | "carousel" | "background", relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `/api/dashboard/media/${mediaType}/${normalized}`;
}

export function getPublicUrlForLinkIcon(fileName: string): string {
  return `/api/dashboard/links/icon/${fileName}`;
}

export function getPublicUrlForMediaType(mediaType: MediaType, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  switch (mediaType) {
    case "avatar":
      return `/api/avatar/${normalized}`;
    case "custom_link_icon":
      return `/api/dashboard/links/icon/${normalized}`;
    default:
      return `/api/dashboard/media/${mediaType}/${normalized}`;
  }
}

export function isTrustedImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  if (url.startsWith("/api/dashboard/")) {
    if (url.startsWith("/api/dashboard/links/icon/")) return true;
    if (url.startsWith("/api/dashboard/media/")) return true;
    if (url.startsWith("/api/avatar/")) return true;
  }

  if (url.startsWith("/api/avatar/")) return true;

  return false;
}

export function isValidMediaType(type: string): type is MediaType {
  const validTypes: MediaType[] = [
    "avatar",
    "background",
    "cover",
    "carousel",
    "popup",
    "product_cover",
    "service_cover",
    "enterprise_logo",
    "enterprise_public_image",
    "custom_link_icon",
  ];
  return validTypes.includes(type as MediaType);
}

export type MediaUploadConfig = {
  maxSize: number;
  allowedMimeTypes: string[];
  mediaDir: string;
  formField: string;
};

export const UPLOAD_CONFIGS: Record<MediaType, {
  maxSize: number;
  allowedMimeTypes: string[];
  formField: string;
}> = {
  avatar: {
    maxSize: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "avatar",
  },
  background: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  cover: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  carousel: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  popup: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  product_cover: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  service_cover: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  enterprise_logo: {
    maxSize: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    formField: "image",
  },
  enterprise_public_image: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    formField: "image",
  },
  custom_link_icon: {
    maxSize: 500 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    formField: "icon",
  },
};

/**
 * 统一生成 ContentModerationRecord 的 contentRef。
 * 格式：{mediaType}/{relativePath}
 * 所有上传和读取路由必须使用此函数，禁止自行拼字符串。
 */
export function buildContentRef(mediaType: string, relativePath: string): string {
  const cleanType = mediaType.replace(/[^a-z0-9_-]/gi, "");
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return `${cleanType}/${cleanPath}`;
}
