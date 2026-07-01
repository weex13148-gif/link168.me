import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toProfileDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

const FREE_THEMES = new Set(["Link168 草木默认", "简约白"]);
const ALL_THEMES = new Set(["Link168 草木默认", "简约白", "商务黑", "蓝色科技", "橙色活力", "浅绿清新"]);
const TEMPLATES = new Set(["business", "creator", "conversion"]);

type AppearanceRequest = {
  theme?: unknown;
  template?: unknown;
};

export async function PUT(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: AppearanceRequest;
  try {
    body = await request.json() as AppearanceRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  const template = typeof body.template === "string" ? body.template.trim().toLowerCase() : "";
  if (!ALL_THEMES.has(theme)) {
    return NextResponse.json({ success: false, error: "请选择有效的主题。" }, { status: 400 });
  }
  if (!TEMPLATES.has(template)) {
    return NextResponse.json({ success: false, error: "请选择有效的主页布局。" }, { status: 400 });
  }

  const subscription = await db.membershipSubscription.findUnique({
    where: { userId: user.id },
    select: { planCode: true, status: true },
  });
  const isPaid = subscription?.status === "active" && subscription.planCode !== "free";
  if (!isPaid && !FREE_THEMES.has(theme)) {
    return NextResponse.json({ success: false, error: "该主题为会员功能，请升级后使用。", upgradeRequired: true }, { status: 403 });
  }

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先完成名片资料。" }, { status: 400 });
  }

  const updated = await db.profile.update({
    where: { userId: user.id },
    data: { theme, template },
  });

  return NextResponse.json({ success: true, profile: toProfileDto(updated), message: "主题已保存。" });
}
