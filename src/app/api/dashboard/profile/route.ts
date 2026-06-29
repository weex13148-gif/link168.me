import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, normalizeNullableString, toProfileDto } from "@/lib/dashboard-data";
import { createPlaceholderHandle } from "@/lib/handle";
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

const MAX_BIO_LENGTH = 300;
const MAX_DISPLAY_NAME_LENGTH = 60;
const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

type SaveProfileRequest = {
  displayName?: unknown;
  bio?: unknown;
  theme?: unknown;
  language?: unknown;
  customTheme?: unknown;
};

type ProfileUpdateData = {
  displayName?: string | null;
  bio?: string | null;
  theme?: string;
  language?: string;
  customTheme?: string | null;
};

function validatePublicText(value: unknown, label: string, maxLength: number) {
  const normalized = typeof value === "string" ? sanitizePublicText(value) : null;
  if (normalized && normalized.length > maxLength) {
    return { value: null, error: `${label}不能超过 ${maxLength} 字。` };
  }
  if (normalized) {
    const sensitive = hasSensitiveContent(normalized);
    if (sensitive.detected) {
      return {
        value: null,
        error: `${label}包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。`,
      };
    }
  }
  return { value: normalized, error: "" };
}

export async function PUT(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: SaveProfileRequest;
  try {
    body = (await request.json()) as SaveProfileRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const existingProfile = await db.profile.findUnique({ where: { userId: user.id } });
  const updateData: ProfileUpdateData = {};

  if (hasOwn(body, "displayName")) {
    const result = validatePublicText(body.displayName, "展示名", MAX_DISPLAY_NAME_LENGTH);
    if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    updateData.displayName = result.value;
  }

  if (hasOwn(body, "bio")) {
    const result = validatePublicText(body.bio, "简介", MAX_BIO_LENGTH);
    if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    updateData.bio = result.value;
  }

  if (hasOwn(body, "theme")) {
    const theme = typeof body.theme === "string" ? body.theme.trim() : "";
    if (!PRESET_THEMES.includes(theme)) {
      return NextResponse.json({ success: false, error: "不支持的主题。" }, { status: 400 });
    }
    updateData.theme = theme;
  }

  if (hasOwn(body, "language")) {
    const language = typeof body.language === "string" ? body.language.trim() : "";
    if (!SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])) {
      return NextResponse.json({ success: false, error: "不支持的语言。" }, { status: 400 });
    }
    updateData.language = language;
  }

  if (hasOwn(body, "customTheme")) {
    const customTheme = typeof body.customTheme === "string" ? body.customTheme.trim() : "";
    if (customTheme.length > 20_000) {
      return NextResponse.json({ success: false, error: "自定义主题配置过大。" }, { status: 400 });
    }
    updateData.customTheme = normalizeNullableString(customTheme);
  }

  const profile = existingProfile
    ? await db.profile.update({ where: { userId: user.id }, data: updateData })
    : await db.profile.create({
        data: {
          id: newId(),
          userId: user.id,
          username: createPlaceholderHandle(user.id),
          displayName: updateData.displayName ?? null,
          bio: updateData.bio ?? null,
          theme: updateData.theme || "Link168 草木默认",
          language: updateData.language || "zh",
          customTheme: updateData.customTheme ?? null,
          isPublic: false,
        },
      });

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
