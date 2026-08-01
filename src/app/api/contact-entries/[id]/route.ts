import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { createContactEntryPayload, CONTACT_ENTRY_TYPE, contactChannelLabel } from "@/lib/contact-entries";
import { isUuid } from "@/lib/contact-entry-domain";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { getOwnedProfile } from "@/lib/dashboard-data";
import { db } from "@/lib/db";
import { assertWorkspaceMember } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function resolveEntryAccess(entry: { profileId: string; workspaceId: string | null }, userId: string) {
  if (entry.workspaceId) {
    const access = await assertWorkspaceMember(entry.workspaceId, userId, { minRole: "admin", requireActive: true });
    return access.allowed ? null : NextResponse.json({ success: false, error: access.message, code: access.code }, { status: 403 });
  }

  const profile = await getOwnedProfile(userId);
  if (!profile || profile.id !== entry.profileId) {
    return NextResponse.json({ success: false, error: "无权管理该联系入口。" }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: "联系入口不存在。" }, { status: 404 });
  const entry = await db.link.findFirst({
    where: { id, type: CONTACT_ENTRY_TYPE },
    include: { profile: { select: { userId: true } } },
  });
  if (!entry) return NextResponse.json({ success: false, error: "联系入口不存在。" }, { status: 404 });

  const denied = await resolveEntryAccess(entry, user.id);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const existingPayload = createContactEntryPayload({
    channel: (() => {
      try { return JSON.parse(entry.payloadJson || "{}").channel; } catch { return undefined; }
    })(),
    targetUrl: entry.url,
  }).payload;
  const contact = createContactEntryPayload({
    channel: body.channel ?? existingPayload?.channel,
    targetUrl: body.targetUrl ?? existingPayload?.targetUrl,
  });
  if (!contact.payload) return NextResponse.json({ success: false, error: contact.error }, { status: 400 });

  const title = body.title === undefined
    ? entry.title
    : sanitizePublicText(text(body.title, 60)) || `${contactChannelLabel(contact.payload.channel)}联系`;
  const description = body.description === undefined
    ? entry.description
    : sanitizePublicText(text(body.description, 200)) || null;
  if (hasSensitiveContent(`${title}\n${description || ""}`).detected) {
    return NextResponse.json({ success: false, error: "联系入口文案包含受限关键词，请修改后再试。" }, { status: 400 });
  }

  const updated = await db.link.update({
    where: { id: entry.id },
    data: {
      title,
      description,
      url: contact.payload.targetUrl,
      payloadJson: JSON.stringify(contact.payload),
      iconValue: contact.payload.channel === "wecom" ? "wecom" : "wechat",
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  await revalidatePublicProfileByUser(entry.profile.userId);
  return NextResponse.json({ success: true, entry: updated });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: "联系入口不存在。" }, { status: 404 });
  const entry = await db.link.findFirst({
    where: { id, type: CONTACT_ENTRY_TYPE },
    include: { profile: { select: { userId: true } } },
  });
  if (!entry) return NextResponse.json({ success: false, error: "联系入口不存在。" }, { status: 404 });

  const denied = await resolveEntryAccess(entry, user.id);
  if (denied) return denied;

  await db.link.delete({ where: { id: entry.id } });
  await revalidatePublicProfileByUser(entry.profile.userId);
  return NextResponse.json({ success: true });
}
