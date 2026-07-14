import { mkdir, writeFile, rm, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { moderateImageContent } from "@/lib/content-safety";
import {
  MediaType,
  getUploadDirForMediaType,
  getPublicUrlForMediaType,
  detectMimeTypeFromBuffer,
  hasForbiddenExtension,
  hasForbiddenMimeType,
  isAllowedMimeType,
  generateSafeFileName,
  validateUploadPathWithDate,
  getDateSubdirectory,
  buildContentRef,
  UPLOAD_CONFIGS,
} from "@/lib/upload-storage";
import type { CurrentUser } from "@/lib/auth";

export type MediaOperationResult =
  | { success: true; mediaId: string; url: string; width?: number; height?: number; mimeType: string; sizeBytes: number }
  | { success: false; code: "NOT_CONFIGURED" | "UNAUTHORIZED" | "INVALID_TYPE" | "FILE_TOO_LARGE" | "INVALID_DIMENSIONS" | "UPLOAD_FAILED" | "DELETE_FAILED" | "RESOURCE_IN_USE"; message: string };

export type MediaUploadResult = MediaOperationResult;
export type MediaReplaceResult = MediaOperationResult;
export type MediaDeleteResult =
  | { success: true }
  | { success: false; code: "UNAUTHORIZED" | "RESOURCE_NOT_FOUND" | "DELETE_FAILED" | "RESOURCE_IN_USE"; message: string };

export type MediaUploadInput = {
  file: File;
  mediaType: MediaType;
  userId: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

export type MediaReplaceInput = {
  file: File;
  mediaType: MediaType;
  userId: string;
  workspaceId?: string;
  existingUrl?: string;
};

export type MediaDeleteInput = {
  mediaType: MediaType;
  relativePath: string;
  userId: string;
  workspaceId?: string;
};

const PUBLIC_MEDIA_TYPES = new Set<MediaType>(["avatar", "cover", "background", "carousel", "product_cover", "service_cover", "enterprise_logo", "enterprise_public_image"]);

function isPublicMediaType(mediaType: MediaType): boolean {
  return PUBLIC_MEDIA_TYPES.has(mediaType);
}

function isEnterpriseMediaType(mediaType: MediaType): boolean {
  return mediaType === "enterprise_logo" || mediaType === "enterprise_public_image";
}

async function verifyUserOwnsWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });
  return !!member;
}

async function verifyWorkspaceExists(workspaceId: string): Promise<boolean> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  return !!workspace;
}

