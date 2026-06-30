import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { getShowcaseLogs, getShowcaseStats } from "@/lib/showcase";
import { SHOWCASE_V2_SECTION_LABELS } from "@/lib/showcase-v2-shared";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function ipViewReason(value: unknown) {
  if (typeof value !== "string") return "";
  return value.slice(0, 200);
}

export async function GET(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const url = new URL(request.url);
  const showIp = url.searchParams.get("showIp") === "1";
  const reason = ipViewReason(url.searchParams.get("reason"));
  const logs = await getShowcaseLogs(100);
  const stats = await getShowcaseStats();

  if (showIp) {
    if (!reason) return apiError("REASON_REQUIRED", "查看完整 IP 必须填写查看原因", 400);
    const actor = await getJeepworkSessionUser(request);
    await writeAdminAuditLog({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: AUDIT_ACTION.PROCESS_REPORT,
      targetType: "showcase_visits",
      targetId: "ip_view",
      metadata: { reason, count: logs.length },
      request,
      success: true,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    success: true,
    data: {
      stats,
      logs: showIp ? logs : logs.map(({ rawIp: _rawIp, ...rest }) => rest),
      sectionLabels: SHOWCASE_V2_SECTION_LABELS,
    },
    error: null,
  });
}
