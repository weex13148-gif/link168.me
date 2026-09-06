import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type WorkspaceLeadRole = "owner" | "admin" | "member";

export function canReadAllWorkspaceLeads(role: string): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}

export function workspaceLeadReadWhere(params: {
  workspaceId: string;
  userId: string;
  role: WorkspaceLeadRole;
}): Prisma.LeadWhereInput {
  if (canReadAllWorkspaceLeads(params.role)) {
    return { workspaceId: params.workspaceId };
  }

  return {
    workspaceId: params.workspaceId,
    OR: [
      { claimedByUserId: params.userId },
      { profile: { userId: params.userId } },
    ],
  };
}

export async function userLeadReadWhere(params: {
  userId: string;
  profileId: string;
}): Promise<Prisma.LeadWhereInput> {
  const [ownedWorkspaces, memberships] = await Promise.all([
    db.workspace.findMany({
      where: { ownerId: params.userId, isActive: true },
      select: { id: true },
    }),
    db.workspaceMember.findMany({
      where: {
        userId: params.userId,
        status: "active",
        role: { in: ["owner", "admin", "member"] },
        workspace: { isActive: true },
      },
      select: { workspaceId: true, role: true },
    }),
  ]);

  const managerWorkspaceIds = new Set(ownedWorkspaces.map((workspace) => workspace.id));
  const memberWorkspaceIds = new Set<string>();
  for (const membership of memberships) {
    if (canReadAllWorkspaceLeads(membership.role)) {
      managerWorkspaceIds.add(membership.workspaceId);
    } else if (membership.role === "member") {
      memberWorkspaceIds.add(membership.workspaceId);
    }
  }

  const scopes: Prisma.LeadWhereInput[] = [
    { profileId: params.profileId, workspaceId: null },
  ];
  if (managerWorkspaceIds.size > 0) {
    scopes.push({ workspaceId: { in: [...managerWorkspaceIds] } });
  }
  if (memberWorkspaceIds.size > 0) {
    scopes.push({
      workspaceId: { in: [...memberWorkspaceIds] },
      OR: [
        { claimedByUserId: params.userId },
        { profileId: params.profileId },
      ],
    });
  }

  return { OR: scopes };
}