async function countMediaReferences(mediaType: MediaType, contentRef: string): Promise<number> {
  const contentRefPattern = contentRef.replace(/\//g, "\\/");
  const contentRefRegex = new RegExp(contentRefPattern);

  let count = 0;

  const [profileWithCover, profileWithBackground, products, links] = await Promise.all([
    db.profile.count({ where: { coverImageUrl: { contains: contentRef } } }),
    db.profile.count({ where: { avatarUrl: { contains: contentRef } } }),
    db.product.count({ where: { coverImageUrl: { contains: contentRef } } }),
    db.link.count({ where: { iconUrl: { contains: contentRef } } }),
  ]);

  count += profileWithCover + profileWithBackground + products + links;

  return count;
}

export async function uploadMedia(input: MediaUploadInput): Promise<MediaUploadResult> {
  const { file, mediaType, userId, workspaceId } = input;

  if (isEnterpriseMediaType(mediaType) && (!workspaceId || !(await verifyUserOwnsWorkspace(userId, workspaceId)))) {
    return { success: false, code: "UNAUTHORIZED", message: "无权限上传企业媒体" };
  }

  if (isEnterpriseMediaType(mediaType) && !(await verifyWorkspaceExists(workspaceId!))) {
    return { success: false, code: "UNAUTHORIZED", message: "工作空间不存在" };
  }

  const config = UPLOAD_CONFIGS[mediaType];
  if (!config) {
    return { success: false, code: "INVALID_TYPE", message: "不支持的媒体类型" };
  }

  if (!file.size || file.size > config.maxSize) {
    return { success: false, code: "FILE_TOO_LARGE", message: `图片不能超过 ${config.maxSize / 1024 / 1024}MB` };
  }

  const declaredType = (file.type || "").toLowerCase();
  const originalName = file.name || "";

  if (hasForbiddenExtension(originalName)) {
    return { success: false, code: "INVALID_TYPE", message: "不支持该文件格式，仅支持 jpg、png、webp 或 gif" };
  }

  if (hasForbiddenMimeType(declaredType)) {
    return { success: false, code: "INVALID_TYPE", message: "不支持该文件格式，仅支持 jpg、png、webp 或 gif" };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedMime = detectMimeTypeFromBuffer(buffer);
  if (!detectedMime || !isAllowedMimeType(detectedMime)) {
    return { success: false, code: "INVALID_TYPE", message: "仅支持 jpg、png、webp 或 gif 格式" };
  }

  if (declaredType && detectedMime !== declaredType && !declaredType.includes(detectedMime.split("/")[1])) {
    const declaredExt = path.extname(originalName).toLowerCase();
    const expectedExt = detectedMime === "image/jpeg" ? ".jpg" : detectedMime === "image/png" ? ".png" : detectedMime === "image/gif" ? ".gif" : ".webp";
    if (declaredExt && declaredExt !== expectedExt && !(expectedExt === ".jpg" && declaredExt === ".jpeg")) {
      return { success: false, code: "INVALID_TYPE", message: "文件扩展名与实际内容类型不一致" };
    }
  }

  let moderationStatus = "pending_manual_review";
  let provider = "local";
  try {
    const moderated = await moderateImageContent({
      size: file.size,
      mimeType: detectedMime,
      fileName: originalName,
    });
    if (moderated.status === "rejected") {
      return { success: false, code: "INVALID_TYPE", message: "该图片未能通过内容安全审核，请更换其他图片" };
    }
    moderationStatus = moderated.status;
    provider = moderated.provider;
  } catch {
    moderationStatus = "pending_manual_review";
  }

  const fileName = generateSafeFileName(detectedMime);
  const uploadBaseDir = getUploadDirForMediaType(mediaType);
  const dateSubdir = getDateSubdirectory();
  const uploadDir = path.join(uploadBaseDir, dateSubdir);

  const pathValidation = validateUploadPathWithDate(uploadBaseDir, fileName);
  if (!pathValidation.valid) {
    return { success: false, code: "INVALID_TYPE", message: "文件名不安全" };
  }

  await mkdir(uploadDir, { recursive: true });

  let createdFile: string | null = null;
  try {
    createdFile = pathValidation.fullPath;
    await writeFile(createdFile, buffer);

    const relativePath = path.join(dateSubdir, fileName).replace(/\\/g, "/");
    const imageUrl = getPublicUrlForMediaType(mediaType, relativePath);
    const mediaId = crypto.randomUUID();

    const contentRef = buildContentRef(mediaType, relativePath);
    await db.contentModerationRecord.upsert({
      where: { contentType_contentRef: { contentType: mediaType, contentRef } },
      update: { status: moderationStatus, provider },
      create: {
        id: crypto.randomUUID(),
        contentType: mediaType,
        contentRef,
        status: moderationStatus,
        provider,
      },
    });

    return {
      success: true,
      mediaId,
      url: imageUrl,
      mimeType: detectedMime,
      sizeBytes: file.size,
    };
  } catch (err) {
    if (createdFile) {
      await rm(createdFile, { force: true }).catch(() => undefined);
    }
    return { success: false, code: "UPLOAD_FAILED", message: "上传失败，请稍后重试" };
  }
}

export async function replaceMedia(input: MediaReplaceInput): Promise<MediaReplaceResult> {
  const { file, mediaType, userId, workspaceId, existingUrl } = input;

  const uploadResult = await uploadMedia({ file, mediaType, userId, workspaceId });
  if (!uploadResult.success) {
    return uploadResult;
  }

  if (existingUrl) {
    try {
      await cleanupOldMedia(mediaType, existingUrl);
    } catch {
    }
  }

  return uploadResult;
}

async function cleanupOldMedia(mediaType: MediaType, existingUrl: string): Promise<void> {
  try {
    const uploadBaseDir = getUploadDirForMediaType(mediaType);
    let relativePath: string;

    if (mediaType === "avatar") {
      const avatarMatch = existingUrl.match(/\/api\/avatar\/([^?]+)/);
      if (!avatarMatch) return;
      const usernamePart = avatarMatch[1];
      const dateSubdir = getDateSubdirectory();
      relativePath = path.join(dateSubdir, usernamePart).replace(/\\/g, "/");
    } else if (mediaType === "custom_link_icon") {
      const iconMatch = existingUrl.match(/\/api\/dashboard\/links\/icon\/([^?]+)/);
      if (!iconMatch) return;
      relativePath = iconMatch[1];
    } else {
      const mediaMatch = existingUrl.match(new RegExp(`/api/dashboard/media/${mediaType}/([^?]+)`));
      if (!mediaMatch) return;
      relativePath = mediaMatch[1];
    }

    const filePath = path.join(uploadBaseDir, relativePath);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadBaseDir);

    if (!resolvedPath.startsWith(resolvedDir)) return;

    const fileStat = await stat(resolvedPath).catch(() => null);
    if (fileStat?.isFile()) {
      await rm(resolvedPath, { force: true });
    }
  } catch {
  }
}

export async function deleteMedia(input: MediaDeleteInput): Promise<MediaDeleteResult> {
  const { mediaType, relativePath, userId, workspaceId } = input;

  if (isEnterpriseMediaType(mediaType) && (!workspaceId || !(await verifyUserOwnsWorkspace(userId, workspaceId)))) {
    return { success: false, code: "UNAUTHORIZED", message: "无权限删除企业媒体" };
  }

  const contentRef = buildContentRef(mediaType, relativePath);
  const referenceCount = await countMediaReferences(mediaType, contentRef);

  if (referenceCount > 0) {
    return { success: false, code: "RESOURCE_IN_USE", message: "该媒体仍被其他资源引用，无法删除" };
  }

  const uploadBaseDir = getUploadDirForMediaType(mediaType);
  const filePath = path.join(uploadBaseDir, relativePath);
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(uploadBaseDir);

  if (!resolvedPath.startsWith(resolvedDir)) {
    return { success: false, code: "UNAUTHORIZED", message: "无效的文件路径" };
  }

  try {
    const fileStat = await stat(resolvedPath).catch(() => null);
    if (!fileStat?.isFile()) {
      return { success: false, code: "RESOURCE_NOT_FOUND", message: "文件不存在" };
    }

    await rm(resolvedPath, { force: true });

    await db.contentModerationRecord.deleteMany({
      where: { contentType: mediaType, contentRef },
    });

    return { success: true };
  } catch {
    return { success: false, code: "DELETE_FAILED", message: "删除失败，请稍后重试" };
  }
}

export async function checkMediaAccess(mediaType: MediaType, relativePath: string, viewerUserId?: string, workspaceId?: string): Promise<boolean> {
  if (isPublicMediaType(mediaType)) {
    return true;
  }

  if (!viewerUserId) {
    return false;
  }

  if (isEnterpriseMediaType(mediaType) && workspaceId) {
    return verifyUserOwnsWorkspace(viewerUserId, workspaceId);
  }

  return true;
}