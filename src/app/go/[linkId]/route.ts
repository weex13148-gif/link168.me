import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { isPlaceholderHandle } from "@/lib/handle";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ linkId: string }>;
};

function parseDeviceOsBrowser(userAgent: string | null): { device: string; os: string; browser: string } {
  const ua = (userAgent || "").toLowerCase();

  let device = "desktop";
  if (/mobile|android|iphone|ipod|windows phone|opera mini|webos/i.test(ua)) {
    device = "mobile";
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device = "tablet";
  }

  let os = "unknown";
  if (/windows/i.test(ua)) os = "windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macos";
  else if (/android/i.test(ua)) os = "android";
  else if (/iphone|ipad|ipod|ios/i.test(ua)) os = "ios";
  else if (/linux/i.test(ua)) os = "linux";

  let browser = "unknown";
  if (/edg\//i.test(ua)) browser = "edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "opera";
  else if (/firefox\//i.test(ua)) browser = "firefox";
  else if (/chrome\//i.test(ua)) browser = "chrome";
  else if (/safari\//i.test(ua) || /version\/.*safari/i.test(ua)) browser = "safari";
  else if (/msie|trident/i.test(ua)) browser = "ie";

  return { device, os, browser };
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getSafeTargetUrl(value: string): URL | null {
  try {
    const target = new URL(value);
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;
    if (!target.hostname || target.username || target.password) return null;
    return target;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { linkId } = await context.params;

  const link = await db.link.findUnique({
    where: { id: linkId, isActive: true },
    include: {
      profile: {
        select: { isPublic: true, username: true },
      },
    },
  });

  const target = link ? getSafeTargetUrl(link.url) : null;
  if (!link || !link.profile.isPublic || isPlaceholderHandle(link.profile.username) || !target) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const userAgent = request.headers.get("user-agent");
  const referer = request.headers.get("referer") || null;
  const ipHash = hashIp(getClientIp(request));
  const { device, os, browser } = parseDeviceOsBrowser(userAgent);

  await db.$transaction([
    db.linkClick.create({
      data: {
        id: crypto.randomUUID(),
        linkId: link.id,
        profileId: link.profileId,
        device,
        os,
        browser,
        referer,
        ipHash,
      },
    }),
    db.link.update({
      where: { id: link.id },
      data: { totalClicks: { increment: 1 } },
    }),
  ]);

  return NextResponse.redirect(target, 302);
}
