import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, normalizeNullableString, toLinkDto } from "@/lib/dashboard-data";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { sanitizePublicUrl, sanitizePhoneNumber, sanitizeMapUrl, sanitizeQrPayload } from "@/lib/public-url-security";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { isModuleType, validateModulePayload } from "@/features/profile-modules/validators";
import { getModuleDefinition } from "@/features/profile-modules/registry";
import { allowedIconTypes, normalizePlatformIconKey } from "@/lib/link-icons";
import { collectManagedMediaUrls } from "@/lib/owned-media";
import { cleanupOwnedMediaUrls } from "@/lib/owned-media-lifecycle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const ICON_TYPES = allowedIconTypes;
const COMPONENT_TYPES = [
  "link",
  "text",
  "group-title",
  "qr",
  "wechat",
  "phone",
  "email",
  "address",
  "shop",
  "booking",
  "product-card",
  "service-card",
  "offer",
  "quote",
  "contact-form",
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
  "quote",
  "contact-form",
]);
const TITLE_OPTIONAL_TYPES = new Set([
  "text",
  "group-title",
  ...NEW_MODULE_TYPES,
]);

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

  if (body.componentType !== undefined) {
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
  }

  const title = (typeof body.title === "string" ? body.title.trim() : existing.title) || (TITLE_OPTIONAL_TYPES.has(componentType) ? componentType : "");
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
  } else if (['text', 'group-title', 'wechat', 'divider', 'copy-text', 'ai-chat'].includes(componentType)) {
    // 这些类型不需要 url 校验
  } else if (NEW_MODULE_TYPES.has(componentType)) {
    const cleaned = sanitizePublicUrl(rawUrl);
    url = cleaned.url || "https://link168.me";
  } else {
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
  const platformIconValue = iconType === "platform"
    ? normalizePlatformIconKey(body.iconValue !== undefined ? body.iconValue : existing.iconValue)
    : null;
  if (iconType === "platform" && !platformIconValue) {
    return NextResponse.json({ success: false, error: "请选择支持的平台图标。" }, { status: 400 });
  }
  const iconValue = iconType === "emoji"
    ? (body.iconValue !== undefined ? normalizeNullableString(body.iconValue) : existing.iconValue)
    : platformIconValue;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : existing.iconUrl || "";
  const iconUrl = iconType === "custom" ? sanitizePublicUrl(iconUrlRaw).url : null;

  let payloadJson = body.payload !== undefined
    ? buildPayload(body.payload, {
        phone: componentType === "phone" && url ? url.replace(/^tel:/i, "") : undefined,
        wechat: componentType === "wechat" && rawUrl ? rawUrl : undefined,
      })
    : existing.payloadJson;

  if (body.payload !== undefined && NEW_MODULE_TYPES.has(componentType) && isModuleType(componentType) && payloadJson) {
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
      // D7 写入侧：自定义图标 URL 变更时重置为 pending_manual_review，等待人工审核
      ...(iconType === "custom" && iconUrl && iconUrl !== existing.iconUrl
        ? { iconModerationStatus: "pending_manual_review" as const }
        : {}),
    },
  });

  const previousMediaUrls = collectManagedMediaUrls(existing.iconUrl, existing.payloadJson);
  const currentMediaUrls = collectManagedMediaUrls(link.iconUrl, link.payloadJson);
  const staleMediaUrls = [...previousMediaUrls].filter((urlValue) => !currentMediaUrls.has(urlValue));
  const mediaCleanup = await cleanupOwnedMediaUrls(staleMediaUrls, profile.id);

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({
    success: true,
    link: toLinkDto(link),
    mediaCleanup,
    mediaCleanupOk: mediaCleanup.every((result) => result.status !== "failed"),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "没有找到当前用户的主页资料。" }, { status: 404 });

  const { id } = await context.params;
  const existing = await db.link.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) return NextResponse.json({ success: false, error: "没有找到这条链接。" }, { status: 404 });

  const deleted = await db.link.deleteMany({ where: { id, profileId: profile.id } });
  if (!deleted.count) return NextResponse.json({ success: false, error: "没有找到这条链接。" }, { status: 404 });

  const mediaCleanup = await cleanupOwnedMediaUrls(
    collectManagedMediaUrls(existing.iconUrl, existing.payloadJson),
    profile.id,
  );

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({
    success: true,
    mediaCleanup,
    mediaCleanupOk: mediaCleanup.every((result) => result.status !== "failed"),
  });
}
