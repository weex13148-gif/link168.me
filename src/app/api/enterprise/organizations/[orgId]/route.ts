import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertWorkspaceMember } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { orgId } = await context.params;

  const check = await assertWorkspaceMember(orgId, user.id, { minRole: "viewer", requireActive: true });
  if (!check.allowed || !check.member) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: orgId },
    include: {
      members: {
        where: { status: { not: "removed" } },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!workspace || workspace.workspaceType !== "enterprise") {
    return NextResponse.json({ success: false, error: "企业组织不存在。" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    organization: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
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
      invitedAt: m.invitedAt.toISOString(),
      joinedAt: m.joinedAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { orgId } = await context.params;

  const check = await assertWorkspaceMember(orgId, user.id, { minRole: "admin", requireActive: true });
  if (!check.allowed) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  const workspace = await db.workspace.findUnique({ where: { id: orgId } });
  if (!workspace || workspace.workspaceType !== "enterprise") {
    return NextResponse.json({ success: false, error: "企业组织不存在。" }, { status: 404 });
  }

  let body: {
    name?: unknown;
    description?: unknown;
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
      return NextResponse.json({ success: false, error: "组织名称必须为 2-50 个字符。" }, { status: 400 });
    }
    updateData.name = name;
  }
  if (body.description !== undefined) {
    updateData.description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true, message: "没有需要更新的字段。" });
  }

  const updated = await db.workspace.update({
    where: { id: orgId },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    organization: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
