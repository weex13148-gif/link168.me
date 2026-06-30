import { NextRequest, NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import {
  listShowcaseV2Contents,
  updateShowcaseV2Content,
  type ShowcaseV2Bullet,
  type ShowcaseV2Stat,
  type ShowcaseV2SectionKey,
  SHOWCASE_V2_SECTIONS,
  SHOWCASE_V2_SECTION_LABELS,
} from "@/lib/showcase-v2";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function isSectionKey(value: unknown): value is ShowcaseV2SectionKey {
  return typeof value === "string" && SHOWCASE_V2_SECTIONS.includes(value as ShowcaseV2SectionKey);
}

function parseBullets(value: unknown): ShowcaseV2Bullet[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const title = typeof obj.title === "string" ? obj.title : "";
      if (!title) return null;
      return {
        title: title.slice(0, 200),
        description: typeof obj.description === "string" ? obj.description.slice(0, 500) : undefined,
        icon: typeof obj.icon === "string" ? obj.icon.slice(0, 32) : undefined,
      };
    })
    .filter(Boolean) as ShowcaseV2Bullet[];
}

function parseStats(value: unknown): ShowcaseV2Stat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label : "";
      const val = typeof obj.value === "string" ? obj.value : "";
      if (!label && !val) return null;
      return {
        label: label.slice(0, 80),
        value: val.slice(0, 120),
        hint: typeof obj.hint === "string" ? obj.hint.slice(0, 160) : undefined,
      };
    })
    .filter(Boolean) as ShowcaseV2Stat[];
}

export async function GET(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const contents = await listShowcaseV2Contents();
  return NextResponse.json({ success: true, data: { contents, sectionLabels: SHOWCASE_V2_SECTION_LABELS }, error: null });
}

export async function PUT(request: NextRequest) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权", 401);

  let body: { sectionKey?: unknown; eyebrow?: unknown; title?: unknown; body?: unknown; bullets?: unknown; stats?: unknown; ctaText?: unknown; ctaUrl?: unknown; metadata?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }
  if (!isSectionKey(body.sectionKey)) return apiError("BAD_SECTION", "未知章节", 400);

  const updated = await updateShowcaseV2Content({
    sectionKey: body.sectionKey,
    eyebrow: typeof body.eyebrow === "string" ? body.eyebrow : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    body: typeof body.body === "string" ? body.body : undefined,
    bullets: parseBullets(body.bullets),
    stats: parseStats(body.stats),
    ctaText: body.ctaText === null || typeof body.ctaText === "string" ? (body.ctaText as string | null) : undefined,
    ctaUrl: body.ctaUrl === null || typeof body.ctaUrl === "string" ? (body.ctaUrl as string | null) : undefined,
    metadata: body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : undefined,
    updatedBy: actor.id,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: AUDIT_ACTION.UPDATE_SHOWCASE_CONTENT,
    targetType: "showcase_content",
    targetId: body.sectionKey,
    metadata: {
      sectionKey: body.sectionKey,
      eyebrow: updated.eyebrow.slice(0, 100),
      title: updated.title.slice(0, 100),
    },
    request,
    success: true,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data: { content: updated }, error: null });
}
