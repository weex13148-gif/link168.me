import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, normalizeNullableString, toProfileDto } from "@/lib/dashboard-data";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

export const runtime = "nodejs";

const PRESET_THEMES = [
  "Link168 草木默认",
  "简约白",
  "商务黑",
  "蓝色科技",
  "橙色活力",
  "浅绿清新",
];

type SaveProfileRequest = {
  displayName?: unknown;
  bio?: unknown;
  theme?: unknown;
  language?: unknown;
  customTheme?: unknown;
};

export async function PUT(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: SaveProfileRequest;
  try {
    body = (await request.json()) as SaveProfileRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const existingProfile = await db.profile.findUnique({ where: { userId: user.id } });

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
    customThemeValue = body.customTheme.trim() || null;
  }

  const upsertData = {
    where: { userId: user.id },
    create: {
      id: newId(),
      userId: user.id,
      username: `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
      displayName: normalizeNullableString(body.displayName),
      bio: normalizeNullableString(body.bio),
      theme: themeValue || "Link168 草木默认",
      language: languageValue,
      customTheme: customThemeValue,
      isPublic: true,
    },
    update: {
      displayName: normalizeNullableString(body.displayName),
      bio: normalizeNullableString(body.bio),
      ...(themeValue ? { theme: themeValue } : {}),
      language: languageValue,
      customTheme: customThemeValue,
      isPublic: true,
    },
  };

  const profile = await db.profile.upsert(upsertData);

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
