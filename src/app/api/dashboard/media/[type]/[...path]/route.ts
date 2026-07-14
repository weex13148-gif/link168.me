import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getUploadDirForMediaType,
  isValidMediaType,
  getAvatarContentType,
  isSafeMediaFileName,
  buildContentRef,
} from "@/lib/upload-storage";
import { db } from "@/lib/db";
import type { MediaType } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODERATION_STATUSES = new Set(["approved"]);

type RouteContext = { params: Promise<{ type: string; path: string[] }> };

function sanitizePathSegments(segments: string[]): string | null {
  const cleaned: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return null;
    if (seg.includes("\\") || seg.includes("/")) return null;
    if (seg.includes("\0")) return null;
    cleaned.push(seg);
  }
  if (cleaned.length < 4) return null;
  const fileName = cleaned[cleaned.length - 1];
  if (!isSafeMediaFileName(fileName)) return null;
  return cleaned.join("/");
}

async function checkMediaModerationStatus(mediaType: string, relativePath: string): Promise<boolean> {
  const contentRef = buildContentRef(mediaType, relativePath);
  try {
    const record = await db.contentModerationRecord.findUnique({
      where: { contentType_contentRef: { contentType: mediaType, contentRef } },
      select: { status: true },
    });
    if (!record) {
      return true;
    }
    return !record.status || ALLOWED_MODERATION_STATUSES.has(record.status);
  } catch {
    return false;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { type, path: pathSegments } = await context.params;

  if (!type || !isValidMediaType(type)) {
    return NextResponse.json({ success: false, error: "无效的媒体类型。" }, { status: 400 });
  }

  const mediaType = type as MediaType;

  const relativePath = sanitizePathSegments(pathSegments || []);
  if (!relativePath) {
    return NextResponse.json({ success: false, error: "无效的文件路径。" }, { status: 400 });
  }

  const uploadDir = getUploadDirForMediaType(mediaType);
  const filePath = path.join(uploadDir, relativePath);

  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(uploadDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    return NextResponse.json({ success: false, error: "无效的文件路径。" }, { status: 400 });
  }

  const fileName = path.basename(relativePath);

  const isAllowed = await checkMediaModerationStatus(mediaType, relativePath);
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "媒体审核未通过或待审核。" }, { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);
    const contentType = getAvatarContentType(fileName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在。" }, { status: 404 });
  }
}