import { NextResponse } from "next/server";
import { requireJeepworkAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

// 规范化状态；仅在此 PATCH 单条举报更新，替代原本 /reports PATCH。
// 处理报告内容由管理员处理，更新状态、备注。

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;

  const report = await db.report.findUnique({ where: { id } });
  if (!report) return apiError("NOT_FOUND", "举报记录不存在", 404);

  return NextResponse.json({
    success: true,
    data: {
      report: {
        id: report.id,
        reportUrl: report.reportUrl,
        reportType: report.reportType,
        reportReason: report.reportReason,
        contact: report.contact,
        imageUrl: report.imageUrl,
        status: report.status,
        handlerNote: report.handlerNote,
        processedAt: report.processedAt,
        createdAt: report.createdAt,
      },
    },
    error: null,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  const { id } = await context.params;

  let body: { action?: unknown; note?: unknown; status?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; note?: unknown; status?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON", 400);
  }

  const report = await db.report.findUnique({ where: { id } });
  if (!report) {
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.PROCESS_REPORT,
      targetType: "report",
      targetId: id,
      metadata: { action: body.action || "unknown", reason: "report_not_found" },
      request,
      success: false,
    });
    return apiError("NOT_FOUND", "举报记录不存在", 404);
  }

  const note = typeof body.note === "string" ? body.note : "";
  const VALID_STATUSES = ["待处理", "处理中", "已处理", "已驳回"];
  const newStatus = VALID_STATUSES.includes(body.status as string) ? (body.status as string) : "";

  const actionName = typeof body.action === "string" ? body.action : "";

  let updateData: { status?: string; processedAt?: Date | null; handlerNote?: string | null } = {};

  if (newStatus) {
    updateData.status = newStatus;
    updateData.processedAt = newStatus === "待处理" ? null : new Date();
    if (note) updateData.handlerNote = note;
  } else if (actionName === "process-report") {
    updateData = { status: "已处理", processedAt: new Date(), handlerNote: note || report.handlerNote };
  } else if (actionName === "reject-report") {
    updateData = { status: "已驳回", processedAt: new Date(), handlerNote: note || report.handlerNote };
  } else if (actionName === "reopen-report") {
    updateData = { status: "待处理", processedAt: null, handlerNote: note || report.handlerNote };
  } else if (actionName === "mark-processing") {
    updateData = { status: "处理中", processedAt: null, handlerNote: note || report.handlerNote };
  } else if (actionName === "update-note") {
    updateData = { handlerNote: note || null };
  } else {
    return apiError("BAD_BODY", "缺少有效的操作或状态", 400);
  }

  const oldStatus = report.status;
  // P0-4: 举报状态操作与审计日志在同一事务中，审计失败则状态更新回滚
  await db.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: updateData });
    await writeAdminAuditLog(
      {
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        action: AUDIT_ACTION.PROCESS_REPORT,
        targetType: "report",
        targetId: id,
        metadata: { reportUrl: report.reportUrl, action: actionName, oldStatus, newStatus: newStatus || report.status, noteUpdated: actionName === "update-note" || Boolean(note) },
        request,
        success: true,
      },
      tx,
    );
  });

  return NextResponse.json({
    success: true,
    data: {
      reportId: id,
      oldStatus,
      newStatus: newStatus || report.status,
      action: actionName,
      message: actionName === "update-note"
        ? "处理备注已更新"
        : newStatus === "已处理"
        ? "已标记为处理完成"
        : newStatus === "已驳回"
        ? "已标记为驳回"
        : newStatus === "处理中"
        ? "已标记为处理中"
        : "已更新",
    },
    error: null,
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const report = await db.report.findUnique({ where: { id } });
  if (!report) return apiError("NOT_FOUND", "举报记录不存在", 404);

  // P0-B: 举报物理删除已暂停。推荐改为归档状态（status="已归档"），保留完整举报证据链。
  // 待政策确认后，将 DELETE 改为 update({ data: { status: "已归档" } })，仍在同一事务中写审计日志。
  return NextResponse.json(
    { success: false, error: { code: "REPORT_DELETE_DISABLED", message: "举报删除已停用，请使用归档功能" } },
    { status: 409 },
  );
}
