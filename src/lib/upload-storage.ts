import path from "path";

const AVATAR_FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i;

function projectRootFromCwd() {
  const cwd = process.cwd();
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

export function isSafeAvatarFileName(fileName: string) {
  return AVATAR_FILE_PATTERN.test(fileName) && path.basename(fileName) === fileName;
}

export function getAvatarContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "application/octet-stream";
}

export function getLegacyAvatarDirs() {
  const root = projectRootFromCwd();
  return [
    path.join(root, "public", "uploads", "avatars"),
    path.join(root, ".next", "standalone", "public", "uploads", "avatars"),
  ];
}
