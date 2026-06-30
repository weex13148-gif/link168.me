import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, normalizeNullableString, toLinkDto } from "@/lib/dashboard-data";
import { sanitizePublicUrl, sanitizePhoneNumber, sanitizeMapUrl, sanitizeQrPayload } from "@/lib/public-url-security";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const ICON_TYPES = ["default", "emoji", "custom"] as const;
const COMPONENT_TYPES = ["link", "text", "group-title", "qr", "wechat", "phone", "shop", "booking", "map"] as const;

type UpdateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  isActive?: unknown;
  iconType?: unknown;
  iconValue?: unknown;
  iconUrl?: unknown;
  componentType?: unknown;
  payload?: unknown;
};

function normalizeComponentType(raw: unknown): string {
  if (typeof raw !== "string") return "link";
  const trimmed = raw.trim().toLowerCase();
  return (COMPONENT_TYPES as readonly string[]).includes(trimmed) ? trimmed : "link";
}

function buildPayload(componentType: string, raw: unknown, extra: { phone?: string; wechat?: string }): string | null {
  try {
    const obj: Record<string, unknown> = {};
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") Object.assign(obj, parsed);
      } catch {
        obj.raw = raw.trim();
      }
    }
    if (extra.phone) obj.phone = extra.phone;
    if (extra.wechat) obj.wechat = extra.wechat;
    if (Object.keys(obj).length === 0) return null;
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  let body: UpdateLinkRequest;
  try { body = (await request.json()) as UpdateLinkRequest; } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = await context.params;
  const existing = await db.link.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });

  const componentType = body.componentType !== undefined ? normalizeComponentType(body.componentType) : existing.type;
  const rawTitle = typeof body.title === "string" ? body.title.trim() : existing.title;
  if (!rawTitle) return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });

  // V2-002: URL 协议白名单。根据组件类型选择不同的安全函数。
  let url = existing.url;
  const rawUrl = typeof body.url === "string" ? body.url : "";

  if (componentType === "phone") {
    const phoneInput = rawUrl && rawUrl.toLowerCase().startsWith("tel:") ? rawUrl.replace(/^tel:/i, "") : rawUrl;
    const cleaned = sanitizePhoneNumber(phoneInput);
    if (!cleaned.safe || !cleaned.phone) {
      return NextResponse.json({ success: false, error: "Invalid phone format." }, { status: 400 });
    }
    url = `tel:${cleaned.phone}`;
  } else if (componentType === "map") {
    const cleaned = sanitizeMapUrl(rawUrl);
    if (!cleaned.safe || !cleaned.url) {
      return NextResponse.json({ success: false, error: "Invalid map URL." }, { status: 400 });
    }
    url = cleaned.url;
  } else if (componentType === "qr") {
    const cleaned = sanitizeQrPayload(rawUrl);
    if (!cleaned.safe || !cleaned.payload) {
      return NextResponse.json({ success: false, error: "Invalid QR URL." }, { status: 400 });
    }
    url = cleaned.payload;
  } else if (!["text", "group-title", "wechat"].includes(componentType)) {
    const cleaned = sanitizePublicUrl(rawUrl);
    if (!cleaned.safe || !cleaned.url) {
      return NextResponse.json({ success: false, error: "Invalid URL." }, { status: 400 });
    }
    url = cleaned.url;
  }

  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : existing.iconType;
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji" ? (body.iconValue !== undefined ? normalizeNullableString(body.iconValue) : existing.iconValue) : null;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : existing.iconUrl || "";
  const iconUrl = iconType === "custom" ? sanitizePublicUrl(iconUrlRaw).url : null;

  const payloadJson = body.payload !== undefined
    ? buildPayload(componentType, body.payload, {
        phone: componentType === "phone" && url ? url.replace(/^tel:/i, "") : undefined,
        wechat: componentType === "wechat" && rawUrl ? rawUrl : undefined,
      })
    : existing.payloadJson;

  await db.link.update({
    where: { id },
    data: {
      type: componentType,
      payloadJson,
      title: rawTitle,
      url,
      description: body.description !== undefined ? normalizeNullableString(body.description) : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      iconType,
      iconValue,
      iconUrl,
    },
  });

  const link = await db.link.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ success: true, link: toLinkDto(link) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  const { id } = await context.params;
  const result = await db.link.deleteMany({ where: { id, profileId: profile.id } });
  if (result.count === 0) return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
