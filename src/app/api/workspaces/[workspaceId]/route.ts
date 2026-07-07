import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertWorkspaceMember, isValidSlug } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "viewer", requireActive: true });
  if (!check.allowed || !check.member) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { status: { not: "removed" } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!workspace) {
    return NextResponse.json({ success: false, error: "工作空间不存在。" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      workspaceType: workspace.workspaceType,
      planCode: workspace.planCode,
      isActive: workspace.isActive,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      myRole: check.member.role,
      myStatus: check.member.status,
    },
    members: workspace.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      status: m.status,
      invitedBy: m.invitedBy,
      invitedAt: m.invitedAt.toISOString(),
      joinedAt: m.joinedAt?.toISOString() ?? null,
      disabledAt: m.disabledAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "admin", requireActive: true });
  if (!check.allowed || !check.member) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  let body: {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
    isActive?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json({ success: false, error: "工作空间名称必须为 2-50 个字符。" }, { status: 400 });
    }
    updateData.name = name;
  }

  if (body.slug !== undefined) {
    const rawSlug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!isValidSlug(rawSlug)) {
      return NextResponse.json(
        { success: false, error: "自定义链接后缀必须是 3-32 个字符，仅限小写字母、数字和 -。" },
        { status: 400 },
      );
    }
    const existing = await db.workspace.findUnique({ where: { slug: rawSlug } });
    if (existing && existing.id !== workspaceId) {
      return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个。" }, { status: 409 });
    }
    updateData.slug = rawSlug;
  }

  if (body.description !== undefined) {
    updateData.description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;
  }

  if (body.isActive !== undefined) {
    if (check.member.role !== "owner") {
      return NextResponse.json(
        { success: false, error: "只有工作空间所有者可以启用或停用工作空间。", code: "WORKSPACE_OWNER_REQUIRED" },
        { status: 403 },
      );
    }
    updateData.isActive = Boolean(body.isActive);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true, message: "没有需要更新的字段。" });
  }

  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    workspace: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      workspaceType: updated.workspaceType,
      planCode: updated.planCode,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
