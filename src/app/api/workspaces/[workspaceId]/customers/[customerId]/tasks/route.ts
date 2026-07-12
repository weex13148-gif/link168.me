import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import {
  canCreateWorkspaceCustomerTask,
  canManageWorkspaceCustomer,
  canUpdateWorkspaceCustomerTask,
} from "@/lib/workspace/customer-policy";
import {
  WorkspaceCustomerError,
  assertWorkspaceCustomerAccess,
  assertWorkspaceCustomerAssignee,
  isWorkspaceCustomerTaskPriority,
  isWorkspaceCustomerTaskStatus,
} from "@/lib/workspace/customers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string; customerId: string }>;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = sanitizePublicText(value.trim().slice(0, maxLength));
  return text || null;
}

function taskDto(task: {
  id: string;
  workspaceId: string;
  customerId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  assignedToUserId: string;
  createdByUserId: string;
  completedByUserId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    customerId: task.customerId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    assignedToUserId: task.assignedToUserId,
    createdByUserId: task.createdByUserId,
    completedByUserId: task.completedByUserId,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceCustomerError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[workspace-customer-tasks] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业客户任务暂时不可用。", code: "WORKSPACE_CUSTOMER_TASK_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, customerId } = await context.params;

  try {
    const { member, customer } = await assertWorkspaceCustomerAccess({
      workspaceId,
      userId: user.id,
      customerId,
      update: true,
    });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const title = cleanText(body.title, 160);
    if (!title || hasSensitiveContent(title).detected) {
      return NextResponse.json({ success: false, error: "请输入有效任务标题。" }, { status: 400 });
    }
    const description = cleanText(body.description, 2000);
    if (description && hasSensitiveContent(description).detected) {
      return NextResponse.json({ success: false, error: "任务描述包含受限关键词。" }, { status: 400 });
    }

    const manager = canManageWorkspaceCustomer(member.role);
    const requestedAssignee = typeof body.assignedToUserId === "string" && body.assignedToUserId.trim()
      ? body.assignedToUserId.trim()
      : manager
        ? customer.assignedToUserId ?? user.id
        : user.id;

    if (!canCreateWorkspaceCustomerTask(member.role, user.id, customer.assignedToUserId)) {
      throw new WorkspaceCustomerError(
        "WORKSPACE_CUSTOMER_TASK_CREATE_DENIED",
        "无权为该客户创建任务。",
        403,
      );
    }
    if (!manager && requestedAssignee !== user.id) {
      throw new WorkspaceCustomerError(
        "WORKSPACE_CUSTOMER_TASK_ASSIGN_DENIED",
        "普通成员只能把客户任务分配给自己。",
        403,
      );
    }
    await assertWorkspaceCustomerAssignee(workspaceId, requestedAssignee);

    const dueAt = typeof body.dueAt === "string" && body.dueAt
      ? new Date(body.dueAt)
      : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ success: false, error: "任务截止时间不正确。" }, { status: 400 });
    }

    const task = await db.$transaction(async (tx) => {
      const created = await tx.workspaceCustomerTask.create({
        data: {
          workspaceId,
          customerId,
          title,
          description,
          status: "pending",
          priority: isWorkspaceCustomerTaskPriority(body.priority) ? body.priority : "normal",
          dueAt,
          assignedToUserId: requestedAssignee,
          createdByUserId: user.id,
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.customer.task.created",
          targetType: "workspace_customer",
          targetId: customerId,
          metadata: { taskId: created.id, assignedToUserId: requestedAssignee },
        },
      });
      return created;
    });

    return NextResponse.json({ success: true, task: taskDto(task) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, customerId } = await context.params;

  try {
    const { member, customer } = await assertWorkspaceCustomerAccess({
      workspaceId,
      userId: user.id,
      customerId,
      update: true,
    });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    if (!taskId) {
      return NextResponse.json({ success: false, error: "缺少任务ID。" }, { status: 400 });
    }
    const task = await db.workspaceCustomerTask.findFirst({
      where: { id: taskId, workspaceId, customerId },
    });
    if (!task) {
      return NextResponse.json({ success: false, error: "客户任务不存在。" }, { status: 404 });
    }
    if (!canUpdateWorkspaceCustomerTask(member.role, user.id, task.assignedToUserId)) {
      throw new WorkspaceCustomerError(
        "WORKSPACE_CUSTOMER_TASK_NOT_ASSIGNED",
        "该客户任务未分配给你。",
        403,
      );
    }

    const manager = canManageWorkspaceCustomer(member.role);
    const requestsAssignee = Object.prototype.hasOwnProperty.call(body, "assignedToUserId");
    const assignedToUserId = requestsAssignee
      ? typeof body.assignedToUserId === "string" && body.assignedToUserId.trim()
        ? body.assignedToUserId.trim()
        : task.assignedToUserId
      : task.assignedToUserId;
    if (requestsAssignee && !manager) {
      throw new WorkspaceCustomerError(
        "WORKSPACE_CUSTOMER_TASK_ASSIGN_DENIED",
        "只有企业所有者或管理员可以重新分配任务。",
        403,
      );
    }
    if (requestsAssignee) await assertWorkspaceCustomerAssignee(workspaceId, assignedToUserId);

    const status = isWorkspaceCustomerTaskStatus(body.status) ? body.status : task.status;
    const completing = status === "completed";
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.workspaceCustomerTask.update({
        where: { id: taskId },
        data: {
          title: Object.prototype.hasOwnProperty.call(body, "title")
            ? cleanText(body.title, 160) ?? task.title
            : task.title,
          description: Object.prototype.hasOwnProperty.call(body, "description")
            ? cleanText(body.description, 2000)
            : task.description,
          status,
          priority: isWorkspaceCustomerTaskPriority(body.priority) ? body.priority : task.priority,
          assignedToUserId,
          completedByUserId: completing ? user.id : null,
          completedAt: completing ? new Date() : null,
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.customer.task.updated",
          targetType: "workspace_customer",
          targetId: customer.id,
          metadata: { taskId, status, assignedToUserId },
        },
      });
      return result;
    });

    return NextResponse.json({ success: true, task: taskDto(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
