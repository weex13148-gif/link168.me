import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, toProfileDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
// 只允许静态位图：jpeg / png / webp / gif。
// 注意：SVG 不支持——SVG 是 XML 文本格式，可能嵌入 script/onload/XXE 攻击
const ALLOWED_TYPES: Record<string, { extension: string; signature: number[]; offset?: number }> = {
  "image/jpeg": { extension: ".jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: ".png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/webp": { extension: ".webp", signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  "image/gif": { extension: ".gif", signature: [0x47, 0x49, 0x46] },
};

function matchesMagicBytes(buffer: Uint8Array, spec: { extension: string; signature: number[]; offset?: number }): boolean {
  const offset = spec.offset ?? 0;
  if (buffer.length < offset + spec.signature.length) return false;
  for (let i = 0; i < spec.signature.length; i++) {
    if (buffer[offset + i] !== spec.signature[i]) return false;
  }
  // webp 额外校验: 前 4 字节是 RIFF，第 8-11 字节应为 WEBP
  if (spec.extension === ".webp") {
    if (buffer.length < 12) return false;
    const webpTag = [buffer[8], buffer[9], buffer[10], buffer[11]];
    if (webpTag[0] !== 0x57 || webpTag[1] !== 0x45 || webpTag[2] !== 0x42 || webpTag[3] !== 0x50) return false;
  }
  return true;
}

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

  // 1. MIME 类型白名单（明确拒绝 SVG——SVG 是 XML 文本格式，可能包含脚本注入）
  if (file.type === "image/svg+xml" || file.type?.includes("svg")) {
    return NextResponse.json(
      { success: false, error: "不支持 SVG 格式的头像图片，仅支持 jpg、png、webp 或 gif。" },
      { status: 400 },
    );
  }
  const typeSpec = ALLOWED_TYPES[file.type];
  if (!typeSpec) {
    return NextResponse.json({ success: false, error: "头像仅支持 jpg、png、webp 或 gif。" }, { status: 400 });
  }

  // 2. 文件大小限制（同时对 Content-Length 做防御）
  if (!file.size || file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ success: false, error: "头像图片不能超过 2MB。" }, { status: 400 });
  }

  // 3. 文件头真实校验（magic bytes），防止 .exe 改后缀绕过
  const arrayBuffer = await file.arrayBuffer();
  const head = new Uint8Array(arrayBuffer, 0, Math.min(16, arrayBuffer.byteLength));
  if (!matchesMagicBytes(head, typeSpec)) {
    return NextResponse.json({ success: false, error: "文件内容与声明格式不一致。" }, { status: 400 });
  }

  // 4. 文件名中只保留白名单后缀，并且用随机名 + 用户资料名，防止路径遍历
  // TODO(P0-security): 此处暂未做 NSFW / 暴力/敏感内容图片审核，
  //   上线建议接入腾讯内容安全 / 阿里云内容安全 或其他第三方图片审核 API，
  //   避免用户上传违法违规图片被他人访问。
  const safeExtension = typeSpec.extension;
  const fileName = profile.username + "-" + crypto.randomUUID() + safeExtension;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(arrayBuffer));

  const updatedProfile = await db.profile.update({
    where: { id: profile.id },
    data: { avatarUrl: "/uploads/avatars/" + fileName },
  });

  return NextResponse.json({ success: true, profile: toProfileDto(updatedProfile) });
}
