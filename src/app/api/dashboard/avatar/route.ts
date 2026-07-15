import crypto from "crypto";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, toProfileDto } from "@/lib/dashboard-data";
import { moderateImageContent } from "@/lib/content-safety";
import { deletePreviousAvatar } from "./cleanup";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import {
  getAvatarUploadDir,
  getLegacyAvatarDirs,
  isSafeAvatarFileName,
  detectMimeTypeFromBuffer,
  hasForbiddenExtension,
  hasForbiddenMimeType,
  isAllowedMimeType,
  getExtensionForMime,
  validateUploadPathWithDate,
  getDateSubdirectory,
  UPLOAD_CONFIGS,
} from "@/lib/upload-storage";

export const runtime = "nodejs";

const AVATAR_API_PREFIX = "/api/avatar/";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ success: false, error: "上传内容格式不正确。" }, { status: 400 }); }

  const file = formData.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "请选择头像图片。" }, { status: 400 });

  const config = UPLOAD_CONFIGS.avatar;

  if (!file.size || file.size > config.maxSize) {
    return NextResponse.json({ success: false, error: `头像图片不能超过 ${config.maxSize / 1024 / 1024}MB。` }, { status: 400 });
  }

  const declaredType = (file.type || "").toLowerCase();
  const originalName = file.name || "";

  if (hasForbiddenExtension(originalName)) {
    return NextResponse.json({ success: false, error: "不支持该文件格式，仅支持 jpg、png、webp 或 gif。" }, { status: 400 });
  }

  if (hasForbiddenMimeType(declaredType)) {
    return NextResponse.json({ success: false, error: "不支持该文件格式，仅支持 jpg、png、webp 或 gif。" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedMime = detectMimeTypeFromBuffer(buffer);
  if (!detectedMime || !isAllowedMimeType(detectedMime)) {
    return NextResponse.json({ success: false, error: "头像仅支持 jpg、png、webp 或 gif。" }, { status: 400 });
  }

  if (declaredType && !declaredType.includes(detectedMime.split("/")[1]) && detectedMime !== declaredType) {
    const declaredExt = path.extname(originalName).toLowerCase();
    const expectedExt = detectedMime === "image/jpeg" ? ".jpg" : detectedMime === "image/png" ? ".png" : detectedMime === "image/gif" ? ".gif" : ".webp";
    if (declaredExt && declaredExt !== expectedExt && !(expectedExt === ".jpg" && declaredExt === ".jpeg")) {
      return NextResponse.json({ success: false, error: "文件扩展名与实际内容类型不一致。" }, { status: 400 });
    }
  }

  let moderationStatus = "pending_manual_review";
  try {
    const moderated = await moderateImageContent({
      size: file.size,
      mimeType: detectedMime,
      fileName: originalName,
    });
    if (moderated.status === "rejected") {
      return NextResponse.json({ success: false, error: "该图片未能通过内容安全审核，请更换其他图片。" }, { status: 400 });
    }
    moderationStatus = moderated.status;
  } catch (err) {
    console.error("[dashboard:avatar] image moderation failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    moderationStatus = "pending_manual_review";
  }

  const username = profile.username || `user-${user.id}`;
  const safeNamePart = username.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "avatar";
  const safeProfilePart = profile.id.replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "profile";
  const uuidPart = crypto.randomUUID().replace(/-/g, "");
  const ext = getExtensionForMime(detectedMime) || ".jpg";
  const fileName = `${safeNamePart}-${safeProfilePart}-${uuidPart}${ext}`;

  const uploadBaseDir = getAvatarUploadDir();
  const dateSubdir = getDateSubdirectory();
  const uploadDir = path.join(uploadBaseDir, dateSubdir);

  const pathValidation = validateUploadPathWithDate(uploadBaseDir, fileName);
  if (!pathValidation.valid) {
    return NextResponse.json({ success: false, error: "文件名不安全。" }, { status: 400 });
  }

  await mkdir(uploadDir, { recursive: true });

  let createdFile: string | null = null;
  const previousAvatarUrl = profile.avatarUrl;
  try {
    createdFile = pathValidation.fullPath;
    await writeFile(createdFile, buffer);

    const avatarUrl = `${AVATAR_API_PREFIX}${username}`;

    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: {
        avatarUrl,
        avatarModerationStatus: moderationStatus,
      },
    });

    const mediaCleanup = await deletePreviousAvatar({
      previousAvatarUrl,
      profileId: profile.id,
      username,
      currentFilePath: createdFile,
      currentFileName: fileName,
      avatarUploadDir: uploadBaseDir,
      legacyAvatarDirs: getLegacyAvatarDirs(),
      isSafeAvatarFileName,
    });

    await revalidatePublicProfileByUser(user.id);

    const versionedAvatarUrl = `${avatarUrl}?v=${updatedProfile.updatedAt.getTime()}`;
    return NextResponse.json(
      {
        success: true,
        profile: { ...toProfileDto(updatedProfile), avatar_url: versionedAvatarUrl },
        avatarUrl: versionedAvatarUrl,
        moderationStatus,
        mediaCleanup,
        mediaCleanupOk: mediaCleanup.status !== "failed",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (createdFile) await rm(createdFile, { force: true }).catch(() => undefined);
    console.error("[dashboard:avatar] upload failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    return NextResponse.json({ success: false, error: "头像上传失败，请稍后重试。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });
  }

  const updatedProfile = await db.profile.update({
    where: { id: profile.id },
    data: {
      avatarUrl: null,
      avatarModerationStatus: "pending",
    },
  });
  const mediaCleanup = await deletePreviousAvatar({
    previousAvatarUrl: profile.avatarUrl,
    profileId: profile.id,
    username: profile.username,
    currentFilePath: "",
    currentFileName: "",
    avatarUploadDir: getAvatarUploadDir(),
    legacyAvatarDirs: getLegacyAvatarDirs(),
    isSafeAvatarFileName,
  });

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({
    success: true,
    profile: toProfileDto(updatedProfile),
    avatarUrl: null,
    mediaCleanup,
    mediaCleanupOk: mediaCleanup.status !== "failed",
    message: mediaCleanup.status === "failed"
      ? "头像引用已清除，但旧文件删除失败，请稍后重试或联系管理员。"
      : "头像已删除。",
  });
}
