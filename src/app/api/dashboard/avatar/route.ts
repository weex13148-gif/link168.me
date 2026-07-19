import path from "node:path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getOwnedProfile, toProfileDto } from "@/lib/dashboard-data";
import { moderateImageContent } from "@/lib/content-safety";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import {
  detectMimeTypeFromBuffer,
  getUploadRoot,
  hasForbiddenExtension,
  hasForbiddenMimeType,
  isAllowedMimeType,
  UPLOAD_CONFIGS,
} from "@/lib/upload-storage";
import { createLocalMediaStorage } from "@/infrastructure/media/local-media-storage";
import {
  deleteProfileAvatar,
  replaceProfileAvatar,
} from "@/infrastructure/media/avatar-pipeline";

export const runtime = "nodejs";

const AVATAR_API_PREFIX = "/api/avatar/";

function invalidUpload(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export async function POST(request: Request) {
  const { user, capabilities, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return invalidUpload("请先保存主页资料。");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidUpload("上传内容格式不正确。");
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) return invalidUpload("请选择头像图片。");

  const config = UPLOAD_CONFIGS.avatar;
  if (!file.size || file.size > config.maxSize) {
    return invalidUpload(`压缩后的头像图片不能超过 ${config.maxSize / 1024 / 1024}MB。`);
  }

  const declaredType = (file.type || "").toLowerCase();
  const originalName = file.name || "";
  if (hasForbiddenExtension(originalName) || hasForbiddenMimeType(declaredType)) {
    return invalidUpload("不支持该文件格式，仅支持 jpg、png、webp 或 gif。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectMimeTypeFromBuffer(buffer);
  if (!detectedMime || !isAllowedMimeType(detectedMime)) {
    return invalidUpload("头像仅支持 jpg、png、webp 或 gif。");
  }

  if (declaredType && declaredType !== detectedMime) {
    const declaredExt = path.extname(originalName).toLowerCase();
    const expectedExt =
      detectedMime === "image/jpeg"
        ? ".jpg"
        : detectedMime === "image/png"
          ? ".png"
          : detectedMime === "image/gif"
            ? ".gif"
            : ".webp";
    if (declaredExt && declaredExt !== expectedExt && !(expectedExt === ".jpg" && declaredExt === ".jpeg")) {
      return invalidUpload("文件扩展名与实际内容类型不一致。");
    }
  }

  const storage = createLocalMediaStorage(getUploadRoot());
  const result = await replaceProfileAvatar({
    ownerUserId: user.id,
    profileId: profile.id,
    username: profile.username,
    originalName: originalName || null,
    mimeType: detectedMime,
    data: buffer,
    storage,
    moderate: async () => {
      const moderated = await moderateImageContent({
        size: file.size,
        mimeType: detectedMime,
        fileName: originalName,
      });
      if (moderated.status === "rejected") {
        return { status: "rejected" as const, reason: moderated.reason ?? null };
      }
      if (moderated.status === "approved") {
        return { status: "approved" as const, reason: moderated.reason ?? null };
      }
      return { status: "pending_review" as const, reason: moderated.reason ?? null };
    },
  });

  if (result.kind === "rejected") {
    return invalidUpload("该图片未能通过内容安全审核，请更换其他图片。");
  }
  if (result.kind === "failed") {
    console.error("[dashboard:avatar] asset pipeline failed", result.reason);
    return NextResponse.json(
      { success: false, error: "头像上传失败，请稍后重试。", reason: result.reason },
      { status: 500 },
    );
  }

  const updatedProfile = result.profile;
  if (!updatedProfile) {
    return NextResponse.json(
      { success: false, error: "头像已处理，但主页状态读取失败，请稍后重试。" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  await revalidatePublicProfileByUser(user.id);
  const avatarUrl = `${AVATAR_API_PREFIX}${profile.username}?v=${updatedProfile.updatedAt.getTime()}`;
  const publicEffective = result.publicEffective && Boolean(capabilities?.canExposePublicResources);
  const message = result.moderationStatus === "approved"
    ? "头像已更新。"
    : "头像已上传，审核通过后将在公开主页生效。";

  return NextResponse.json(
    {
      success: true,
      profile: { ...toProfileDto(updatedProfile), avatar_url: avatarUrl },
      avatarUrl,
      moderationStatus: result.moderationStatus,
      publicEffective,
      previousCleanup: result.previousCleanup,
      message,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return invalidUpload("请先保存主页资料。");

  const storage = createLocalMediaStorage(getUploadRoot());
  const result = await deleteProfileAvatar({
    ownerUserId: user.id,
    profileId: profile.id,
    storage,
  });
  if (!result.ok) {
    console.error("[dashboard:avatar] delete failed", result.reason);
    return NextResponse.json(
      {
        success: false,
        error: result.reason === "STORAGE_DELETE_FAILED"
          ? "头像文件删除失败，原头像仍然保留，请稍后重试。"
          : "头像删除失败，请稍后重试。",
        reason: result.reason,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  await revalidatePublicProfileByUser(user.id);
  const updatedProfile = await getOwnedProfile(user.id);
  if (!updatedProfile) {
    return NextResponse.json({ success: false, error: "主页资料不存在。" }, { status: 404 });
  }

  return NextResponse.json(
    {
      success: true,
      profile: toProfileDto(updatedProfile),
      avatarUrl: null,
      storageResult: result.storageResult,
      message: "头像已删除。",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
