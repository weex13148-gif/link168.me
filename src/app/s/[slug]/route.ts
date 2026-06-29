import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isPlaceholderHandle } from "@/lib/handle";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function getSafeTarget(value: string): URL | null {
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
  const { slug } = await context.params;

  const shortLink = await db.shortLink.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          profile: { select: { isPublic: true, username: true } },
        },
      },
    },
  });

  const target = shortLink ? getSafeTarget(shortLink.targetUrl) : null;
  const profile = shortLink?.user.profile;
  if (!shortLink || !profile?.isPublic || isPlaceholderHandle(profile.username) || !target) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const clickRl = rateLimit(request, `short-link-click:${slug}`, 5, 1000);
  if (clickRl.passed) {
    try {
      await db.shortLink.update({
        where: { id: shortLink.id },
        data: { totalClicks: { increment: 1 } },
      });
    } catch {
      // 计数失败不影响正常跳转。
    }
  }

  return NextResponse.redirect(target, 302);
}
