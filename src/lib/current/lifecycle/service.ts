import crypto from "crypto";
import { currentDb, toJsonValue } from "@/lib/current/data/prisma-current";
import type { CurrentResult } from "@/lib/current/contracts";
import { currentFromUnknown, currentOk } from "@/lib/current/team/result";
import { getTeamDissolutionState, TEAM_RESTORE_WINDOW_DAYS, type TeamDissolutionState } from "@/lib/current/team/service";

export { TEAM_RESTORE_WINDOW_DAYS };

export function teamLifecycleBlocksNormalOperations(state: TeamDissolutionState): boolean {
  return state.status !== "active";
}

export async function getCurrentTeamLifecycle(workspaceId: string): Promise<CurrentResult<TeamDissolutionState>> {
  return getTeamDissolutionState(workspaceId);
}

export async function executeExpiredTeamRetention(now = new Date()): Promise<CurrentResult<{ transitioned: number }>> {
  try {
    const pending = await currentDb.currentLifecycleRecord.findMany({
      where: { subjectType: "workspace", state: "pending_deletion", restoreDeadlineAt: { lte: now }, legalHoldUntil: null },
      select: { subjectId: true, id: true },
    });
    let transitioned = 0;
    for (const record of pending) {
      await currentDb.$transaction(async (tx) => {
        const existing = await tx.currentLifecycleRecord.findFirst({ where: { subjectType: "workspace", subjectId: record.subjectId, state: "restricted_retention" } });
        if (existing) return;
        await tx.currentWorkspace.updateMany({ where: { id: record.subjectId }, data: { isActive: false } });
        await tx.currentPage.updateMany({ where: { workspaceId: record.subjectId }, data: { status: "disabled" } });
        await tx.currentLifecycleRecord.create({ data: { id: crypto.randomUUID(), subjectType: "workspace", subjectId: record.subjectId, state: "restricted_retention", scheduledAt: now, restoreDeadlineAt: null, purgeDeadlineAt: null, legalHoldUntil: null, reason: "restore_window_expired", metadata: toJsonValue({ creditsFrozen: true, autoRenewFrozen: true, invitesDisabled: true, newLeadsDisabled: true, visitorAiDisabled: true }) } });
        await tx.currentAuditLog.create({ data: { id: crypto.randomUUID(), workspaceId: record.subjectId, actorIdentityId: null, action: "current.team.lifecycle.retention_finalized", targetType: "workspace", targetId: record.subjectId, idempotencyKey: `retention:${record.id}`, metadata: toJsonValue({ transitionedAt: now.toISOString(), creditsFrozen: true }) } });
        transitioned += 1;
      });
    }
    return currentOk({ transitioned });
  } catch (error) {
    return currentFromUnknown(error, "执行 Current Team retention transition 失败。", true);
  }
}
