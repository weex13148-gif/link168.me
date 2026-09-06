import { currentDb } from "@/lib/current/data/prisma-current";

export const CURRENT_A4_AUDIT_ACTION = {
  TEAM_OWNER_TRANSFER_INITIATED: "current.team.owner_transfer.initiated",
  TEAM_OWNER_TRANSFER_CONFIRMED: "current.team.owner_transfer.confirmed",
  TEAM_OWNER_TRANSFER_CANCELLED: "current.team.owner_transfer.cancelled",
  TEAM_DISSOLVED: "current.team.lifecycle.dissolved",
  TEAM_RESTORED: "current.team.lifecycle.restored",
  TEAM_RETENTION_FINALIZED: "current.team.lifecycle.retention_finalized",
  TEAM_LEGAL_HOLD_APPLIED: "current.team.lifecycle.legal_hold_applied",
  TEAM_LEGAL_HOLD_RELEASED: "current.team.lifecycle.legal_hold.released",
} as const;

export type ParsedAuditEvent<T = Record<string, unknown>> = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorIdentityId: string | null;
  createdAt: Date;
  idempotencyKey: string | null;
  metadata: T | null;
};

function parseMetadata<T>(metadata: unknown): T | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as T;
}

export async function readAuditEvents<T = Record<string, unknown>>(params: {
  targetType: string;
  targetId: string;
  actions?: readonly string[];
  limit?: number;
}): Promise<ParsedAuditEvent<T>[]> {
  const rows = await currentDb.currentAuditLog.findMany({
    where: {
      targetType: params.targetType,
      targetId: params.targetId,
      ...(params.actions?.length ? { action: { in: [...params.actions] } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: params.limit ?? 200,
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    actorIdentityId: row.actorIdentityId,
    createdAt: row.createdAt,
    idempotencyKey: row.idempotencyKey,
    metadata: parseMetadata<T>(row.metadata),
  }));
}

export async function findAuditEventByIdempotency<T = Record<string, unknown>>(params: {
  action: string;
  targetType: string;
  targetId: string;
  idempotencyKey: string;
}): Promise<ParsedAuditEvent<T> | null> {
  const row = await currentDb.currentAuditLog.findFirst({
    where: {
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      idempotencyKey: params.idempotencyKey,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (!row) return null;
  return {
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    actorIdentityId: row.actorIdentityId,
    createdAt: row.createdAt,
    idempotencyKey: row.idempotencyKey,
    metadata: parseMetadata<T>(row.metadata),
  };
}
