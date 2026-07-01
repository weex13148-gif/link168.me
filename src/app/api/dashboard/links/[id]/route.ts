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
  const value = raw.trim().toLowerCase();
  return (COMPONENT_TYPES as readonly string[]).includes(value) ? value : "link";
}

function buildPayload(raw: unknown, extra: { phone?: string; wechat?: string }): string | null {
  try {
    const object: Record<string, unknown> = {};
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") Object.assign(object, parsed);
      } catch {
        object.raw = raw.trim();
      }
    }
    if (extra.phone) object.phone = extra.phone;
    if (extra.wechat) object.wechat = extra.wechat;
    return Object.keys(object).length ? JSON.stringify(object) : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "没有找到当前用户的主页资料。" }, { status: 404 });

  let body: UpdateLinkRequest;
  try {
    body = (await request.json()) as UpdateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const { id } = await context.params;
  const existing = await db.link.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return NextResponse.json({ success: false, error: "没有找到这条链接。" }, { status: 404 });

  const componentType = body.componentType !== undefined ? normalizeComponentType(body.componentType) : existing.type;
  const title = typeof body.title === "string" ? body.title.trim() : existing.title;
  if (!title) return NextResponse.json({ success: false, error: "请填写链接标题。" }, { status: 400 });

  let url = existing.url;
  const rawUrl = typeof body.url === "string" ? body.url.trim() : existing.url;

  if (componentType === "phone") {
    const phoneInput = rawUrl.toLowerCase().startsWith("tel:") ? rawUrl.replace(/^tel:/i, "") : rawUrl;
    const cleaned = sanitizePhoneNumber(phoneInput);
    if (!cleaned.safe || !cleaned.phone) {
      return NextResponse.json({ success: false, error: "请输入有效的电话号码。" }, { status: 400 });
    }
    url = cleaned.telUrl || `tel:${cleaned.phone}`;
  } else if (componentType === "map") {
    const cleaned = sanitizeMapUrl(rawUrl);
    if (!cleaned.safe || !cleaned.url) {
      return NextResponse.json({ success: false, error: "地图链接仅支持高德、百度、腾讯、谷歌或苹果地图。" }, { status: 400 });
    }
    url = cleaned.url;
  } else if (componentType === "qr") {
    const cleaned = sanitizeQrPayload(rawUrl);
    if (!cleaned.safe || !cleaned.payload) {
      return NextResponse.json({ success: false, error: "二维码内容或链接格式不正确。" }, { status: 400 });
    }
    url = cleaned.payload;
  } else if (!['text', 'group-title', 'wechat'].includes(componentType)) {
    const cleaned = sanitizePublicUrl(rawUrl);
    if (!cleaned.safe || !cleaned.url) {
      return NextResponse.json(
        { success: false, error: "链接格式异常，请填写完整的网址，例如 https://example.com。" },
        { status: 400 },
      );
    }
    url = cleaned.url;
  }

  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : existing.iconType;
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji"
    ? (body.iconValue !== undefined ? normalizeNullableString(body.iconValue) : existing.iconValue)
    : null;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : existing.iconUrl || "";
  const iconUrl = iconType === "custom" ? sanitizePublicUrl(iconUrlRaw).url : null;

  const payloadJson = body.payload !== undefined
    ? buildPayload(body.payload, {
        phone: componentType === "phone" && url ? url.replace(/^tel:/i, "") : undefined,
        wechat: componentType === "wechat" && rawUrl ? rawUrl : undefined,
      })
    : existing.payloadJson;

  const link = await db.link.update({
    where: { id },
    data: {
      type: componentType,
      payloadJson,
      title,
      url,
      description: body.description !== undefined ? normalizeNullableString(body.description) : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      iconType,
      iconValue,
      iconUrl,
    },
  });

  return NextResponse.json({ success: true, link: toLinkDto(link) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "没有找到当前用户的主页资料。" }, { status: 404 });

  const { id } = await context.params;
  const deleted = await db.link.deleteMany({ where: { id, profileId: profile.id } });
  if (!deleted.count) return NextResponse.json({ success: false, error: "没有找到这条链接。" }, { status: 404 });
  return NextResponse.json({ success: true });
}
