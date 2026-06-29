import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardData, newId, normalizeNullableString, normalizeUsername, toProfileDto } from "@/lib/dashboard-data";
import { HANDLE_FORMAT_ERROR, HANDLE_RESERVED_ERROR, isPlaceholderHandle, normalizeHandle, validateHandle } from "@/lib/handle";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const DASHBOARD_HANDLE_FORMAT_ERROR = "公开地址只能使用小写字母、数字、下划线和短横线，长度 3-30 位";
const DASHBOARD_HANDLE_RESERVED_ERROR = "该公开地址不可使用，请换一个";
const DASHBOARD_HANDLE_LOCKED_ERROR = "公开地址已锁定，暂不支持修改。";
const MAX_DISPLAY_NAME_LENGTH = 60;
const MAX_BIO_LENGTH = 300;

const PRESET_THEMES = [
  "Link168 草木默认",
  "简约白",
  "商务黑",
  "蓝色科技",
  "橙色活力",
  "浅绿清新",
];

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

type SaveProfileRequest = {
  username?: unknown;
  displayName?: unknown;
  bio?: unknown;
  theme?: unknown;
  language?: unknown;
  customTheme?: unknown;
};

type ProfileUpdateData = {
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  theme?: string;
  language?: string;
  customTheme?: string | null;
  isPublic?: boolean;
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

export async function GET(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const data = await getDashboardData(user.id);
  return NextResponse.json({ success: true, user, ...data });
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

  const profileByUser = await db.profile.findUnique({ where: { userId: user.id } });
  const currentUsername = profileByUser?.username || "";
  const canCompleteUsername = !profileByUser || isPlaceholderHandle(currentUsername);
  const usernameSubmitted = hasOwn(body, "username") && typeof body.username === "string" && body.username.trim().length > 0;

  let username = currentUsername;
  let completedUsername = false;

  if (usernameSubmitted) {
    const requestedUsername = normalizeHandle(body.username);
    if (canCompleteUsername) {
      const handleResult = validateHandle(body.username);
      if (!handleResult.success) {
        const error =
          handleResult.error === HANDLE_RESERVED_ERROR
            ? DASHBOARD_HANDLE_RESERVED_ERROR
            : handleResult.error === HANDLE_FORMAT_ERROR
              ? DASHBOARD_HANDLE_FORMAT_ERROR
              : handleResult.error;
        return NextResponse.json({ success: false, error }, { status: 400 });
      }
      username = handleResult.handle;
      completedUsername = true;
    } else if (requestedUsername !== normalizeUsername(currentUsername)) {
      return NextResponse.json({ success: false, error: DASHBOARD_HANDLE_LOCKED_ERROR }, { status: 403 });
    }
  } else if (!profileByUser) {
    return NextResponse.json({ success: false, error: DASHBOARD_HANDLE_FORMAT_ERROR }, { status: 400 });
  }

  if (username && (completedUsername || username !== currentUsername)) {
    const existingProfile = await db.profile.findUnique({ where: { username } });
    if (existingProfile && existingProfile.userId !== user.id) {
      return NextResponse.json({ success: false, error: "该公开地址已被占用" }, { status: 409 });
    }
  }

  const updateData: ProfileUpdateData = {};

  if (hasOwn(body, "displayName")) {
    const result = validatePublicText(body.displayName, "昵称", MAX_DISPLAY_NAME_LENGTH);
    if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    updateData.displayName = result.value;
  }

  if (hasOwn(body, "bio")) {
    const result = validatePublicText(body.bio, "简介", MAX_BIO_LENGTH);
    if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    updateData.bio = result.value;
  }

  if (hasOwn(body, "theme")) {
    const themeRaw = typeof body.theme === "string" ? body.theme.trim() : "";
    if (!PRESET_THEMES.includes(themeRaw)) {
      return NextResponse.json({ success: false, error: "不支持的主题。" }, { status: 400 });
    }
    updateData.theme = themeRaw;
  }

  if (hasOwn(body, "language")) {
    const languageRaw = typeof body.language === "string" ? body.language.trim() : "";
    if (!SUPPORTED_LANGUAGES.includes(languageRaw as (typeof SUPPORTED_LANGUAGES)[number])) {
      return NextResponse.json({ success: false, error: "不支持的语言。" }, { status: 400 });
    }
    updateData.language = languageRaw;
  }

  if (hasOwn(body, "customTheme")) {
    const customTheme = typeof body.customTheme === "string" ? body.customTheme.trim() : "";
    if (customTheme.length > 20_000) {
      return NextResponse.json({ success: false, error: "自定义主题配置过大。" }, { status: 400 });
    }
    updateData.customTheme = normalizeNullableString(customTheme);
  }

  if (completedUsername) {
    updateData.username = username;
    updateData.isPublic = true;
  }

  const profile = profileByUser
    ? await db.profile.update({ where: { userId: user.id }, data: updateData })
    : await db.profile.create({
        data: {
          id: newId(),
          userId: user.id,
          username,
          displayName: updateData.displayName ?? null,
          bio: updateData.bio ?? null,
          theme: updateData.theme || "Link168 草木默认",
          language: updateData.language || "zh",
          customTheme: updateData.customTheme ?? null,
          isPublic: true,
        },
      });

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
