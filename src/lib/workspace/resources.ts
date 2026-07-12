import "server-only";
import { db } from "@/lib/db";
import { assertWorkspaceMember } from "@/lib/workspace";
import {
  canManageWorkspaceResource,
  canReadWorkspaceResource,
  type WorkspaceResourceType,
} from "@/lib/workspace/resource-policy";

export class WorkspaceResourceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceResourceError";
  }
}

export async function assertWorkspaceResourceReader(workspaceId: string, userId: string) {
  const check = await assertWorkspaceMember(workspaceId, userId, {
    minRole: "viewer",
    requireActive: true,
  });
  if (!check.allowed || !check.member || !canReadWorkspaceResource(check.member.role)) {
    throw new WorkspaceResourceError(
      check.code || "WORKSPACE_RESOURCE_ACCESS_DENIED",
      check.message || "无权访问该企业资源。",
      403,
    );
  }
  return check.member;
}

export async function assertWorkspaceResourceManager(workspaceId: string, userId: string) {
  const member = await assertWorkspaceResourceReader(workspaceId, userId);
  if (!canManageWorkspaceResource(member.role)) {
    throw new WorkspaceResourceError(
      "WORKSPACE_RESOURCE_MANAGE_DENIED",
      "只有企业所有者或管理员可以管理企业资源。",
      403,
    );
  }
  return member;
}

export async function assertWorkspaceAssignee(workspaceId: string, assignedToUserId: string | null) {
  if (!assignedToUserId) return null;
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assignedToUserId } },
    select: { userId: true, status: true, role: true },
  });
  if (!member || member.status !== "active") {
    throw new WorkspaceResourceError(
      "WORKSPACE_ASSIGNEE_INVALID",
      "资源只能分配给当前企业的活跃成员。",
      400,
    );
  }
  return member;
}

export async function listVisibleWorkspaceResourceMappings(options: {
  workspaceId: string;
  userId: string;
  resourceType: WorkspaceResourceType;
}) {
  const member = await assertWorkspaceResourceReader(options.workspaceId, options.userId);
  const canSeeAll = member.role === "owner" || member.role === "admin";
  return db.workspaceResource.findMany({
    where: {
      workspaceId: options.workspaceId,
      resourceType: options.resourceType,
      status: "active",
      ...(canSeeAll
        ? {}
        : {
            OR: [
              { assignedToUserId: null },
              { assignedToUserId: options.userId },
            ],
          }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function assertWorkspaceResourceAccess(options: {
  workspaceId: string;
  userId: string;
  resourceType: WorkspaceResourceType;
  resourceId: string;
  manage?: boolean;
}) {
  const member = options.manage
    ? await assertWorkspaceResourceManager(options.workspaceId, options.userId)
    : await assertWorkspaceResourceReader(options.workspaceId, options.userId);

  const mapping = await db.workspaceResource.findFirst({
    where: {
      workspaceId: options.workspaceId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      status: "active",
    },
  });
  if (!mapping) {
    throw new WorkspaceResourceError("WORKSPACE_RESOURCE_NOT_FOUND", "企业资源不存在。", 404);
  }

  if (
    !options.manage
    && member.role !== "owner"
    && member.role !== "admin"
    && mapping.assignedToUserId !== null
    && mapping.assignedToUserId !== options.userId
  ) {
    throw new WorkspaceResourceError("WORKSPACE_RESOURCE_NOT_ASSIGNED", "该资源未分配给你。", 403);
  }

  return { member, mapping };
}

export async function getWorkspaceOwnedResourceIds(
  resourceType: WorkspaceResourceType,
  resourceIds?: string[],
): Promise<string[]> {
  if (resourceIds && resourceIds.length === 0) return [];
  const mappings = await db.workspaceResource.findMany({
    where: {
      resourceType,
      status: "active",
      ...(resourceIds ? { resourceId: { in: resourceIds } } : {}),
    },
    select: { resourceId: true },
  });
  return mappings.map((item) => item.resourceId);
}

export async function isWorkspaceOwnedResource(
  resourceType: WorkspaceResourceType,
  resourceId: string,
): Promise<boolean> {
  const mapping = await db.workspaceResource.findUnique({
    where: { resourceType_resourceId: { resourceType, resourceId } },
    select: { status: true },
  });
  return mapping?.status === "active";
}

export async function writeWorkspaceAudit(options: {
  workspaceId: string;
  actorUserId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await db.workspaceAuditLog.create({
    data: {
      workspaceId: options.workspaceId,
      actorUserId: options.actorUserId,
      action: options.action,
      targetType: options.targetType ?? null,
      targetId: options.targetId ?? null,
      metadata: options.metadata,
    },
  });
}
