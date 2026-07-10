import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDeviceInfo, hashIp, getClientIp, isPotentialBot } from "@/lib/analytics/events";
import crypto from "crypto";

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

    await db.profileVisit.create({
      data: {
        id: crypto.randomUUID(),
        profileId: profile.id,
        visitorId: body.visitorId || null,
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
  } catch (err) {
    console.error("[profile-visit] 记录访问失败:", username, err && typeof err === "object" && "message" in err ? (err as Error).message : String(err));
  }

  return NextResponse.json({ success: true });
}
