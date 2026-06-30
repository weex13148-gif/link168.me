import { NextRequest, NextResponse } from "next/server";
import { SHOWCASE_COOKIE_NAME, buildShowcaseLogMetadata, getShowcaseConfig, hasValidShowcaseCookie, recordShowcaseAccess } from "@/lib/showcase";
import { SHOWCASE_V2_SECTION_LABELS, type ShowcaseV2SectionKey } from "@/lib/showcase-v2";

export const runtime = "nodejs";

function isSectionKey(value: unknown): value is ShowcaseV2SectionKey {
  return typeof value === "string" && (SHOWCASE_V2_SECTION_LABELS as Record<string, string>)[value] !== undefined;
}

export async function POST(request: NextRequest) {
  const config = await getShowcaseConfig();
  const authed = hasValidShowcaseCookie(request.cookies.get(SHOWCASE_COOKIE_NAME)?.value, config);
  if (!config.enabled || !authed) {
    return NextResponse.json({ success: false, data: null, error: { code: "NOT_AUTHORIZED", message: "未授权" } }, { status: 404 });
  }

  let body: { sectionKey?: unknown; dwellMs?: unknown; progress?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!isSectionKey(body.sectionKey)) {
    return NextResponse.json({ success: false, data: null, error: { code: "BAD_SECTION", message: "未知章节" } }, { status: 400 });
  }
  const dwellMs = Math.max(0, Math.min(Number(body.dwellMs) || 0, 60 * 60 * 1000));
  const progress = Math.max(0, Math.min(Number(body.progress) || 0, 1));

  await recordShowcaseAccess(
    buildShowcaseLogMetadata(request.headers, "section_view", {
      sectionKey: body.sectionKey,
      dwellMs,
      progress,
    } as unknown as Record<string, unknown>),
  ).catch(() => undefined);

  return NextResponse.json({ success: true, data: { ok: true }, error: null });
}
