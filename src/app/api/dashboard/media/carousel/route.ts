import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/dashboard-data";
import { moderateImageContent } from "@/lib/content-safety";
import { db } from "@/lib/db";
import {
  getMediaUploadDir,
  detectMimeTypeFromBuffer,
  hasForbiddenExtension,
  hasForbiddenMimeType,
  isAllowedMimeType,
  generateSafeFileName,
  validateUploadPath,
  getDateSubdirectory,
  getPublicUrlForMedia,
  buildContentRef,
  UPLOAD_CONFIGS,
} from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_TYPE = "carousel" as const;

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ success: false, error: "上传内容格式不正确。" }, { status: 400 }); }

  const file = formData.get("image");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "请选择图片。" }, { status: 400 });

  const config = UPLOAD_CONFIGS[MEDIA_TYPE];

  if (!file.size || file.size > config.maxSize) {
    return NextResponse.json({ success: false, error: `图片不能超过 ${config.maxSize / 1024 / 1024}MB。` }, { status: 400 });
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
    return NextResponse.json({ success: false, error: "仅支持 jpg、png、webp 或 gif 格式。" }, { status: 400 });
  }

  if (declaredType && detectedMime !== declaredType && !declaredType.includes(detectedMime.split("/")[1])) {
    const declaredExt = path.extname(originalName).toLowerCase();
    const expectedExt = detectedMime === "image/jpeg" ? ".jpg" : detectedMime === "image/png" ? ".png" : detectedMime === "image/gif" ? ".gif" : ".webp";
    if (declaredExt && declaredExt !== expectedExt && !(expectedExt === ".jpg" && declaredExt === ".jpeg")) {
      return NextResponse.json({ success: false, error: "文件扩展名与实际内容类型不一致。" }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "该图片未能通过内容安全审核，请更换其他图片。" }, { status: 400 });
    }
    moderationStatus = moderated.status;
    provider = moderated.provider;
  } catch (err) {
    console.error(`[dashboard:media:${MEDIA_TYPE}] image moderation failed`, err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    moderationStatus = "pending_manual_review";
  }

  const fileName = generateSafeFileName(detectedMime);
  const uploadBaseDir = getMediaUploadDir(MEDIA_TYPE);
  const dateSubdir = getDateSubdirectory();
  const relativeDir = path.join(profile.id.toLowerCase(), dateSubdir);
  const uploadDir = path.join(uploadBaseDir, relativeDir);

  const pathValidation = validateUploadPath(uploadDir, fileName);
  if (!pathValidation.valid) {
    return NextResponse.json({ success: false, error: "文件名不安全。" }, { status: 400 });
  }

  await mkdir(uploadDir, { recursive: true });

  let createdFile: string | null = null;
  try {
    createdFile = pathValidation.fullPath;
    await writeFile(createdFile, buffer);

    const relativePath = path.join(relativeDir, fileName).replace(/\\/g, "/");
    const imageUrl = getPublicUrlForMedia(MEDIA_TYPE, relativePath);

    const contentRef = buildContentRef(MEDIA_TYPE, relativePath);
    await db.contentModerationRecord.upsert({
      where: { contentType_contentRef: { contentType: MEDIA_TYPE, contentRef } },
      update: {
        status: moderationStatus,
        provider,
      },
      create: {
        id: crypto.randomUUID(),
        contentType: MEDIA_TYPE,
        contentRef,
        status: moderationStatus,
        provider,
      },
    });

    return NextResponse.json(
      {
        success: true,
        imageUrl,
        moderationStatus,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (createdFile) {
      await rm(createdFile, { force: true }).catch(() => undefined);
    }
    console.error(`[dashboard:media:${MEDIA_TYPE}] upload failed`, err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    return NextResponse.json({ success: false, error: "上传失败，请稍后重试。" }, { status: 500 });
  }
}
