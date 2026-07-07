import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { markAllAsRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response || !user) return response;

  const count = markAllAsRead(user.id);
  return NextResponse.json({ success: true, data: { markedCount: count } });
}
