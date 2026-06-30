import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import {
  listShowcaseV2Sequences,
  updateShowcaseV2Sequences,
  SHOWCASE_V2_SECTIONS,
  type ShowcaseV2SectionKey,
} from "@/lib/showcase-v2";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

const ALLOWED_THEMES = ["dark", "light", "gradient"] as const;

export async function GET(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const sequences = await listShowcaseV2Sequences();
  return NextResponse.json({ success: true, data: { sequences }, error: null });
}

export async function PUT(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权", 401);

  let body: { sequences?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }
  if (!Array.isArray(body.sequences)) return apiError("BAD_BODY", "sequences 必须是数组", 400);
  if (body.sequences.length !== SHOWCASE_V2_SECTIONS.length) {
    return apiError("BAD_LENGTH", `序列必须包含 ${SHOWCASE_V2_SECTIONS.length} 项`, 400);
  }

  const sanitized: Array<{ sectionKey: ShowcaseV2SectionKey; orderIndex: number; visible: boolean; animation: boolean; theme: string; dwellSec: number; allowSwipe: boolean }> = [];
  for (const item of body.sequences) {
    if (!item || typeof item !== "object") return apiError("BAD_ITEM", "序列项格式不正确", 400);
    const obj = item as Record<string, unknown>;
    const sectionKey = obj.sectionKey;
    if (typeof sectionKey !== "string" || !SHOWCASE_V2_SECTIONS.includes(sectionKey as ShowcaseV2SectionKey)) {
      return apiError("BAD_SECTION", "未知章节", 400);
    }
    const theme = typeof obj.theme === "string" ? obj.theme : "dark";
    if (!ALLOWED_THEMES.includes(theme as (typeof ALLOWED_THEMES)[number])) {
      return apiError("BAD_THEME", "主题必须是 dark / light / gradient", 400);
    }
    sanitized.push({
      sectionKey: sectionKey as ShowcaseV2SectionKey,
      orderIndex: Math.max(0, Math.min(Number(obj.orderIndex) || 0, 32)),
      visible: obj.visible === true,
      animation: obj.animation !== false,
      theme,
      dwellSec: Math.max(0, Math.min(Number(obj.dwellSec) || 0, 600)),
      allowSwipe: obj.allowSwipe !== false,
    });
  }

  const updated = await updateShowcaseV2Sequences({ sequences: sanitized });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: AUDIT_ACTION.UPDATE_SHOWCASE_SEQUENCE,
    targetType: "showcase_sequence",
    targetId: "all",
    metadata: {
      sections: sanitized.map((s) => ({ key: s.sectionKey, visible: s.visible, theme: s.theme, order: s.orderIndex })),
    },
    request,
    success: true,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data: { sequences: updated }, error: null });
}
