import "server-only";
import { db } from "@/lib/db";
import { assertWorkspaceMember } from "@/lib/workspace";
import {
  canManageWorkspaceCustomer,
  canReadWorkspaceCustomer,
  canReassignWorkspaceCustomer,
  canUpdateWorkspaceCustomer,
} from "@/lib/workspace/customer-policy";

export const WORKSPACE_CUSTOMER_STATUSES = [
  "new",
  "contacted",
  "following",
  "converted",
  "closed",
] as const;

export const WORKSPACE_CUSTOMER_TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const WORKSPACE_CUSTOMER_TASK_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type WorkspaceCustomerStatus = (typeof WORKSPACE_CUSTOMER_STATUSES)[number];
export type WorkspaceCustomerTaskStatus = (typeof WORKSPACE_CUSTOMER_TASK_STATUSES)[number];
export type WorkspaceCustomerTaskPriority = (typeof WORKSPACE_CUSTOMER_TASK_PRIORITIES)[number];

export class WorkspaceCustomerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceCustomerError";
  }
}

export function isWorkspaceCustomerStatus(value: unknown): value is WorkspaceCustomerStatus {
  return typeof value === "string" && WORKSPACE_CUSTOMER_STATUSES.includes(value as WorkspaceCustomerStatus);
}

export function isWorkspaceCustomerTaskStatus(value: unknown): value is WorkspaceCustomerTaskStatus {
  return typeof value === "string" && WORKSPACE_CUSTOMER_TASK_STATUSES.includes(value as WorkspaceCustomerTaskStatus);
}

export function isWorkspaceCustomerTaskPriority(value: unknown): value is WorkspaceCustomerTaskPriority {
  return typeof value === "string" && WORKSPACE_CUSTOMER_TASK_PRIORITIES.includes(value as WorkspaceCustomerTaskPriority);
}

export async function assertWorkspaceCustomerReader(workspaceId: string, userId: string) {
  const check = await assertWorkspaceMember(workspaceId, userId, {
    minRole: "viewer",
    requireActive: true,
  });
  if (!check.allowed || !check.member) {
    throw new WorkspaceCustomerError(
      check.code || "WORKSPACE_CUSTOMER_ACCESS_DENIED",
      check.message || "无权访问该企业客户池。",
      403,
    );
  }
  if (check.member.role === "viewer") {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_PII_DENIED",
      "只读观察者不能查看企业客户联系方式和需求信息。",
      403,
    );
  }
  return check.member;
}

export async function assertWorkspaceCustomerManager(workspaceId: string, userId: string) {
  const member = await assertWorkspaceCustomerReader(workspaceId, userId);
  if (!canManageWorkspaceCustomer(member.role)) {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_MANAGE_DENIED",
      "只有企业所有者或管理员可以创建、分配和删除企业客户。",
      403,
    );
  }
  return member;
}

export async function assertWorkspaceCustomerAssignee(
  workspaceId: string,
  assignedToUserId: string | null,
) {
  if (!assignedToUserId) return null;
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assignedToUserId } },
    select: { id: true, userId: true, role: true, status: true },
  });
  if (!member || member.status !== "active" || member.role === "viewer") {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_ASSIGNEE_INVALID",
      "客户和任务只能分配给当前企业的活跃所有者、管理员或成员。",
      400,
    );
  }
  return member;
}

export async function listVisibleWorkspaceCustomers(options: {
  workspaceId: string;
  userId: string;
  status?: WorkspaceCustomerStatus;
  search?: string;
}) {
  const member = await assertWorkspaceCustomerReader(options.workspaceId, options.userId);
  const manager = canManageWorkspaceCustomer(member.role);
  return db.workspaceCustomer.findMany({
    where: {
      workspaceId: options.workspaceId,
      ...(manager ? {} : { assignedToUserId: options.userId }),
      ...(options.status ? { status: options.status } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { email: { contains: options.search, mode: "insensitive" } },
              { phone: { contains: options.search, mode: "insensitive" } },
              { wechat: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function assertWorkspaceCustomerAccess(options: {
  workspaceId: string;
  userId: string;
  customerId: string;
  update?: boolean;
  reassign?: boolean;
}) {
  const member = await assertWorkspaceCustomerReader(options.workspaceId, options.userId);
  const customer = await db.workspaceCustomer.findFirst({
    where: { id: options.customerId, workspaceId: options.workspaceId },
  });
  if (!customer) {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_NOT_FOUND",
      "企业客户不存在。",
      404,
    );
  }

  if (options.reassign && !canReassignWorkspaceCustomer(member.role)) {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_REASSIGN_DENIED",
      "只有企业所有者或管理员可以重新分配客户。",
      403,
    );
  }

  if (
    options.update
      ? !canUpdateWorkspaceCustomer(member.role, options.userId, customer.assignedToUserId)
      : !canReadWorkspaceCustomer(member.role, options.userId, customer.assignedToUserId)
  ) {
    throw new WorkspaceCustomerError(
      "WORKSPACE_CUSTOMER_NOT_ASSIGNED",
      "该客户未分配给你。",
      403,
    );
  }

  return { member, customer };
}

export async function loadWorkspaceCustomerDetails(workspaceId: string, customerId: string) {
  const [followUps, tasks, history] = await Promise.all([
    db.workspaceCustomerFollowUp.findMany({
      where: { workspaceId, customerId },
      orderBy: { createdAt: "desc" },
    }),
    db.workspaceCustomerTask.findMany({
      where: { workspaceId, customerId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.workspaceCustomerAssignmentHistory.findMany({
      where: { workspaceId, customerId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { followUps, tasks, history };
}

export async function getAssignedWorkspaceWorkSummary(workspaceId: string, userId: string) {
  const [customers, tasks] = await Promise.all([
    db.workspaceCustomer.count({
      where: {
        workspaceId,
        assignedToUserId: userId,
        status: { notIn: ["converted", "closed"] },
      },
    }),
    db.workspaceCustomerTask.count({
      where: {
        workspaceId,
        assignedToUserId: userId,
        status: { notIn: ["completed", "cancelled"] },
      },
    }),
  ]);
  return { customers, tasks, total: customers + tasks };
}
