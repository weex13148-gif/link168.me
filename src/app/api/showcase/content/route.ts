import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SHOWCASE_COOKIE_NAME,
  buildShowcaseLogMetadata,
  getShowcaseConfig,
  hasValidShowcaseCookie,
  recordShowcaseAccess,
} from "@/lib/showcase";
import { buildShowcaseV2PublicPayload } from "@/lib/showcase-v2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = await getShowcaseConfig();
  const cookieStore = await cookies();
  const authed = hasValidShowcaseCookie(cookieStore.get(SHOWCASE_COOKIE_NAME)?.value, config);

  if (!config.enabled) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, "disabled")).catch(() => undefined);
    return NextResponse.json(
      { success: false, data: null, error: { code: "SHOWCASE_DISABLED", message: "比赛展示中心暂未启用" } },
      { status: 403 },
    );
  }
  if (!authed) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, "password_required")).catch(() => undefined);
    return NextResponse.json(
      { success: false, data: null, error: { code: "PASSWORD_REQUIRED", message: "需要输入比赛访问密码" } },
      { status: 401 },
    );
  }

  await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, "authorized_page")).catch(() => undefined);
  const payload = await buildShowcaseV2PublicPayload();
  return NextResponse.json({ success: true, data: payload, error: null });
}
