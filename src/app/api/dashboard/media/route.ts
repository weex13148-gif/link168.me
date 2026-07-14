import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { uploadMedia, replaceMedia } from "@/lib/media-service";
import { isValidMediaType } from "@/lib/upload-storage";
import type { MediaType } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "上传内容格式不正确" }, { status: 400 });
  }

  const mediaTypeStr = formData.get("mediaType") as string | null;
  if (!mediaTypeStr || !isValidMediaType(mediaTypeStr)) {
    return NextResponse.json({ success: false, error: "无效的媒体类型" }, { status: 400 });
  }
  const mediaType = mediaTypeStr as MediaType;

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "请选择图片" }, { status: 400 });
  }

  const workspaceId = formData.get("workspaceId") as string | null;
  const existingUrl = formData.get("existingUrl") as string | null;

  if (existingUrl) {
    const result = await replaceMedia({
      file,
      mediaType,
      userId: user.id,
      workspaceId: workspaceId || undefined,
      existingUrl,
    });

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          mediaId: result.mediaId,
          url: result.url,
          mimeType: result.mimeType,
          sizeBytes: result.sizeBytes,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { success: false, error: result.message, code: result.code },
      { status: result.code === "UNAUTHORIZED" ? 403 : 400 },
    );
  }

  const result = await uploadMedia({
    file,
    mediaType,
    userId: user.id,
    workspaceId: workspaceId || undefined,
  });

  if (result.success) {
    return NextResponse.json(
      {
        success: true,
        mediaId: result.mediaId,
        url: result.url,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { success: false, error: result.message, code: result.code },
    { status: result.code === "UNAUTHORIZED" ? 403 : 400 },
  );
}