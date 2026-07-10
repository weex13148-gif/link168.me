import { NextRequest, NextResponse } from "next/server";
import {
  SHOWCASE_COOKIE_NAME,
  buildShowcaseLogMetadata,
  createShowcaseCookieValue,
  getShowcaseConfig,
  recordShowcaseAccess,
  verifyShowcasePassword,
} from "@/lib/showcase";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const config = await getShowcaseConfig();
  if (!config.enabled) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, "disabled")).catch(() => undefined);
    return apiError("SHOWCASE_DISABLED", "比赛展示中心暂未启用", 403);
  }
  if (!config.passwordHash) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, "password_not_set")).catch(() => undefined);
    return apiError("PASSWORD_NOT_SET", "比赛访问密码尚未配置", 503);
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  const password = typeof body.password === "string" ? body.password : "";
  const ok = await verifyShowcasePassword(password, config);
  await recordShowcaseAccess(buildShowcaseLogMetadata(request.headers, ok ? "success" : "wrong_password")).catch(() => undefined);

  if (!ok) {
    return apiError("BAD_PASSWORD", "访问密码不正确，可以立即重试", 401);
  }

  const response = NextResponse.json({ success: true, data: { ok: true }, error: null });
  response.cookies.set({
    name: SHOWCASE_COOKIE_NAME,
    value: createShowcaseCookieValue(config.passwordHash),
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: "/showcase",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
