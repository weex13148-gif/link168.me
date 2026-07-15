import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateEventDedupeId,
  generateVisitorId,
  getClientIp,
  hashIp,
  isPotentialBot,
  parseDeviceInfo,
} from "@/lib/analytics/events";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { username } = await context.params;

  try {
    const body = await request.json().catch(() => ({})) as { visitorId?: string; referer?: string };

    const profile = await db.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ success: true });
    }

    const userAgent = request.headers.get("user-agent");
    const referer = body.referer || request.headers.get("referer") || null;
    const ipRaw = getClientIp(request);
    const deviceInfo = parseDeviceInfo(userAgent);
    const ipHash = hashIp(ipRaw).slice(0, 16);
    const botDetected = isPotentialBot(request);
    const browserVisitorId = typeof body.visitorId === "string"
      ? body.visitorId.trim().slice(0, 100)
      : "";
    const visitorId = browserVisitorId || generateVisitorId(request);
    const eventId = generateEventDedupeId("profile-visit", profile.id, visitorId, new Date());

    await db.profileVisit.create({
      data: {
        id: eventId,
        profileId: profile.id,
        visitorId,
        ipHash,
        userAgent: userAgent || null,
        referer: referer || null,
        country: null,
        city: null,
        device: deviceInfo.device,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        isBot: botDetected,
      },
    });
  } catch {
    // 静默失败，不影响响应
  }

  return NextResponse.json({ success: true });
}
