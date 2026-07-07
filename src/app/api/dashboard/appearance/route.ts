import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { toProfileDto } from "@/lib/dashboard-data";
import { db } from "@/lib/db";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";

export const runtime = "nodejs";

const FREE_THEMES = new Set(["Link168 草木默认", "草木原色", "简约白"]);
const ALL_THEMES = new Set(["Link168 草木默认", "草木原色", "简约白", "商务黑", "蓝色科技", "橙色活力", "浅绿清新", "夜樱粉", "日落橙", "海洋蓝", "森林绿", "极简灰", "暖茶棕"]);
const TEMPLATES = new Set(["business", "creator", "conversion"]);

type AppearanceRequest = {
  theme?: unknown;
  template?: unknown;
  customTheme?: unknown;
};

export async function PUT(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: AppearanceRequest;
  try {
    body = (await request.json()) as AppearanceRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先完成名片资料。" }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "customTheme")) {
    if (body.customTheme !== null && (typeof body.customTheme !== "object" || Array.isArray(body.customTheme))) {
      return NextResponse.json({ success: false, error: "自定义主题格式不正确。" }, { status: 400 });
    }

    const updated = await db.profile.update({
      where: { userId: user.id },
      data: { customTheme: body.customTheme === null ? null : JSON.stringify(body.customTheme) },
    });

    await revalidatePublicProfileByUser(user.id);

    return NextResponse.json({ success: true, profile: toProfileDto(updated), message: "自定义主题已保存。" });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  const template = typeof body.template === "string" ? body.template.trim().toLowerCase() : "";

  if (!ALL_THEMES.has(theme)) {
    return NextResponse.json({ success: false, error: "请选择有效的主题。" }, { status: 400 });
  }
  if (!TEMPLATES.has(template)) {
    return NextResponse.json({ success: false, error: "请选择有效的主页布局。" }, { status: 400 });
  }

  const entitlements = await getUserEntitlements(user.id);
  const canUsePaidThemes = entitlements.features.removeBranding && entitlements.hasActiveMembership;
  if (!canUsePaidThemes && !FREE_THEMES.has(theme)) {
    return NextResponse.json({ success: false, error: "该主题为会员功能，请升级后使用。", upgradeRequired: true }, { status: 403 });
  }

  const updated = await db.profile.update({
    where: { userId: user.id },
    data: { theme, template },
  });

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json({ success: true, profile: toProfileDto(updated), message: "主题已保存。" });
}
