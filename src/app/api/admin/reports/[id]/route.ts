import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReportAction = "process-report" | "reopen-report" | "update-note";

type PatchBody = { action?: unknown; note?: unknown };

function normalizeNote(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length > 1000) return text.slice(0, 1000);
  return text;
}

export async function PATCH(request: Request, context: RouteContext) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    body = {};
  }

  let action: ReportAction | string;
  if (typeof body.action === "string" && body.action) {
    action = body.action;
  } else {
    const header = request.headers.get("x-admin-action");
    if (!header) {
      return NextResponse.json({ success: false, error: "缺少操作类型" }, { status: 400 });
    }
    action = header;
  }

  const report = await db.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ success: false, error: "未找到对应举报记录" }, { status: 404 });
  }

  if (action === "process-report") {
    const note = normalizeNote(body.note);
    await db.report.update({
      where: { id },
      data: {
        status: "已处理",
        processedAt: new Date(),
        handlerNote: note || report.handlerNote,
      },
    });
    return NextResponse.json({ success: true, message: "已标记为处理完成" });
  }

  if (action === "reopen-report") {
    const note = normalizeNote(body.note);
    await db.report.update({
      where: { id },
      data: {
        status: "待处理",
        processedAt: null,
        handlerNote: note || report.handlerNote,
      },
    });
    return NextResponse.json({ success: true, message: "已恢复为待处理状态" });
  }

  if (action === "update-note") {
    const note = normalizeNote(body.note);
    await db.report.update({ where: { id }, data: { handlerNote: note || null } });
    return NextResponse.json({ success: true, message: "处理备注已更新" });
  }

  return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const report = await db.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ success: false, error: "未找到对应举报记录" }, { status: 404 });
  }

  await db.report.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "举报记录已删除" });
}
