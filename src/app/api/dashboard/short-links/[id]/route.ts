import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { id } });
  if (!shortLink) {
    return NextResponse.json({ success: false, error: "Short link not found." }, { status: 404 });
  }

  if (shortLink.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  await db.shortLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
