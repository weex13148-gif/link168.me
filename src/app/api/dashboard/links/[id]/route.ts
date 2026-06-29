import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, normalizeNullableString, normalizeUrl, toLinkDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ICON_TYPES = ["default", "emoji", "custom"] as const;
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;

type UpdateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  isActive?: unknown;
  iconType?: unknown;
  iconValue?: unknown;
  iconUrl?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "主页不存在。" }, { status: 404 });
  }

  let body: UpdateLinkRequest;
  try {
    body = (await request.json()) as UpdateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const title = sanitizePublicText(rawTitle) ?? "";
  const url = normalizeUrl(body.url);

  if (!title || !url) {
    return NextResponse.json({ success: false, error: "请输入有效的标题和链接 URL。" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ success: false, error: `链接标题不能超过 ${MAX_TITLE_LENGTH} 字。` }, { status: 400 });
  }

  const titleSensitive = hasSensitiveContent(title);
  if (titleSensitive.detected) {
    return NextResponse.json(
      { success: false, error: `链接标题包含受限关键词（${titleSensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
  }

  const description = sanitizePublicText(typeof body.description === "string" ? body.description : "");
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ success: false, error: `链接描述不能超过 ${MAX_DESCRIPTION_LENGTH} 字。` }, { status: 400 });
  }
  if (description) {
    const descriptionSensitive = hasSensitiveContent(description);
    if (descriptionSensitive.detected) {
      return NextResponse.json(
        { success: false, error: `链接描述包含受限关键词（${descriptionSensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
        { status: 400 },
      );
    }
  }

  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : "default";
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji" ? normalizeNullableString(body.iconValue) : null;
  const iconUrl = iconType === "custom" ? normalizeUrl(body.iconUrl) || null : null;

  const { id } = await context.params;
  const updateData = {
    title,
    url,
    description,
    iconType,
    iconValue,
    iconUrl,
    ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
  };

  const result = await db.link.updateMany({
    where: { id, profileId: profile.id },
    data: updateData,
  });

  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "链接不存在。" }, { status: 404 });
  }

  const link = await db.link.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ success: true, link: toLinkDto(link) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "主页不存在。" }, { status: 404 });
  }

  const { id } = await context.params;
  const result = await db.link.deleteMany({ where: { id, profileId: profile.id } });
  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "链接不存在。" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
