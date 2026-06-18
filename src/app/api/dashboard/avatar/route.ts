import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, toProfileDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先保存主页资料。" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "上传内容格式不正确。" }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "请选择头像图片。" }, { status: 400 });
  }

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json({ success: false, error: "头像仅支持 jpg、png、webp 或 gif。" }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ success: false, error: "头像图片不能超过 2MB。" }, { status: 400 });
  }

  const fileName = profile.username + "-" + crypto.randomUUID() + ALLOWED_TYPES[file.type];
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  const updatedProfile = await db.profile.update({
    where: { id: profile.id },
    data: { avatarUrl: "/uploads/avatars/" + fileName },
  });

  return NextResponse.json({ success: true, profile: toProfileDto(updatedProfile) });
}
