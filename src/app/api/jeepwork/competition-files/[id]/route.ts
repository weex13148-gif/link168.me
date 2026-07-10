import { unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "competition-files");

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

// PATCH: 更新文件（描述、设置主文件）
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: fileId } = await context.params;

  let body: { action?: unknown; description?: unknown; purpose?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; description?: unknown; purpose?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  const existing = await db.competitionFile.findFirst({
    where: { id: fileId, isDeleted: false },
  });
  if (!existing) return apiError("NOT_FOUND", "文件不存在", 404);

  if (action === "set-main") {
    // 取消所有文件的主文件标记，然后设置当前文件为主文件
    await db.$transaction([
      db.competitionFile.updateMany({
        where: { isDeleted: false },
        data: { isCurrentMain: false },
      }),
      db.competitionFile.update({
        where: { id: fileId },
        data: { isCurrentMain: true },
      }),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.SET_MAIN_COMPETITION_FILE,
      targetType: "competition_file",
      targetId: fileId,
      metadata: { originalName: existing.originalName },
      request,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { message: "已设置为主文件" },
      error: null,
    });
  }

  if (action === "update-meta") {
    const validPurposes = ["competition_ppt", "project_pdf", "demo_video", "product_screenshot", "judge_doc", "backup"];
    const purpose = typeof body.purpose === "string" && validPurposes.includes(body.purpose) ? body.purpose : existing.purpose;
    const description = typeof body.description === "string" ? body.description.trim() || null : existing.description;

    await db.competitionFile.update({
      where: { id: fileId },
      data: { purpose, description },
    });

    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.UPDATE_COMPETITION_FILE,
      targetType: "competition_file",
      targetId: fileId,
      metadata: { originalName: existing.originalName, purpose, description },
      request,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { message: "文件信息已更新" },
      error: null,
    });
  }

  return apiError("BAD_BODY", "action 必须是 set-main 或 update-meta");
}

// DELETE: 删除文件（软删除）
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id: fileId } = await context.params;

  const existing = await db.competitionFile.findFirst({
    where: { id: fileId, isDeleted: false },
  });
  if (!existing) return apiError("NOT_FOUND", "文件不存在", 404);

  const filePath = path.join(UPLOAD_DIR, existing.storedName);

  // 软删除 + 删除物理文件
  await db.$transaction(async (tx) => {
    await tx.competitionFile.update({
      where: { id: fileId },
      data: { isDeleted: true, isCurrentMain: false },
    });

    await writeAdminAuditLog(
      {
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        action: AUDIT_ACTION.DELETE_COMPETITION_FILE,
        targetType: "competition_file",
        targetId: fileId,
        metadata: { originalName: existing.originalName, mimeType: existing.mimeType, sizeBytes: existing.sizeBytes },
        request,
        success: true,
      },
      tx,
    );
  });

  // 删除物理文件（软删除之后异步清理）
  try { await unlink(filePath); } catch { /* 文件不存在也无妨 */ }

  return NextResponse.json({
    success: true,
    data: { message: "文件已删除" },
    error: null,
  });
}
