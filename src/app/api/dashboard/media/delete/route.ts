import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { deleteMedia } from "@/lib/media-service";
import { isValidMediaType } from "@/lib/upload-storage";
import type { MediaType } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: { mediaType: string; relativePath: string; workspaceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确" }, { status: 400 });
  }

  const { mediaType: mediaTypeStr, relativePath, workspaceId } = body;

  if (!mediaTypeStr || !isValidMediaType(mediaTypeStr)) {
    return NextResponse.json({ success: false, error: "无效的媒体类型" }, { status: 400 });
  }
  const mediaType = mediaTypeStr as MediaType;

  if (!relativePath || typeof relativePath !== "string") {
    return NextResponse.json({ success: false, error: "请提供文件路径" }, { status: 400 });
  }

  if (relativePath.includes("..") || relativePath.includes("\\") || relativePath.startsWith("/")) {
    return NextResponse.json({ success: false, error: "无效的文件路径" }, { status: 400 });
  }

  const result = await deleteMedia({
    mediaType,
    relativePath,
    userId: user.id,
    workspaceId: workspaceId || undefined,
  });

  if (result.success) {
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const statusCode = result.code === "UNAUTHORIZED" ? 403 : result.code === "RESOURCE_NOT_FOUND" ? 404 : 400;
  return NextResponse.json(
    { success: false, error: result.message, code: result.code },
    { status: statusCode },
  );
}