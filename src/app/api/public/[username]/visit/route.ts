import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDeviceInfo, hashIp, getClientIp, isPotentialBot } from "@/lib/analytics/events";
import crypto from "crypto";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ username: string }>;
};

// 简单内存限流：同一 IP 同一主页 5 秒内最多记录 1 次访问
const visitThrottle = new Map<string, number>();
const THROTTLE_MS = 5_000;

function throttleKey(username: string, ipHash: string): string {
  return `${username}:${ipHash}`;
}

function isThrottled(username: string, ipHash: string): boolean {
  const key = throttleKey(username, ipHash);
  const last = visitThrottle.get(key);
  const now = Date.now();
  if (last && now - last < THROTTLE_MS) return true;
  visitThrottle.set(key, now);
  // 定期清理旧条目，防止内存无限增长
  if (visitThrottle.size > 10_000) {
    const cutoff = now - THROTTLE_MS * 2;
    for (const [k, v] of visitThrottle) {
      if (v < cutoff) visitThrottle.delete(k);
    }
  }
  return false;
}

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

    // 限流检查：同一 IP 短时间内重复访问不记录
    if (isThrottled(username.toLowerCase(), ipHash)) {
      return NextResponse.json({ success: true });
    }

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
  } catch {
    // 静默失败，不影响响应
  }

  return NextResponse.json({ success: true });
}
