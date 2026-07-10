import { NextRequest, NextResponse } from "next/server";
import {
  SHOWCASE_COOKIE_NAME,
  buildShowcaseLogMetadata,
  getShowcaseConfig,
  hasValidShowcaseCookie,
  recordShowcaseAccess,
} from "@/lib/showcase";

export const runtime = "nodejs";

function normalizeSize(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{2,5}x\d{2,5}$/.test(trimmed) ? trimmed : null;
}

export async function POST(request: NextRequest) {
  const config = await getShowcaseConfig();
  const authed = hasValidShowcaseCookie(request.cookies.get(SHOWCASE_COOKIE_NAME)?.value, config);
  if (!config.enabled || !authed) {
    return NextResponse.json({ success: false, data: null, error: { code: "NOT_AUTHORIZED", message: "未授权" } }, { status: 404 });
  }

  let body: { screenSize?: unknown; viewportSize?: unknown; deviceModel?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const deviceModel = typeof body.deviceModel === "string" ? body.deviceModel.slice(0, 120) : null;
  await recordShowcaseAccess(
    buildShowcaseLogMetadata(request.headers, "page_view", {
      screenSize: normalizeSize(body.screenSize),
      viewportSize: normalizeSize(body.viewportSize),
      deviceModel,
    }),
  ).catch(() => undefined);

  return NextResponse.json({ success: true, data: { ok: true }, error: null });
}
