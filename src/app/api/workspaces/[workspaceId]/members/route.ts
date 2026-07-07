import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertWorkspaceMember, isValidRole, roleAtLeast } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "viewer", requireActive: true });
  if (!check.allowed) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: { not: "removed" } },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    success: true,
    members: members.map((m) => ({
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

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "admin", requireActive: true });
  if (!check.allowed) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  let body: {
    email?: unknown;
    role?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "请输入有效的邮箱地址。" }, { status: 400 });
  }

  const role = typeof body.role === "string" && isValidRole(body.role) ? body.role : "member";
  if (role === "owner") {
    return NextResponse.json({ success: false, error: "不能添加 owner 角色。" }, { status: 400 });
  }

  const invitee = await db.user.findUnique({ where: { email } });
  if (!invitee) {
    return NextResponse.json(
      { success: false, error: "该邮箱未注册，无法添加为成员。", code: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (invitee.id === user.id) {
    return NextResponse.json({ success: false, error: "不能添加自己。" }, { status: 400 });
  }

  const existing = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: invitee.id },
  });

  if (existing) {
    if (existing.status === "removed") {
      const restored = await db.workspaceMember.update({
        where: { id: existing.id },
        data: {
          role,
          status: "invited",
          invitedBy: user.id,
          invitedAt: new Date(),
          joinedAt: null,
          disabledAt: null,
          removedAt: null,
        },
      });
      return NextResponse.json({
        success: true,
        member: {
          id: restored.id,
          userId: restored.userId,
          email,
          role: restored.role,
          status: restored.status,
          invitedBy: restored.invitedBy,
          invitedAt: restored.invitedAt.toISOString(),
        },
      });
    }
    return NextResponse.json(
      { success: false, error: "该用户已在工作空间中。", code: "MEMBER_ALREADY_EXISTS" },
      { status: 409 },
    );
  }

  // 直接添加已有注册用户（不发送邀请邮件），状态为 active
  const member = await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: invitee.id,
      role,
      status: "active",
      invitedBy: user.id,
      joinedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    member: {
      id: member.id,
      userId: member.userId,
      email,
      role: member.role,
      status: member.status,
      invitedBy: member.invitedBy,
      invitedAt: member.invitedAt.toISOString(),
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  let body: {
    memberId?: unknown;
    role?: unknown;
    action?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) {
    return NextResponse.json({ success: false, error: "缺少成员 ID。" }, { status: 400 });
  }

  const targetMember = await db.workspaceMember.findUnique({ where: { id: memberId } });
  if (!targetMember || targetMember.workspaceId !== workspaceId) {
    return NextResponse.json({ success: false, error: "成员不存在。" }, { status: 404 });
  }

  const action = typeof body.action === "string" ? body.action : "update_role";

  if (action === "accept") {
    if (targetMember.userId !== user.id) {
      return NextResponse.json({ success: false, error: "只能接受自己的邀请。" }, { status: 403 });
    }
    if (targetMember.status !== "invited") {
      return NextResponse.json({ success: false, error: "当前状态不可接受邀请。" }, { status: 400 });
    }
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "active", joinedAt: new Date() },
    });
    return NextResponse.json({
      success: true,
      member: { id: updated.id, role: updated.role, status: updated.status, joinedAt: updated.joinedAt?.toISOString() ?? null },
    });
  }

  if (action === "leave") {
    if (targetMember.userId !== user.id) {
      return NextResponse.json({ success: false, error: "只能退出自己的成员资格。" }, { status: 403 });
    }
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { success: false, error: "所有者不能退出工作空间，请先转让所有权。", code: "OWNER_CANNOT_LEAVE" },
        { status: 400 },
      );
    }
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "removed", removedAt: new Date() },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "admin", requireActive: true });
  if (!check.allowed) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json(
      { success: false, error: "不能修改所有者角色。", code: "OWNER_IMMUTABLE" },
      { status: 403 },
    );
  }

  if (!roleAtLeast(check.member!.role, targetMember.role as "admin" | "member" | "viewer")) {
    return NextResponse.json(
      { success: false, error: "无权管理更高角色的成员。", code: "INSUFFICIENT_HIERARCHY" },
      { status: 403 },
    );
  }

  if (action === "remove") {
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "removed", removedAt: new Date() },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  if (action === "disable") {
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "disabled", disabledAt: new Date() },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  if (action === "enable") {
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "active", disabledAt: null },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  if (action === "update_role") {
    const newRole = typeof body.role === "string" && isValidRole(body.role) ? body.role : null;
    if (!newRole || newRole === "owner") {
      return NextResponse.json({ success: false, error: "无效的目标角色。" }, { status: 400 });
    }
    if (!roleAtLeast(check.member!.role, newRole as "admin" | "member" | "viewer")) {
      return NextResponse.json(
        { success: false, error: "不能授予高于自己的角色。", code: "INSUFFICIENT_HIERARCHY" },
        { status: 403 },
      );
    }
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, role: updated.role } });
  }

  return NextResponse.json({ success: false, error: "未知操作。" }, { status: 400 });
}
