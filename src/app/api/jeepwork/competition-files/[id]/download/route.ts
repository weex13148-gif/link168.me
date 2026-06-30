import { createReadStream, statSync } from "fs";
import path from "path";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "competition-files");

// GET: 下载文件（super_admin 专属，通过 API 受保护）
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: fileId } = await context.params;

  const file = await db.competitionFile.findFirst({
    where: { id: fileId, isDeleted: false },
  });

  if (!file) {
    return new Response("文件不存在", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, file.storedName);

  // 安全检查：确保文件在预期目录内（防止路径穿越）
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    return new Response("路径非法", { status: 403 });
  }

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(resolved);
  } catch {
    return new Response("文件不存在", { status: 404 });
  }

  if (!stats.isFile()) {
    return new Response("不是有效文件", { status: 400 });
  }

  // 写入审计日志
  await writeAdminAuditLog({
    actorUserId: actor?.id,
    actorEmail: actor?.email,
    actorRole: actor?.role,
    action: AUDIT_ACTION.DOWNLOAD_COMPETITION_FILE,
    targetType: "competition_file",
    targetId: fileId,
    metadata: { originalName: file.originalName, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
    request,
    success: true,
  });

  // 流式返回，不暴露真实磁盘路径
  const stream = createReadStream(resolved);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(buffer.length),
      // 使用原始文件名，不暴露存储路径
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
