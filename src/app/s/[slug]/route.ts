import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  await db.shortLink.update({
    where: { id: shortLink.id },
    data: { totalClicks: { increment: 1 } },
  });

  return NextResponse.redirect(shortLink.targetUrl, 302);
}
