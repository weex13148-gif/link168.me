import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { assertWorkspaceMember, isValidRole } from "@/lib/workspace";
import {
  WorkspaceCustomerError,
  assertWorkspaceCustomerAssignee,
  getAssignedWorkspaceWorkSummary,
} from "@/lib/workspace/customers";
import { canGrantWorkspaceRole, canManageWorkspaceRole } from "@/lib/workspace/invitation-policy";
import { WorkspaceInvitationError, createWorkspaceInvitation } from "@/lib/workspace/invitations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

function invitationErrorResponse(error: unknown) {
  if (error instanceof WorkspaceInvitationError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { success: false, error: "企业邀请服务暂时不可用。", code: "INVITATION_SERVICE_UNAVAILABLE" },
    { status: 503 },
  );
}

function customerErrorResponse(error: unknown) {
  if (error instanceof WorkspaceCustomerError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { success: false, error: "企业工作重新分配失败。", code: "WORKSPACE_REASSIGN_FAILED" },
    { status: 503 },
  );
}

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
    include: { user: { select: { id: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    success: true,
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      role: member.role,
      status: member.status,
      invitedBy: member.invitedBy,
      invitedAt: member.invitedAt.toISOString(),
      joinedAt: member.joinedAt?.toISOString() ?? null,
      disabledAt: member.disabledAt?.toISOString() ?? null,
    })),
  });
}

/** 兼容旧客户端：POST members 不再直接激活成员，统一创建邮箱邀请。 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const limited = await rateLimit(request, "workspace:invite:legacy", 20, 60 * 60 * 1000);
  if (!limited.passed) {
    return NextResponse.json(
      { success: false, error: "邀请操作过于频繁，请稍后再试。", code: "INVITATION_RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  try {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      actorUserId: user.id,
      actorEmail: user.email,
      email: body.email,
      role: body.role,
    });
    return NextResponse.json(
      { success: true, invitation, message: "邀请邮件已发送，对方接受后才会成为成员。" },
      { status: 201 },
    );
  } catch (error) {
    return invitationErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  let body: {
    memberId?: unknown;
    role?: unknown;
    action?: unknown;
    reassignToUserId?: unknown;
    reason?: unknown;
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
      data: { status: "active", joinedAt: new Date(), disabledAt: null, removedAt: null },
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
    const work = await getAssignedWorkspaceWorkSummary(workspaceId, targetMember.userId);
    if (work.total > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "仍有未完成客户或任务，请联系企业管理员重新分配后再退出。",
          code: "WORKSPACE_REASSIGN_REQUIRED",
          assignedWork: work,
        },
        { status: 409 },
      );
    }
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "removed", removedAt: new Date() },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "admin", requireActive: true });
  if (!check.allowed || !check.member) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }
  if (!canManageWorkspaceRole(check.member.role, targetMember.role)) {
    return NextResponse.json(
      { success: false, error: "无权管理该角色的成员。", code: "INSUFFICIENT_HIERARCHY" },
      { status: 403 },
    );
  }

  if (action === "remove" || action === "disable") {
    const work = await getAssignedWorkspaceWorkSummary(workspaceId, targetMember.userId);
    const reassignToUserId = typeof body.reassignToUserId === "string" && body.reassignToUserId.trim()
      ? body.reassignToUserId.trim()
      : null;

    if (work.total > 0 && !reassignToUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "该成员仍负责未完成客户或任务，请先指定接替成员。",
          code: "WORKSPACE_REASSIGN_REQUIRED",
          assignedWork: work,
        },
        { status: 409 },
      );
    }

    try {
      if (reassignToUserId) {
        if (reassignToUserId === targetMember.userId) {
          return NextResponse.json({ success: false, error: "接替成员不能是被移除成员。" }, { status: 400 });
        }
        await assertWorkspaceCustomerAssignee(workspaceId, reassignToUserId);
      }

      const reason = typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 500)
        : action === "remove"
          ? "成员移除"
          : "成员禁用";

      const result = await db.$transaction(async (tx) => {
        const assignedCustomers = reassignToUserId
          ? await tx.workspaceCustomer.findMany({
              where: {
                workspaceId,
                assignedToUserId: targetMember.userId,
                status: { notIn: ["converted", "closed"] },
              },
              select: { id: true },
            })
          : [];

        if (reassignToUserId && assignedCustomers.length > 0) {
          await tx.workspaceCustomer.updateMany({
            where: { id: { in: assignedCustomers.map((item) => item.id) } },
            data: { assignedToUserId: reassignToUserId },
          });
          await tx.workspaceCustomerAssignmentHistory.createMany({
            data: assignedCustomers.map((item) => ({
              workspaceId,
              customerId: item.id,
              fromUserId: targetMember.userId,
              toUserId: reassignToUserId,
              actorUserId: user.id,
              reason,
            })),
          });
        }

        const taskUpdate = reassignToUserId
          ? await tx.workspaceCustomerTask.updateMany({
              where: {
                workspaceId,
                assignedToUserId: targetMember.userId,
                status: { notIn: ["completed", "cancelled"] },
              },
              data: { assignedToUserId: reassignToUserId },
            })
          : { count: 0 };

        const updated = await tx.workspaceMember.update({
          where: { id: memberId },
          data: action === "remove"
            ? { status: "removed", removedAt: new Date() }
            : { status: "disabled", disabledAt: new Date() },
        });

        await tx.workspaceAuditLog.create({
          data: {
            workspaceId,
            actorUserId: user.id,
            action: action === "remove" ? "workspace.member.removed" : "workspace.member.disabled",
            targetType: "workspace_member",
            targetId: memberId,
            metadata: {
              targetUserId: targetMember.userId,
              reassignToUserId,
              reassignedCustomers: assignedCustomers.length,
              reassignedTasks: taskUpdate.count,
              reason,
            },
          },
        });

        return {
          member: updated,
          reassignedCustomers: assignedCustomers.length,
          reassignedTasks: taskUpdate.count,
        };
      });

      return NextResponse.json({
        success: true,
        member: { id: result.member.id, status: result.member.status },
        reassignedCustomers: result.reassignedCustomers,
        reassignedTasks: result.reassignedTasks,
      });
    } catch (error) {
      return customerErrorResponse(error);
    }
  }

  if (action === "enable") {
    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { status: "active", disabledAt: null, removedAt: null },
    });
    return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
  }

  if (action === "update_role") {
    const newRole = typeof body.role === "string" && isValidRole(body.role) ? body.role : null;
    if (!newRole || !canGrantWorkspaceRole(check.member.role, newRole)) {
      return NextResponse.json(
        { success: false, error: "无权授予该角色。", code: "WORKSPACE_ROLE_NOT_GRANTABLE" },
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
