import { NextResponse } from "next/server";
import { getActiveRestrictions, canShowPublicProfile } from "@/lib/auth";
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
  params: Promise<{ linkId: string }>;
};

const CONTACT_TYPES = ["phone", "email", "wechat"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function POST(request: Request, context: RouteContext) {
  const { linkId } = await context.params;
  if (!UUID_PATTERN.test(linkId)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const link = await db.link.findFirst({
    where: {
      id: linkId,
      isActive: true,
      type: { in: [...CONTACT_TYPES] },
    },
    select: {
      id: true,
      profileId: true,
      profile: { select: { isPublic: true, userId: true } },
    },
  });

  if (!link?.profile.isPublic) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const owner = await db.user.findUnique({
    where: { id: link.profile.userId },
    select: { emailVerified: true },
  });
  if (!owner?.emailVerified) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  try {
    const restrictions = await getActiveRestrictions(link.profile.userId);
    if (!canShowPublicProfile(restrictions).ok) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  if (isPotentialBot(request)) {
    return NextResponse.json({ success: true, recorded: false, bot: true });
  }

  const body = await request.json().catch(() => ({})) as { visitorId?: unknown };
  const browserVisitorId = typeof body.visitorId === "string"
    ? body.visitorId.trim().slice(0, 100)
    : "";
  const visitorId = `${generateVisitorId(request)}:${browserVisitorId}`;
  const eventId = generateEventDedupeId(`contact:${link.id}`, link.profileId, visitorId, new Date());
  const device = parseDeviceInfo(request.headers.get("user-agent"));

  try {
    await db.$transaction(async (tx) => {
      await tx.linkClick.create({
        data: {
          id: eventId,
          linkId: link.id,
          profileId: link.profileId,
          device: device.device,
          os: device.os,
          browser: device.browser,
          referer: request.headers.get("referer") || null,
          ipHash: hashIp(getClientIp(request)),
        },
      });
      await tx.link.update({
        where: { id: link.id },
        data: { totalClicks: { increment: 1 } },
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return NextResponse.json({ success: true, recorded: false, deduplicated: true });
    }
    return NextResponse.json(
      { success: false, error: "Unable to record interaction" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, recorded: true });
}
