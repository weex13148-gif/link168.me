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

// ===== 免费用户链接数量限制 =====
// 免费版：最多 10 个链接（合理上限，防止滥用）
// 会员版：暂不限制（后续可在套餐定义中配置）
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

function buildPayload(componentType: string, raw: unknown, extra: { phone?: string; wechat?: string; map?: string; qr?: string; url?: string }): string | null {
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
    if (extra.map) obj.map = extra.map;
    if (extra.qr) obj.qr = extra.qr;
    if (extra.url) obj.url = extra.url;
    if (Object.keys(obj).length === 0) return null;
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) return NextResponse.json({ success: false, error: "请先创建个人资料。" }, { status: 400 });

  // ===== P0: 服务端校验链接数量上限（防止免费用户绕过前端限制）=====
  const entitlements = await getUserEntitlements(user.id);
  const currentLinkCount = await db.link.count({ where: { profileId: profile.id } });
  
  // 免费用户限制
  if (entitlements.planCode === "free" && currentLinkCount >= FREE_LINK_LIMIT) {
    return NextResponse.json(
      { 
        success: false, 
        error: `免费版最多可创建 ${FREE_LINK_LIMIT} 个链接，当前已有 ${currentLinkCount} 个。升级会员可解锁更多。`,
        upgradeRequired: true,
        limit: FREE_LINK_LIMIT,
        used: currentLinkCount,
      },
      { status: 403 },
    );
  }

  let body: CreateLinkRequest;
  try {
    body = (await request.json()) as CreateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const componentType = normalizeComponentType(body.componentType);
  const isTextOnly = TEXT_ONLY_TYPES.has(componentType);

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const titleSafe = sanitizePublicText(rawTitle) ?? "";
  if (!isTextOnly && !titleSafe) return NextResponse.json({ success: false, error: "请输入标题。" }, { status: 400 });
  if (titleSafe.length > MAX_TITLE_LENGTH) return NextResponse.json({ success: false, error: `标题不能超过 ${MAX_TITLE_LENGTH} 字。` }, { status: 400 });
  if (titleSafe) {
    const titleSensitive = hasSensitiveContent(titleSafe);
    if (titleSensitive.detected) return NextResponse.json({ success: false, error: "标题包含受限关键词，请修改后再试。" }, { status: 400 });
  }

  // URL 安全校验：根据类型分策略
  let url: string = "";
  let payloadJson: string | null = null;

  switch (componentType) {
    case "phone": {
      const rawPhone = typeof body.url === "string" ? body.url : "";
      const cleaned = sanitizePhoneNumber(rawPhone.startsWith("tel:") ? rawPhone.replace(/^tel:/i, "") : rawPhone);
      if (!cleaned.safe || !cleaned.phone) return NextResponse.json({ success: false, error: "请输入有效的电话号码。" }, { status: 400 });
      url = cleaned.telUrl || `tel:${cleaned.phone}`;
      payloadJson = buildPayload(componentType, body.payload, { phone: cleaned.phone });
      break;
    }
    case "map": {
      const rawMap = typeof body.url === "string" ? body.url.trim() : "";
      if (!rawMap) return NextResponse.json({ success: false, error: "请输入有效的地图链接。" }, { status: 400 });
      const cleaned = sanitizeMapUrl(rawMap);
      if (!cleaned.safe || !cleaned.url) return NextResponse.json({ success: false, error: "地图链接只允许高德、百度、谷歌或苹果地图。" }, { status: 400 });
      url = cleaned.url;
      payloadJson = buildPayload(componentType, body.payload, { map: cleaned.url });
      break;
    }
    case "qr": {
      const qrRaw = typeof body.url === "string" ? body.url.trim() : (typeof body.payload === "string" ? body.payload.trim() : "");
      if (!qrRaw) return NextResponse.json({ success: false, error: "请提供二维码内容或链接。" }, { status: 400 });
      const cleaned = sanitizeQrPayload(qrRaw);
      if (!cleaned.safe || !cleaned.payload) return NextResponse.json({ success: false, error: "二维码链接或内容不合法。" }, { status: 400 });
      // 若清洗后是合法 URL，则以 URL 呈现；否则仅放 payload
      if (/^https?:\/\//i.test(cleaned.payload)) {
        url = cleaned.payload;
      } else {
        url = "https://link168.me/placeholder";
      }
      payloadJson = buildPayload(componentType, body.payload, { qr: cleaned.payload, url: /^https?:\/\//i.test(cleaned.payload) ? cleaned.payload : undefined });
      break;
    }
    case "wechat": {
      const wechat = typeof body.url === "string" ? body.url.trim() : "";
      if (!wechat) return NextResponse.json({ success: false, error: "请输入微信号或名称。" }, { status: 400 });
      url = "https://link168.me/placeholder";
      payloadJson = buildPayload(componentType, body.payload, { wechat });
      break;
    }
    case "text":
    case "group-title": {
      url = "https://link168.me/placeholder";
      payloadJson = buildPayload(componentType, body.payload, {});
      break;
    }
    case "link":
    case "shop":
    case "booking":
    default: {
      const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
      if (!rawUrl) return NextResponse.json({ success: false, error: "请输入有效的链接 URL。" }, { status: 400 });
      const cleaned = sanitizePublicUrl(rawUrl);
      if (!cleaned.safe || !cleaned.url) return NextResponse.json({ success: false, error: "链接必须使用 http 或 https 协议。" }, { status: 400 });
      url = cleaned.url;
      payloadJson = buildPayload(componentType, body.payload, { url: cleaned.url });
      break;
    }
  }

  // 图标：只允许 https 链接或 emoji
  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : "default";
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji" ? normalizeNullableString(body.iconValue) : null;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : "";
  const iconUrl = iconType === "custom" ? sanitizePublicUrl(iconUrlRaw).url : null;

  const rawDescription = typeof body.description === "string" ? body.description : "";
  const descriptionSafe = sanitizePublicText(rawDescription);
  if (descriptionSafe && descriptionSafe.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ success: false, error: `描述不能超过 ${MAX_DESCRIPTION_LENGTH} 字。` }, { status: 400 });
  }
  if (descriptionSafe) {
    const descriptionSensitive = hasSensitiveContent(descriptionSafe);
    if (descriptionSensitive.detected) {
      return NextResponse.json({ success: false, error: "描述包含受限关键词，请修改后再试。" }, { status: 400 });
    }
  }

  const position = await db.link.count({ where: { profileId: profile.id } });
  const link = await db.link.create({
    data: {
      id: newId(),
      profileId: profile.id,
      type: componentType,
      payloadJson,
      title: titleSafe || componentType,
      url,
      description: descriptionSafe,
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
  if (!profile) return NextResponse.json({ success: false, error: "请先创建个人资料。" }, { status: 400 });

  const links = await db.link.findMany({
    where: { profileId: profile.id },
    orderBy: [{ isActive: "desc" }, { position: "asc" }],
  });

  return NextResponse.json({ success: true, links: links.map(toLinkDto) });
}
