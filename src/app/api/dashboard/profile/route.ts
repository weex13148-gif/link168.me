import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, toProfileDto } from "@/lib/dashboard-data";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const PRESET_THEMES = [
  "Link168 草木默认",
  "简约白",
  "商务黑",
  "蓝色科技",
  "橙色活力",
  "浅绿清新",
];

const MAX_BIO_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 40;

type SaveProfileRequest = {
  displayName?: unknown;
  bio?: unknown;
  theme?: unknown;
  language?: unknown;
  customTheme?: unknown;
};

export async function PUT(request: Request) {
  const { user, response } = await requireActiveUser(request);
  if (response || !user) return response;

  let body: SaveProfileRequest;
  try {
    body = (await request.json()) as SaveProfileRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  let themeValue: string | null = typeof body.theme === "string" ? body.theme.trim() : null;
  if (themeValue && !PRESET_THEMES.includes(themeValue)) {
    themeValue = "Link168 草木默认";
  }

  let languageValue: string = typeof body.language === "string" ? body.language.trim() : "";
  if (!languageValue || !SUPPORTED_LANGUAGES.includes(languageValue as (typeof SUPPORTED_LANGUAGES)[number])) {
    languageValue = "zh";
  }

  let customThemeValue: string | null = null;
  if (body.customTheme === null) {
    customThemeValue = null;
  } else if (typeof body.customTheme === "string") {
    customThemeValue = sanitizePublicText(body.customTheme);
  }

  // UGC 内容安全：展示名 / 简介 敏感词过滤
  const displayNameRaw = typeof body.displayName === "string" ? body.displayName : "";
  const bioRaw = typeof body.bio === "string" ? body.bio : "";

  const displayNameSafe = sanitizePublicText(displayNameRaw) ?? "";
  if (displayNameSafe.length > MAX_DISPLAY_NAME_LENGTH) {
    return NextResponse.json({ success: false, error: `展示名不能超过 ${MAX_DISPLAY_NAME_LENGTH} 字。` }, { status: 400 });
  }
  const sensitiveDisplayName = hasSensitiveContent(displayNameSafe);
  if (sensitiveDisplayName.detected) {
    return NextResponse.json(
      { success: false, error: `展示名包含受限关键词（${sensitiveDisplayName.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
  }

  const bioSafe = sanitizePublicText(bioRaw);
  if (bioSafe && bioSafe.length > MAX_BIO_LENGTH) {
    return NextResponse.json({ success: false, error: `简介不能超过 ${MAX_BIO_LENGTH} 字。` }, { status: 400 });
  }
  if (bioSafe) {
    const sensitiveBio = hasSensitiveContent(bioSafe);
    if (sensitiveBio.detected) {
      return NextResponse.json(
        { success: false, error: `简介包含受限关键词（${sensitiveBio.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
        { status: 400 },
      );
    }
  }

  const upsertData = {
    where: { userId: user.id },
    create: {
      id: newId(),
      userId: user.id,
      username: `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
      displayName: displayNameSafe || null,
      bio: bioSafe,
      theme: themeValue || "Link168 草木默认",
      language: languageValue,
      customTheme: customThemeValue,
      isPublic: true,
    },
    update: {
      displayName: displayNameSafe || null,
      bio: bioSafe,
      ...(themeValue ? { theme: themeValue } : {}),
      language: languageValue,
      customTheme: customThemeValue,
      isPublic: true,
    },
  };

  const profile = await db.profile.upsert(upsertData);

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
