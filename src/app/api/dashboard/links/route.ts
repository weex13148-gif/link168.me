import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, newId, normalizeNullableString, toLinkDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { sanitizePublicUrl, sanitizePhoneNumber, sanitizeMapUrl, sanitizeQrPayload } from "@/lib/public-url-security";
import { getUserEntitlements } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

const ICON_TYPES = ["default", "emoji", "custom"] as const;
const COMPONENT_TYPES = ["link", "text", "group-title", "qr", "wechat", "phone", "shop", "booking", "map"] as const;
const TEXT_ONLY_TYPES = new Set(["text", "group-title"]);
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;
const FREE_LINK_LIMIT = 10;

type CreateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
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

function buildPayload(raw: unknown, extra: { phone?: string; wechat?: string; map?: string; qr?: string; url?: string }): string | null {
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
    if (extra.map) object.map = extra.map;
    if (extra.qr) object.qr = extra.qr;
    if (extra.url) object.url = extra.url;
    return Object.keys(object).length ? JSON.stringify(object) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "没有找到当前用户的主页资料。" }, { status: 404 });

  const entitlements = await getUserEntitlements(user.id);
  const currentLinkCount = await db.link.count({ where: { profileId: profile.id } });
  if (entitlements.planCode === "free" && currentLinkCount >= FREE_LINK_LIMIT) {
    return NextResponse.json({
      success: false,
      error: `免费版最多可创建 ${FREE_LINK_LIMIT} 个链接，当前已有 ${currentLinkCount} 个。升级会员可解锁更多链接。`,
      upgradeRequired: true,
      limit: FREE_LINK_LIMIT,
      used: currentLinkCount,
    }, { status: 403 });
  }

  let body: CreateLinkRequest;
  try {
    body = await request.json() as CreateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const componentType = normalizeComponentType(body.componentType);
  const isTextOnly = TEXT_ONLY_TYPES.has(componentType);
  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const title = sanitizePublicText(rawTitle) ?? "";

  if (!isTextOnly && !title) return NextResponse.json({ success: false, error: "请填写链接标题。" }, { status: 400 });
  if (title.length > MAX_TITLE_LENGTH) return NextResponse.json({ success: false, error: `标题不能超过 ${MAX_TITLE_LENGTH} 字。` }, { status: 400 });
  if (title && hasSensitiveContent(title).detected) return NextResponse.json({ success: false, error: "标题包含受限关键词，请修改后再试。" }, { status: 400 });

  let url = "";
  let payloadJson: string | null = null;

  switch (componentType) {
    case "phone": {
      const rawPhone = typeof body.url === "string" ? body.url : "";
      const cleaned = sanitizePhoneNumber(rawPhone.replace(/^tel:/i, ""));
      if (!cleaned.safe || !cleaned.phone) return NextResponse.json({ success: false, error: "请输入有效的电话号码。" }, { status: 400 });
      url = cleaned.telUrl || `tel:${cleaned.phone}`;
      payloadJson = buildPayload(body.payload, { phone: cleaned.phone });
      break;
    }
    case "map": {
      const rawMap = typeof body.url === "string" ? body.url.trim() : "";
      const cleaned = sanitizeMapUrl(rawMap);
      if (!cleaned.safe || !cleaned.url) return NextResponse.json({ success: false, error: "地图链接仅支持高德、百度、腾讯、谷歌或苹果地图。" }, { status: 400 });
      url = cleaned.url;
      payloadJson = buildPayload(body.payload, { map: cleaned.url });
      break;
    }
    case "qr": {
      const rawQr = typeof body.url === "string" ? body.url.trim() : typeof body.payload === "string" ? body.payload.trim() : "";
      const cleaned = sanitizeQrPayload(rawQr);
      if (!cleaned.safe || !cleaned.payload) return NextResponse.json({ success: false, error: "二维码内容或链接格式不正确。" }, { status: 400 });
      url = /^https?:\/\//i.test(cleaned.payload) ? cleaned.payload : "https://link168.me";
      payloadJson = buildPayload(body.payload, { qr: cleaned.payload, url: /^https?:\/\//i.test(cleaned.payload) ? cleaned.payload : undefined });
      break;
    }
    case "wechat": {
      const wechat = typeof body.url === "string" ? body.url.trim() : "";
      if (!wechat) return NextResponse.json({ success: false, error: "请输入微信号或名称。" }, { status: 400 });
      url = "https://link168.me";
      payloadJson = buildPayload(body.payload, { wechat });
      break;
    }
    case "text":
    case "group-title": {
      url = "https://link168.me";
      payloadJson = buildPayload(body.payload, {});
      break;
    }
    default: {
      const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
      const cleaned = sanitizePublicUrl(rawUrl);
      if (!cleaned.safe || !cleaned.url) {
        return NextResponse.json({ success: false, error: "链接格式异常，请填写完整的网址，例如 https://example.com。" }, { status: 400 });
      }
      url = cleaned.url;
      payloadJson = buildPayload(body.payload, { url: cleaned.url });
    }
  }

  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : "default";
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji" ? normalizeNullableString(body.iconValue) : null;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : "";
  const iconUrl = iconType === "custom" ? sanitizePublicUrl(iconUrlRaw).url : null;

  const rawDescription = typeof body.description === "string" ? body.description : "";
  const description = sanitizePublicText(rawDescription);
  if (description && description.length > MAX_DESCRIPTION_LENGTH) return NextResponse.json({ success: false, error: `描述不能超过 ${MAX_DESCRIPTION_LENGTH} 字。` }, { status: 400 });
  if (description && hasSensitiveContent(description).detected) return NextResponse.json({ success: false, error: "描述包含受限关键词，请修改后再试。" }, { status: 400 });

  const position = await db.link.count({ where: { profileId: profile.id } });
  const link = await db.link.create({
    data: {
      id: newId(),
      profileId: profile.id,
      type: componentType,
      payloadJson,
      title: title || componentType,
      url,
      description,
      iconType,
      iconValue,
      iconUrl,
      position,
      isActive: true,
    },
  });

  return NextResponse.json({ success: true, link: toLinkDto(link) });
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "没有找到当前用户的主页资料。" }, { status: 404 });
  const links = await db.link.findMany({ where: { profileId: profile.id }, orderBy: [{ isActive: "desc" }, { position: "asc" }] });
  return NextResponse.json({ success: true, links: links.map(toLinkDto) });
}
