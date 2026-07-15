import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/dashboard-data";
import { moderateImageContent } from "@/lib/content-safety";
import {
  getLinkIconUploadDir,
  detectMimeTypeFromBuffer,
  hasForbiddenExtension,
  hasForbiddenMimeType,
  isAllowedMimeType,
  generateSafeFileName,
  validateUploadPath,
  getDateSubdirectory,
  getPublicUrlForLinkIcon,
  UPLOAD_CONFIGS,
} from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ success: false, error: "上传内容格式不正确。" }, { status: 400 }); }

  const file = formData.get("icon");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "请选择图标图片。" }, { status: 400 });

  const config = UPLOAD_CONFIGS.linkIcon;

  if (!file.size || file.size > config.maxSize) {
    return NextResponse.json({ success: false, error: `图标图片不能超过 ${config.maxSize / 1024}KB。` }, { status: 400 });
  }

  const declaredType = (file.type || "").toLowerCase();
  const originalName = file.name || "";

  if (hasForbiddenExtension(originalName)) {
    return NextResponse.json({ success: false, error: "不支持该文件格式，仅支持 jpg、png 或 webp。" }, { status: 400 });
  }

  if (hasForbiddenMimeType(declaredType)) {
    return NextResponse.json({ success: false, error: "不支持该文件格式，仅支持 jpg、png 或 webp。" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedMime = detectMimeTypeFromBuffer(buffer);
  if (!detectedMime || !isAllowedMimeType(detectedMime)) {
    return NextResponse.json({ success: false, error: "图标仅支持 jpg、png 或 webp。" }, { status: 400 });
  }

  if (detectedMime === "image/gif") {
    return NextResponse.json({ success: false, error: "图标不支持 gif 格式，仅支持 jpg、png 或 webp。" }, { status: 400 });
  }

  if (declaredType && detectedMime !== declaredType && !declaredType.includes(detectedMime.split("/")[1])) {
    const declaredExt = path.extname(originalName).toLowerCase();
    const expectedExt = detectedMime === "image/jpeg" ? ".jpg" : detectedMime === "image/png" ? ".png" : ".webp";
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
    console.error("[dashboard:link-icon] image moderation failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    moderationStatus = "pending_manual_review";
  }

  const fileName = generateSafeFileName(detectedMime);
  const uploadBaseDir = getLinkIconUploadDir();
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
    const iconUrl = getPublicUrlForLinkIcon(relativePath);

    return NextResponse.json(
      {
        success: true,
        iconUrl,
        moderationStatus,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (createdFile) {
      await rm(createdFile, { force: true }).catch(() => undefined);
    }
    console.error("[dashboard:link-icon] upload failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    return NextResponse.json({ success: false, error: "图标上传失败，请稍后重试。" }, { status: 500 });
  }
}
