import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, newId, normalizeNullableString, normalizeUrl, toLinkDto } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const ICON_TYPES = ["default", "emoji", "custom"] as const;
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;

type CreateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  iconType?: unknown;
  iconValue?: unknown;
  iconUrl?: unknown;
};

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "Save profile before adding links." }, { status: 400 });
  }

  let body: CreateLinkRequest;
  try {
    body = (await request.json()) as CreateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const titleSafe = sanitizePublicText(rawTitle) ?? "";
  if (!titleSafe) {
    return NextResponse.json({ success: false, error: "请输入链接标题。" }, { status: 400 });
  }
  if (titleSafe.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ success: false, error: `链接标题不能超过 ${MAX_TITLE_LENGTH} 字。` }, { status: 400 });
  }
  const titleSensitive = hasSensitiveContent(titleSafe);
  if (titleSensitive.detected) {
    return NextResponse.json(
      { success: false, error: `链接标题包含受限关键词（${titleSensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
  }

  const url = normalizeUrl(body.url);
  if (!url) {
    return NextResponse.json({ success: false, error: "请输入有效的链接 URL。" }, { status: 400 });
  }

  const iconTypeRaw = typeof body.iconType === "string" ? body.iconType.trim().toLowerCase() : "default";
  const iconType = ICON_TYPES.includes(iconTypeRaw as (typeof ICON_TYPES)[number]) ? iconTypeRaw : "default";
  const iconValue = iconType === "emoji" ? normalizeNullableString(body.iconValue) : null;
  const iconUrlRaw = typeof body.iconUrl === "string" ? body.iconUrl.trim() : "";
  const iconUrl = iconType === "custom" && /^https?:\/\//i.test(iconUrlRaw) ? iconUrlRaw : null;

  const rawDescription = typeof body.description === "string" ? body.description : "";
  const descriptionSafe = sanitizePublicText(rawDescription);
  if (descriptionSafe && descriptionSafe.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ success: false, error: `链接描述不能超过 ${MAX_DESCRIPTION_LENGTH} 字。` }, { status: 400 });
  }
  if (descriptionSafe) {
    const descriptionSensitive = hasSensitiveContent(descriptionSafe);
    if (descriptionSensitive.detected) {
      return NextResponse.json(
        { success: false, error: `链接描述包含受限关键词（${descriptionSensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
        { status: 400 },
      );
    }
  }

  const position = await db.link.count({ where: { profileId: profile.id } });
  const link = await db.link.create({
    data: {
      id: newId(),
      profileId: profile.id,
      title: titleSafe,
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
