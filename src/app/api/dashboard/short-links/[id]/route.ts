import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { id } });
  if (!shortLink) {
    return NextResponse.json({ success: false, error: "Short link not found." }, { status: 404 });
  }

  if (shortLink.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  // TODO: 返回完整统计数据（等待 ShortLinkClick 模型添加后）
  return NextResponse.json({
    success: true,
    shortLink: {
      id: shortLink.id,
      slug: shortLink.slug,
      targetUrl: shortLink.targetUrl,
      totalClicks: shortLink.totalClicks,
      isEnabled: true, // TODO: 等待 schema 更新
      expiresAt: null,
      channelLabel: null,
      createdAt: shortLink.createdAt.toISOString(),
      updatedAt: shortLink.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { id } });
  if (!shortLink) {
    return NextResponse.json({ success: false, error: "Short link not found." }, { status: 404 });
  }

  if (shortLink.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  let body: {
    targetUrl?: unknown;
    isEnabled?: unknown;
    expiresAt?: unknown;
    channelLabel?: unknown;
    utmSource?: unknown;
    utmMedium?: unknown;
    utmCampaign?: unknown;
    utmContent?: unknown;
    description?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // URL 验证
  if (body.targetUrl !== undefined) {
    const rawTargetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
    if (!rawTargetUrl) {
      return NextResponse.json({ success: false, error: "目标链接不能为空。" }, { status: 400 });
    }
    try {
      new URL(rawTargetUrl);
      if (!rawTargetUrl.startsWith("http://") && !rawTargetUrl.startsWith("https://")) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ success: false, error: "请输入合法的 http(s) 链接。" }, { status: 400 });
    }
  }

  // 失效时间验证
  if (body.expiresAt !== undefined) {
    if (body.expiresAt !== null) {
      if (typeof body.expiresAt !== "string") {
        return NextResponse.json({ success: false, error: "失效时间格式不正确。" }, { status: 400 });
      }
      const parsed = new Date(body.expiresAt);
      if (isNaN(parsed.getTime()) || parsed <= new Date()) {
        return NextResponse.json({ success: false, error: "失效时间必须是未来的日期。" }, { status: 400 });
      }
    }
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {};
  if (body.targetUrl !== undefined) {
    updateData.targetUrl = (body.targetUrl as string).trim();
  }
  // TODO: isEnabled 和 expiresAt 需要 schema 支持后更新

  // 如果没有需要更新的字段
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      success: true,
      shortLink: {
        id: shortLink.id,
        slug: shortLink.slug,
        targetUrl: shortLink.targetUrl,
        totalClicks: shortLink.totalClicks,
        isEnabled: true,
        expiresAt: null,
        channelLabel: null,
        createdAt: shortLink.createdAt.toISOString(),
        updatedAt: shortLink.updatedAt.toISOString(),
      },
    });
  }

  const updated = await db.shortLink.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    shortLink: {
      id: updated.id,
      slug: updated.slug,
      targetUrl: updated.targetUrl,
      totalClicks: updated.totalClicks,
      isEnabled: true, // TODO: 等待 schema 更新
      expiresAt: null,
      channelLabel: null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const shortLink = await db.shortLink.findUnique({ where: { id } });
  if (!shortLink) {
    return NextResponse.json({ success: false, error: "Short link not found." }, { status: 404 });
  }

  if (shortLink.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  await db.shortLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
