import crypto from "crypto";
import { createWriteStream } from "fs";
import { mkdir, unlink, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "competition-files");

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
// 视频/压缩包限制更大（需 OSS 后支持）
const LARGE_FILE_MAX_SIZE = 50 * 1024 * 1024;

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

// 流式写入文件到磁盘
async function writeFileStreaming(
  file: File,
  destPath: string,
  maxSize: number,
  onProgress?: (received: number) => void
): Promise<void> {
  const CHUNK_SIZE = 64 * 1024; // 64KB chunks
  const writer = createWriteStream(destPath);
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();

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
          throw new Error(`FILE_TOO_LARGE: 文件大小超过 ${maxSize / 1024 / 1024}MB 限制`);
        }
        writer.write(value);
        onProgress?.(received);
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
    await unlink(filePath);
  } catch {
    // 忽略清理失败
  }
}

// POST: 替换文件（保留旧文件记录作为历史版本）
// 关键：旧文件必须在新文件成功保存后才失效
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: oldFileId } = await context.params;

  const oldFile = await db.competitionFile.findFirst({
    where: { id: oldFileId, isDeleted: false },
  });
  if (!oldFile) return apiError("NOT_FOUND", "原文件不存在", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("BAD_FORMAT", "请求格式不正确", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("NO_FILE", "请提供要上传的新文件", 400);
  }

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

  // 校验 MIME 类型
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) {
    const allowed = Array.from(ALLOWED_TYPES.values()).join("、").replace(/^\./, "");
    return apiError(
      "INVALID_TYPE",
      `不支持的文件类型 ${file.type || "未知"}。允许：${allowed}`,
      415
    );
  }

  // 校验扩展名
  const lowerName = (typeof file.name === "string" ? file.name : "").toLowerCase();
  for (const forbiddenExt of FORBIDDEN_EXTENSIONS) {
    if (lowerName.endsWith(forbiddenExt)) {
      return apiError("FORBIDDEN_TYPE", "不允许上传可执行文件、脚本或配置文件", 400);
    }
  }

  // 生成安全文件名
  const storedName = `${crypto.randomUUID()}${ext}`;
  const tempPath = path.join(UPLOAD_DIR, `.tmp_${storedName}`);
  const finalPath = path.join(UPLOAD_DIR, storedName);

  await mkdir(UPLOAD_DIR, { recursive: true });

  // 流式写入临时文件
  try {
    await writeFileStreaming(file, tempPath, MAX_FILE_SIZE);
  } catch (err) {
    console.error("[competition-files/replace] writeFile failed:", err);
    const msg = err instanceof Error ? err.message : "文件写入失败";
    return apiError("WRITE_FAILED", `文件写入失败：${msg}`, 500);
  }

  // 原子重命名临时文件
  try {
    const fs = await import("fs/promises");
    await fs.rename(tempPath, finalPath);
  } catch (err) {
    console.error("[competition-files/replace] rename failed:", err);
    await cleanupFile(tempPath);
    return apiError("WRITE_FAILED", "文件保存失败，请稍后重试", 500);
  }

  // 验证文件已保存
  try {
    await stat(finalPath);
  } catch {
    return apiError("WRITE_FAILED", "文件保存后验证失败", 500);
  }

  const oldStoredName = oldFile.storedName;

  // 事务：软删除旧文件 + 创建新文件记录
  // 只有在新文件成功保存后才使旧文件失效
  let newFile: Awaited<ReturnType<typeof db.competitionFile.create>>;
  try {
    newFile = await db.$transaction(async (tx) => {
      await tx.competitionFile.update({
        where: { id: oldFileId },
        data: { isDeleted: true },
      });

      const created = await tx.competitionFile.create({
        data: {
          originalName: typeof file.name === "string" ? file.name.trim() : oldFile.originalName,
          storedName,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: oldFile.purpose,
          description: oldFile.description,
          uploadedBy: actor?.id || "unknown",
          uploadedByEmail: actor?.email || "unknown",
          isCurrentMain: oldFile.isCurrentMain,
        },
      });

      await writeAdminAuditLog(
        {
          actorUserId: actor?.id,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          action: AUDIT_ACTION.REPLACE_COMPETITION_FILE,
          targetType: "competition_file",
          targetId: oldFileId,
          metadata: {
            oldOriginalName: oldFile.originalName,
            newOriginalName: typeof file.name === "string" ? file.name.trim() : oldFile.originalName,
            mimeType: file.type,
            sizeBytes: file.size,
          },
          request,
          success: true,
        },
        tx,
      );

      return created;
    });
  } catch (err) {
    // 数据库操作失败，清理新物理文件
    console.error("[competition-files/replace] DB transaction failed:", err);
    await cleanupFile(finalPath);
    return apiError("DB_ERROR", "数据库更新失败，旧文件保持不变", 500);
  }

  // 数据库更新成功后，删除旧物理文件
  const oldFilePath = path.join(UPLOAD_DIR, oldStoredName);
  try {
    await unlink(oldFilePath);
  } catch {
    // 旧文件物理删除失败不影响操作成功，旧文件记录已软删除
    console.warn("[competition-files/replace] Failed to delete old physical file:", oldFilePath);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: newFile.id,
      originalName: newFile.originalName,
      mimeType: newFile.mimeType,
      sizeBytes: newFile.sizeBytes,
      purpose: newFile.purpose,
      description: newFile.description,
      isCurrentMain: newFile.isCurrentMain,
      uploadedByEmail: newFile.uploadedByEmail,
      createdAt: newFile.createdAt.toISOString(),
      message: "文件已替换成功",
    },
    error: null,
  });
}
