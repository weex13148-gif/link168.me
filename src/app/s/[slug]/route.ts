import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { slug } });
  if (!shortLink) {
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
      // 静默失败：避免计数问题影响用户跳转
    }
  }

  return NextResponse.redirect(shortLink.targetUrl, 302);
}
