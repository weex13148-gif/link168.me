import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, newId, normalizeNullableString, toLinkDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { sanitizePublicUrl, sanitizePhoneNumber, sanitizeMapUrl, sanitizeQrPayload } from "@/lib/public-url-security";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { isModuleType, validateModulePayload } from "@/features/profile-modules/validators";
import { getModuleDefinition } from "@/features/profile-modules/registry";

export const runtime = "nodejs";

const ICON_TYPES = ["default", "emoji", "custom"] as const;
const COMPONENT_TYPES = [
  "link",
  "text",
  "group-title",
  "qr",
  "wechat",
  "phone",
  "shop",
  "booking",
  "product-card",
  "service-card",
  "offer",
  "map",
  "copy-text",
  "cover-image",
  "popup-image",
  "carousel",
  "bilibili-video",
  "youtube-video",
  "video-link",
  "netease-music",
  "music-link",
  "divider",
  "ai-chat",
] as const;

const NEW_MODULE_TYPES = new Set([
  "copy-text",
  "cover-image",
  "popup-image",
  "carousel",
  "bilibili-video",
  "youtube-video",
  "video-link",
  "netease-music",
  "music-link",
  "divider",
  "ai-chat",
  "product-card",
  "service-card",
  "offer",
]);
const TITLE_OPTIONAL_TYPES = new Set([
  "text",
  "group-title",
  ...NEW_MODULE_TYPES,
]);
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;

type CreateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  iconType?: unknown;
  iconValue?: unknown;
  iconUrl?: unknown;
  iconModerationStatus?: unknown;
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

  let body: CreateLinkRequest;
  try {
    body = await request.json() as CreateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const componentType = normalizeComponentType(body.componentType);

  const moduleDef = getModuleDefinition(componentType);
  if (moduleDef && !moduleDef.free) {
    const entitlements = await getUserEntitlements(user.id);
    if (!entitlements.hasActiveMembership && !entitlements.isGracePeriod) {
      return NextResponse.json(
        { success: false, error: "该模块为付费功能，请升级会员后使用。" },
        { status: 403 }
      );
    }
  }

  const isTextOnly = TITLE_OPTIONAL_TYPES.has(componentType);
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
    case "divider": {
      url = "https://link168.me";
      payloadJson = buildPayload(body.payload, {});
      break;
    }
    case "copy-text": {
      url = "https://link168.me";
      payloadJson = buildPayload(body.payload, {});
      break;
    }
    case "ai-chat": {
      url = "https://link168.me";
      payloadJson = buildPayload(body.payload, {});
      break;
    }
    case "cover-image":
    case "popup-image":
    case "carousel":
    case "bilibili-video":
    case "youtube-video":
    case "video-link":
    case "netease-music":
    case "music-link":
    case "product-card":
    case "service-card":
    case "offer": {
      const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
      const cleaned = sanitizePublicUrl(rawUrl);
      url = cleaned.url || "https://link168.me";
      payloadJson = buildPayload(body.payload, { url: cleaned.url || undefined });
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

  if (NEW_MODULE_TYPES.has(componentType) && isModuleType(componentType) && payloadJson) {
    try {
      const parsed = JSON.parse(payloadJson);
      const result = validateModulePayload(componentType, parsed);
      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: result.errors.join("; ") },
          { status: 400 }
        );
      }
      if (result.sanitizedPayload) {
        payloadJson = JSON.stringify(result.sanitizedPayload);
      }
    } catch {
      // 如果 JSON 解析失败，保留原始 payloadJson
    }
  }

  // D15: Offer 有效期服务端校验 — validUntil 如提供必须晚于当前时间
  if (componentType === "offer" && payloadJson) {
    try {
      const parsed = JSON.parse(payloadJson) as { validUntil?: unknown };
      const validUntil = typeof parsed?.validUntil === "string" ? parsed.validUntil.trim() : "";
      if (validUntil) {
        const until = new Date(validUntil);
        if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
          return NextResponse.json(
            { success: false, error: "优惠活动有效期必须晚于当前时间。" },
            { status: 400 }
          );
        }
      }
    } catch {
      // JSON 解析失败已由前面的 validateModulePayload 处理
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
  // D7 写入侧：优先使用前端传递的实际 moderation 结果，否则回退到默认值
  const rawIconModerationStatus = typeof body.iconModerationStatus === "string" ? body.iconModerationStatus.trim() : "";
  const iconModerationStatus = rawIconModerationStatus || (iconType === "custom" && iconUrl ? "pending_manual_review" : "legacy_approved");
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
      iconModerationStatus,
      position,
      isActive: true,
    },
  });

  await revalidatePublicProfileByUser(user.id);

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
