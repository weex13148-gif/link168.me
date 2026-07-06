import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { markAsRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response || !user) return response;

  const { id } = await context.params;
  const ok = markAsRead(user.id, id);

  if (!ok) {
    return NextResponse.json({ success: false, error: "通知不存在。" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
