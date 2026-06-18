import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  const profile = await db.profile.findUnique({
    where: { username: normalized },
    include: {
      user: { select: { id: true, email: true, role: true, isSystem: true, emailVerified: true, createdAt: true } },
      links: { orderBy: { position: "asc" } },
    },
  });

  if (!profile) {
    return NextResponse.json({ success: false, error: "未找到对应主页" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      theme: profile.theme,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: profile.user
        ? {
            id: profile.user.id,
            email: profile.user.email,
            emailVerified: profile.user.emailVerified,
            role: profile.user.role || "user",
            isSystem: Boolean(profile.user.isSystem),
            createdAt: profile.user.createdAt,
          }
        : null,
      linkCount: profile.links.length,
    },
    links: profile.links.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      description: link.description,
      iconType: link.iconType,
      position: link.position,
      isActive: link.isActive,
      totalClicks: link.totalClicks,
      createdAt: link.createdAt,
    })),
  });
}

type ProfileAction = "hide-profile" | "restore-profile" | "disable-links" | "enable-links";

type PatchBody = { action?: unknown };

export async function PATCH(request: Request, context: RouteContext) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { username } = await context.params;
  const normalized = username.trim().toLowerCase();

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    body = {};
  }

  let action: ProfileAction | string;
  if (typeof body.action === "string" && body.action) {
    action = body.action;
  } else {
    const actionHeader = request.headers.get("x-admin-action");
    if (!actionHeader) {
      return NextResponse.json({ success: false, error: "缺少操作类型" }, { status: 400 });
    }
    action = actionHeader;
  }

  const profile = await db.profile.findUnique({ where: { username: normalized } });
  if (!profile) {
    return NextResponse.json({ success: false, error: "未找到对应主页" }, { status: 404 });
  }

  if (action === "hide-profile") {
    await db.profile.update({ where: { id: profile.id }, data: { isPublic: false } });
    return NextResponse.json({ success: true, message: "主页已隐藏", isPublic: false });
  }

  if (action === "restore-profile") {
    await db.profile.update({ where: { id: profile.id }, data: { isPublic: true } });
    return NextResponse.json({ success: true, message: "主页已恢复公开", isPublic: true });
  }

  if (action === "disable-links") {
    const result = await db.link.updateMany({
      where: { profileId: profile.id, isActive: true },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, message: `已下架 ${result.count} 条链接`, disabledCount: result.count });
  }

  if (action === "enable-links") {
    const result = await db.link.updateMany({
      where: { profileId: profile.id, isActive: false },
      data: { isActive: true },
    });
    return NextResponse.json({ success: true, message: `已恢复 ${result.count} 条链接`, enabledCount: result.count });
  }

  return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
}
