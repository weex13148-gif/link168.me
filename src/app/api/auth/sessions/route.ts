import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireUser, getUserSessions, revokeSession, revokeAllOtherSessions, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

function parseUserAgentInfo(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "未知设备", browser: "未知浏览器" };

  let device = "其他设备";
  if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS 设备";
  else if (/Android/i.test(ua)) device = "安卓设备";
  else if (/Windows NT/i.test(ua)) device = "Windows 电脑";
  else if (/Macintosh|Mac OS X|Mac OS/i.test(ua)) device = "Mac 电脑";
  else if (/Linux/i.test(ua)) device = "Linux 设备";

  let browser = "未知浏览器";
  if (/Edg|EdgA/i.test(ua)) browser = "Edge";
  else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";

  return { device, browser };
}

function maskIpAddress(value: string | null) {
  if (!value) return "未知";
  if (value.includes(".")) {
    const parts = value.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.*` : "已记录";
  }
  if (value.includes(":")) {
    return `${value.split(":").slice(0, 4).join(":")}::*`;
  }
  return "已记录";
}

function getCurrentToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
}

export async function GET(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const sessions = await getUserSessions(user.id);
  const currentToken = getCurrentToken(request);
  const currentHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : "";

  const data = sessions.map((session) => {
    const info = parseUserAgentInfo(session.userAgent || null);
    return {
      id: session.id,
      device: info.device,
      browser: info.browser,
      location: maskIpAddress(session.ipAddress),
      lastActive: session.lastActive.toISOString(),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.tokenHash === currentHash,
    };
  });

  return NextResponse.json({ success: true, sessions: data });
}

export async function DELETE(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const action = new URL(request.url).searchParams.get("action");
  if (action === "all-others") {
    const currentToken = getCurrentToken(request);
    if (!currentToken) {
      return NextResponse.json({ success: false, error: "当前会话无效，请重新登录。" }, { status: 401 });
    }
    const count = await revokeAllOtherSessions(user.id, currentToken);
    return NextResponse.json({ success: true, message: `已退出 ${count} 个其他设备。` });
  }

  let body: { sessionId?: unknown };
  try {
    body = (await request.json()) as { sessionId?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "缺少会话 ID。" }, { status: 400 });
  }

  const success = await revokeSession(user.id, sessionId);
  if (!success) {
    return NextResponse.json({ success: false, error: "未找到该会话。" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "已退出该设备。" });
}
