import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, normalizeNullableString, toProfileDto } from "@/lib/dashboard-data";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";

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
const MAX_CONTACT_FIELD_LENGTH = 200;

const VALID_CONTACT_VISIBILITY = ["public", "contacts_only", "private"] as const;

type SaveProfileRequest = {
  displayName?: unknown;
  bio?: unknown;
  theme?: unknown;
  language?: unknown;
  customTheme?: unknown;
  company?: unknown;
  jobTitle?: unknown;
  phone?: unknown;
  email?: unknown;
  wechat?: unknown;
  city?: unknown;
  address?: unknown;
  website?: unknown;
  socialLinks?: unknown;
  contactVisibility?: unknown;
  isPublic?: unknown;
};

function hasField(body: SaveProfileRequest, field: keyof SaveProfileRequest) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

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

  let languageValue: string | undefined;
  if (hasField(body, "language")) {
    languageValue = typeof body.language === "string" ? body.language.trim() : "";
    if (!languageValue || !SUPPORTED_LANGUAGES.includes(languageValue as (typeof SUPPORTED_LANGUAGES)[number])) {
      return NextResponse.json({ success: false, error: "请选择有效的语言。" }, { status: 400 });
    }
  }

  let customThemeValue: string | null | undefined;
  if (hasField(body, "customTheme")) {
    if (body.customTheme === null) {
      customThemeValue = null;
    } else if (typeof body.customTheme === "string") {
      customThemeValue = sanitizePublicText(body.customTheme);
    }
  }

  let isPublicValue: boolean | undefined;
  if (hasField(body, "isPublic")) {
    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json({ success: false, error: "公开状态格式不正确。" }, { status: 400 });
    }
    isPublicValue = body.isPublic;
  }

  let contactVisibilityValue: string | undefined;
  if (hasField(body, "contactVisibility")) {
    if (!VALID_CONTACT_VISIBILITY.includes(body.contactVisibility as (typeof VALID_CONTACT_VISIBILITY)[number])) {
      return NextResponse.json({ success: false, error: "请选择有效的联系方式可见性。" }, { status: 400 });
    }
    contactVisibilityValue = body.contactVisibility as string;
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

  // 联系方式字段长度校验
  const contactFields: [string, unknown][] = [
    ["公司", body.company],
    ["职位", body.jobTitle],
    ["手机", body.phone],
    ["邮箱", body.email],
    ["微信", body.wechat],
    ["城市", body.city],
    ["地址", body.address],
    ["官网", body.website],
  ];
  for (const [label, value] of contactFields) {
    if (typeof value === "string" && value.trim().length > MAX_CONTACT_FIELD_LENGTH) {
      return NextResponse.json({ success: false, error: `${label}不能超过 ${MAX_CONTACT_FIELD_LENGTH} 字。` }, { status: 400 });
    }
  }

  const updateData: Parameters<typeof db.profile.update>[0]["data"] = {};
  if (hasField(body, "displayName")) updateData.displayName = displayNameSafe || null;
  if (hasField(body, "bio")) updateData.bio = bioSafe;
  if (themeValue) updateData.theme = themeValue;
  if (languageValue) updateData.language = languageValue;
  if (customThemeValue !== undefined) updateData.customTheme = customThemeValue;
  if (isPublicValue !== undefined) updateData.isPublic = isPublicValue;
  if (hasField(body, "company")) updateData.company = normalizeNullableString(body.company);
  if (hasField(body, "jobTitle")) updateData.jobTitle = normalizeNullableString(body.jobTitle);
  if (hasField(body, "phone")) updateData.phone = normalizeNullableString(body.phone);
  if (hasField(body, "email")) updateData.email = normalizeNullableString(body.email);
  if (hasField(body, "wechat")) updateData.wechat = normalizeNullableString(body.wechat);
  if (hasField(body, "city")) updateData.city = normalizeNullableString(body.city);
  if (hasField(body, "address")) updateData.address = normalizeNullableString(body.address);
  if (hasField(body, "website")) updateData.website = normalizeNullableString(body.website);
  if (hasField(body, "socialLinks")) {
    updateData.socialLinks = typeof body.socialLinks === "object" && body.socialLinks !== null ? body.socialLinks : undefined;
  }
  if (contactVisibilityValue) updateData.contactVisibility = contactVisibilityValue;

  const upsertData = {
    where: { userId: user.id },
    create: {
      id: newId(),
      userId: user.id,
      username: `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
      displayName: displayNameSafe || null,
      bio: bioSafe,
      theme: themeValue || "Link168 草木默认",
      language: languageValue || DEFAULT_LANGUAGE,
      customTheme: customThemeValue === undefined ? null : customThemeValue,
      isPublic: isPublicValue ?? false,
      company: normalizeNullableString(body.company),
      jobTitle: normalizeNullableString(body.jobTitle),
      phone: normalizeNullableString(body.phone),
      email: normalizeNullableString(body.email),
      wechat: normalizeNullableString(body.wechat),
      city: normalizeNullableString(body.city),
      address: normalizeNullableString(body.address),
      website: normalizeNullableString(body.website),
      socialLinks: typeof body.socialLinks === "object" && body.socialLinks !== null ? body.socialLinks : undefined,
      contactVisibility: contactVisibilityValue || "public",
    },
    update: updateData,
  };

  const profile = await db.profile.upsert(upsertData);

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
