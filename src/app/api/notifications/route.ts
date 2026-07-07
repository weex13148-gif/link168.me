import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getNotifications, getNotificationSummary } from "@/lib/notifications/store";
import type { NotificationType } from "@/lib/notifications/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireAuthenticatedUser(request);
  if (response || !user) return response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as NotificationType | null;
  const summaryOnly = searchParams.get("summary") === "true";

  if (summaryOnly) {
    const summary = getNotificationSummary(user.id);
    return NextResponse.json({ success: true, data: summary });
  }

  const notifications = getNotifications(user.id, type || undefined);
  return NextResponse.json({
    success: true,
    data: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actionUrl: n.actionUrl,
    })),
  });
}
