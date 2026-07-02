import crypto from "crypto";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, toProfileDto } from "@/lib/dashboard-data";
import { moderateImageContent } from "@/lib/content-safety";

export const runtime = "nodejs";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, { extension: string; signature: number[]; offset?: number }> = {
  "image/jpeg": { extension: ".jpg", signature: [0xff, 0xd8, 0xff] },
  "image/jpg": { extension: ".jpg", signature: [0xff, 0xd8, 0xff] },
  "image/pjpeg": { extension: ".jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: ".png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/webp": { extension: ".webp", signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  "image/gif": { extension: ".gif", signature: [0x47, 0x49, 0x46] },
};

function matchesMagicBytes(buffer: Uint8Array, spec: { extension: string; signature: number[]; offset?: number }) {
  const offset = spec.offset ?? 0;
  if (buffer.length < offset + spec.signature.length) return false;
  for (let i = 0; i < spec.signature.length; i++) if (buffer[offset + i] !== spec.signature[i]) return false;
  if (spec.extension === ".webp") return buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  return true;
}

function specFromFile(file: File, head: Uint8Array) {
  const declared = (file.type || "").toLowerCase();
  if (declared.includes("svg")) return null;
  const direct = ALLOWED_TYPES[declared];
  if (direct && matchesMagicBytes(head, direct)) return direct;
  for (const spec of Object.values(ALLOWED_TYPES)) if (matchesMagicBytes(head, spec)) return spec;
  return null;
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ success: false, error: "上传内容格式不正确。" }, { status: 400 }); }

  const file = formData.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "请选择头像图片。" }, { status: 400 });
  if (!file.size || file.size > MAX_AVATAR_SIZE) return NextResponse.json({ success: false, error: "头像图片不能超过 2MB。" }, { status: 400 });
  if ((file.type || "").toLowerCase().includes("svg") || file.name.toLowerCase().endsWith(".svg")) return NextResponse.json({ success: false, error: "不支持 SVG 格式的头像图片，仅支持 jpg、png、webp 或 gif。" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const head = new Uint8Array(arrayBuffer, 0, Math.min(16, arrayBuffer.byteLength));
  const typeSpec = specFromFile(file, head);
  if (!typeSpec) return NextResponse.json({ success: false, error: "头像仅支持 jpg、png、webp 或 gif。" }, { status: 400 });

  try {
    const moderated = moderateImageContent({ size: file.size, mimeType: file.type || `image/${typeSpec.extension.slice(1)}`, fileName: file.name });
    if (!moderated.ok || moderated.blocked) return NextResponse.json({ success: false, error: "该图片未能通过内容安全审核，请更换其他图片。" }, { status: 400 });
  } catch (err) {
    console.error("[dashboard:avatar] image moderation failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    return NextResponse.json({ success: false, error: "该图片未能通过内容安全审核，请更换其他图片。" }, { status: 400 });
  }

  const safeNamePart = (profile.username || `user-${user.id}`).replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "avatar";
  const fileName = `${safeNamePart}-${Date.now()}-${crypto.randomUUID()}${typeSpec.extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });

  let createdFile: string | null = null;
  try {
    createdFile = path.join(uploadDir, fileName);
    await writeFile(createdFile, Buffer.from(arrayBuffer));
    const avatarUrl = `/uploads/avatars/${fileName}`;
    const updatedProfile = await db.profile.update({ where: { id: profile.id }, data: { avatarUrl } });
    return NextResponse.json({ success: true, profile: toProfileDto(updatedProfile), avatarUrl });
  } catch (err) {
    if (createdFile) await rm(createdFile, { force: true }).catch(() => undefined);
    console.error("[dashboard:avatar] upload failed", err && (err as { message?: unknown }).message ? String((err as { message?: unknown }).message) : String(err));
    return NextResponse.json({ success: false, error: "头像上传失败，请稍后重试。" }, { status: 500 });
  }
}
