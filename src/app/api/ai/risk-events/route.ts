// AI 风险事件管理 API（仅 super_admin 可访问）
// GET: 列表 / 统计
// PATCH: 审核处置
import { NextResponse } from "next/server";
import { requireSuperAdmin, getCurrentAdmin } from "@/lib/admin-auth";
import { listAiRiskEvents, reviewAiRiskEvent, getAiRiskStats } from "@/lib/ai/risk-log";

export const runtime = "nodejs";

type ListQuery = {
  limit?: string;
  offset?: string;
  status?: string;
  riskLevel?: string;
  eventType?: string;
};

type ReviewBody = {
  eventId?: unknown;
  action?: unknown;
  note?: unknown;
};

// GET: 查询风险事件列表或统计（仅 super_admin 可访问）
export async function GET(request: Request) {
  // 安全：必须为 super_admin 才能查看风险事件列表
  const superAdminResponse = await requireSuperAdmin(request);
  if (superAdminResponse) {
    return superAdminResponse; // 403/404
  }

  const { searchParams } = new URL(request.url);
  const statsOnly = searchParams.get("stats") === "1";

  if (statsOnly) {
    const stats = await getAiRiskStats();
    return NextResponse.json({ success: true, stats });
  }

  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const status = searchParams.get("status") ?? undefined;
  const riskLevel = searchParams.get("riskLevel") ?? undefined;
  const eventType = searchParams.get("eventType") ?? undefined;

  const result = await listAiRiskEvents({
    limit: Math.min(limit, 200),
    offset,
    status: status as "open" | "reviewing" | "resolved" | "dismissed" | undefined,
    riskLevel: riskLevel as "low" | "medium" | "high" | "critical" | undefined,
    eventType: eventType as "input_blocked" | "output_blocked" | "user_ai_restricted" | "model_error" | "report_received" | "report_confirmed" | "report_dismissed" | "manual_review" | undefined,
  });

  return NextResponse.json({ success: true, ...result });
}

// PATCH: 审核处置风险事件（仅 super_admin）
export async function PATCH(request: Request) {
  const superAdminResponse = await requireSuperAdmin(request);
  if (superAdminResponse) {
    return superAdminResponse; // 403/404
  }
  const adminUser = await getCurrentAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ success: false, error: "无法获取管理员信息。" }, { status: 403 });
  }

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const note = typeof body.note === "string" ? body.note : "";

  const validActions = ["confirm", "dismiss", "suspend_user", "suspend_ai", "warn_user"];
  if (!eventId || !action || !validActions.includes(action)) {
    return NextResponse.json(
      { success: false, error: `缺少或无效的字段。eventId=${eventId}, action=${action}` },
      { status: 400 },
    );
  }

  const result = await reviewAiRiskEvent({
    eventId,
    reviewedByUserId: adminUser.id,
    action: action as "confirm" | "dismiss" | "suspend_user" | "suspend_ai" | "warn_user",
    note,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
