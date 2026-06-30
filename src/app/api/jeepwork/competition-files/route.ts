import crypto from "crypto";
import { createWriteStream } from "fs";
import { mkdir, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

// 文件存储目录（不在 public/ 下，通过 API 受保护下载）
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "competition-files");

// 允许的文件类型 + 扩展名映射
const ALLOWED_TYPES = new Map<string, string>([
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
  ["application/zip", ".zip"],
]);

// 禁止的文件类型（可执行/脚本/配置）
const FORBIDDEN_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".ps1", ".sh", ".bash", ".zsh",
  ".dll", ".so", ".dylib",
  ".js", ".mjs", ".cjs", ".ts", ".tsx",
  ".py", ".rb", ".php", ".pl", ".c", ".cpp", ".h",
  ".sql", ".sh", ".conf", ".config", ".ini", ".env",
  ".html", ".htm", ".xml", ".svg",
]);

// 安全文件大小限制：50MB（流式处理安全值）
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

// 流式写入文件到磁盘
async function writeFileStreaming(
  file: File,
  destPath: string,
  maxSize: number
): Promise<void> {
  const writer = createWriteStream(destPath);
  const reader = file.stream().getReader();

  let received = 0;
  let done = false;

  try {
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        received += value.length;
        if (received > maxSize) {
          writer.destroy();
          throw new Error(`文件大小超过 ${maxSize / 1024 / 1024}MB 限制`);
        }
        writer.write(value);
      }

      if (done) {
        writer.end();
      }
    }

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (err) {
    writer.destroy();
    throw err;
  }
}

// 清理临时文件
async function cleanupFile(filePath: string): Promise<void> {
  try {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
  } catch {
    // 忽略清理失败
  }
}

// GET: 列出所有比赛文件
export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const files = await db.competitionFile.findMany({
    where: { isDeleted: false },
    orderBy: [{ isCurrentMain: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      purpose: true,
      description: true,
      isCurrentMain: true,
      uploadedByEmail: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: { files },
    error: null,
  });
}

// POST: 上传比赛文件（流式写入，避免大文件内存崩溃）
export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("BAD_FORMAT", "请求格式不正确", 400);
  }

  const file = formData.get("file");
  const purpose = formData.get("purpose");
  const description = formData.get("description");

  if (!(file instanceof File)) {
    return apiError("NO_FILE", "请提供要上传的文件", 400);
  }

  const fileName = typeof file.name === "string" ? file.name.trim() : "";
  if (!fileName || fileName.length > 255) {
    return apiError("INVALID_NAME", "文件名不能为空且不能超过 255 个字符", 400);
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return apiError(
      "FILE_TOO_LARGE",
      `单个文件大小不能超过 50MB。当前限制是为了保护服务器稳定性，大文件上传功能需配置 OSS 后开放。`,
      413
    );
  }
  if (file.size === 0) {
    return apiError("EMPTY_FILE", "文件不能为空", 400);
  }

  // 检查 MIME 类型
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) {
    const allowed = Array.from(ALLOWED_TYPES.values()).join("、").replace(/^\./, "");
    return apiError(
      "INVALID_TYPE",
      `不支持的文件类型 ${file.type || "未知"}。允许：${allowed}`,
      415
    );
  }

  // 检查扩展名（防止绕过 MIME 验证）
  const lowerName = fileName.toLowerCase();
  for (const forbiddenExt of FORBIDDEN_EXTENSIONS) {
    if (lowerName.endsWith(forbiddenExt)) {
      return apiError("FORBIDDEN_TYPE", "不允许上传可执行文件、脚本或配置文件", 400);
    }
  }

  // 验证用途
  const validPurposes = ["competition_ppt", "project_pdf", "demo_video", "product_screenshot", "judge_doc", "backup"];
  const purposeValue = typeof purpose === "string" ? purpose.trim() : "backup";
  if (!validPurposes.includes(purposeValue)) {
    return apiError("INVALID_PURPOSE", `文件用途必须是：${validPurposes.join("、")}`, 400);
  }

  // 安全处理文件名：使用 UUID 存储，保留原始名称用于展示
  const storedName = `${crypto.randomUUID()}${ext}`;
  const tempPath = path.join(UPLOAD_DIR, `.tmp_${storedName}`);
  const finalPath = path.join(UPLOAD_DIR, storedName);

  // 确保目录存在
  await mkdir(UPLOAD_DIR, { recursive: true });

  // 流式写入临时文件
  try {
    await writeFileStreaming(file, tempPath, MAX_FILE_SIZE);
  } catch (err) {
    console.error("[competition-files] writeFile failed:", err);
    const msg = err instanceof Error ? err.message : "文件写入失败";
    return apiError("WRITE_FAILED", `文件写入失败：${msg}`, 500);
  }

  // 原子重命名临时文件
  try {
    const fs = await import("fs/promises");
    await fs.rename(tempPath, finalPath);
  } catch (err) {
    console.error("[competition-files] rename failed:", err);
    await cleanupFile(tempPath);
    return apiError("WRITE_FAILED", "文件保存失败，请稍后重试", 500);
  }

  // 验证文件已保存
  try {
    await stat(finalPath);
  } catch {
    return apiError("WRITE_FAILED", "文件保存后验证失败", 500);
  }

  // 保存元数据
  let competitionFile;
  try {
    competitionFile = await db.competitionFile.create({
      data: {
        originalName: fileName,
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: purposeValue,
        description: typeof description === "string" ? description.trim() || null : null,
        uploadedBy: actor?.id || "unknown",
        uploadedByEmail: actor?.email || "unknown",
        isCurrentMain: false,
      },
    });
  } catch (err) {
    // 写入数据库失败时，删除已上传的物理文件
    await cleanupFile(finalPath);
    console.error("[competition-files] db create failed:", err);
    return apiError("DB_FAILED", "元数据保存失败，请重试", 500);
  }

  // 写入审计日志
  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.UPLOAD_COMPETITION_FILE,
    targetType: "competition_file",
    targetId: competitionFile.id,
    metadata: {
      originalName: fileName,
      mimeType: file.type,
      sizeBytes: file.size,
      purpose: purposeValue,
    },
    request,
    success: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: competitionFile.id,
      originalName: competitionFile.originalName,
      mimeType: competitionFile.mimeType,
      sizeBytes: competitionFile.sizeBytes,
      purpose: competitionFile.purpose,
      description: competitionFile.description,
      isCurrentMain: competitionFile.isCurrentMain,
      uploadedByEmail: competitionFile.uploadedByEmail,
      createdAt: competitionFile.createdAt.toISOString(),
      message: "文件上传成功",
    },
    error: null,
  });
}
