import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getLinkIconContentType,
  getLinkIconUploadDir,
  isSafeLinkIconFileName,
  isSafeMediaFileName,
} from "@/lib/upload-storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODERATION_STATUSES = new Set(["approved", "legacy_approved"]);

type RouteContext = { params: Promise<{ filename: string[] }> };

function sanitizePathSegments(segments: string[]): string | null {
  const cleaned: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return null;
    if (seg.includes("\\") || seg.includes("/")) return null;
    if (seg.includes("\0")) return null;
    cleaned.push(seg);
  }
  if (cleaned.length === 0) return null;
  const fileName = cleaned[cleaned.length - 1];
  if (!isSafeMediaFileName(fileName) && !isSafeLinkIconFileName(fileName)) return null;
  return cleaned.join("/");
}

async function checkLinkIconModerationStatus(fileName: string): Promise<boolean> {
  try {
    const link = await db.link.findFirst({
      where: { iconUrl: { endsWith: `/${fileName}` } },
      select: { iconModerationStatus: true },
    });
    if (!link) return false;
    return !link.iconModerationStatus || ALLOWED_MODERATION_STATUSES.has(link.iconModerationStatus);
  } catch {
    return false;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { filename } = await context.params;

  const relativePath = sanitizePathSegments(filename || []);
  if (!relativePath) {
    return NextResponse.json({ success: false, error: "无效的文件名。" }, { status: 400 });
  }

  const uploadDir = getLinkIconUploadDir();
  const filePath = path.join(/* turbopackIgnore: true */ uploadDir, relativePath);

  const resolvedPath = path.resolve(/* turbopackIgnore: true */ filePath);
  const resolvedDir = path.resolve(/* turbopackIgnore: true */ uploadDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    return NextResponse.json({ success: false, error: "无效的文件路径。" }, { status: 400 });
  }

  const fileName = path.basename(relativePath);

  const isAllowed = await checkLinkIconModerationStatus(fileName);
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "图标审核未通过或待审核。" }, { status: 403 });
  }

  try {
    const buffer = await readFile(/* turbopackIgnore: true */ filePath);
    const contentType = getLinkIconContentType(fileName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "图标不存在。" }, { status: 404 });
  }
}
