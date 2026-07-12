import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sendWorkspaceInvitation } from "@/lib/mail";
import { assertWorkspaceMember, type WorkspaceRole } from "@/lib/workspace";
import {
  canGrantWorkspaceRole,
  canManageWorkspaceRole,
  getWorkspaceInvitationExpiry,
  hashWorkspaceInvitationToken,
  normalizeWorkspaceInvitationEmail,
} from "@/lib/workspace/invitation-policy";

const ROLE_LABELS: Record<Exclude<WorkspaceRole, "owner">, string> = {
  admin: "管理员",
  member: "成员",
  viewer: "查看者",
};

export class WorkspaceInvitationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceInvitationError";
  }
}

function serializeInvitation(invitation: {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  invitedByUserId: string;
  acceptedByUserId: string | null;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  deliveryErrorCode: string | null;
  createdAt: Date;
}) {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    invitedByUserId: invitation.invitedByUserId,
    acceptedByUserId: invitation.acceptedByUserId,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    deliveredAt: invitation.deliveredAt?.toISOString() ?? null,
    deliveryErrorCode: invitation.deliveryErrorCode,
    createdAt: invitation.createdAt.toISOString(),
  };
}

async function expirePendingInvitations(now = new Date()) {
  await db.workspaceInvitation.updateMany({
    where: { status: "pending", expiresAt: { lte: now } },
    data: { status: "expired" },
  });
}

export async function createWorkspaceInvitation(options: {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  email: unknown;
  role: unknown;
  ipHash?: string | null;
}) {
  const email = normalizeWorkspaceInvitationEmail(options.email);
  if (!email) {
    throw new WorkspaceInvitationError("INVALID_EMAIL", "请输入有效的邮箱地址。", 400);
  }

  const role = typeof options.role === "string" ? options.role : "member";
  const actor = await assertWorkspaceMember(options.workspaceId, options.actorUserId, {
    minRole: "admin",
    requireActive: true,
  });
  if (!actor.allowed || !actor.member) {
    throw new WorkspaceInvitationError(actor.code || "WORKSPACE_ACCESS_DENIED", actor.message || "无权邀请成员。", 403);
  }
  if (!canGrantWorkspaceRole(actor.member.role, role)) {
    throw new WorkspaceInvitationError(
      "WORKSPACE_ROLE_NOT_GRANTABLE",
      actor.member.role === "admin" ? "管理员只能邀请成员或查看者。" : "无权授予该角色。",
      403,
    );
  }
  if (email === options.actorEmail.trim().toLowerCase()) {
    throw new WorkspaceInvitationError("CANNOT_INVITE_SELF", "不能邀请自己。", 400);
  }

  const workspace = await db.workspace.findFirst({
    where: { id: options.workspaceId, isActive: true },
    select: { id: true, name: true },
  });
  if (!workspace) {
    throw new WorkspaceInvitationError("WORKSPACE_NOT_FOUND", "工作空间不存在或已停用。", 404);
  }

  const invitee = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (invitee) {
    const existingMember = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: options.workspaceId, userId: invitee.id } },
      select: { status: true },
    });
    if (existingMember?.status === "active") {
      throw new WorkspaceInvitationError("MEMBER_ALREADY_EXISTS", "该用户已是工作空间成员。", 409);
    }
    if (existingMember?.status === "disabled") {
      throw new WorkspaceInvitationError("MEMBER_DISABLED", "该成员已被禁用，请直接恢复成员资格。", 409);
    }
  }

  await expirePendingInvitations();

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashWorkspaceInvitationToken(token);
  const now = new Date();
  let invitation;
  try {
    invitation = await db.$transaction(async (tx) => {
      await tx.workspaceInvitation.updateMany({
        where: { workspaceId: options.workspaceId, email, status: "pending" },
        data: { status: "revoked" },
      });
      return tx.workspaceInvitation.create({
        data: {
          workspaceId: options.workspaceId,
          email,
          role,
          tokenHash,
          status: "pending",
          expiresAt: getWorkspaceInvitationExpiry(now),
          invitedByUserId: options.actorUserId,
        },
      });
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      throw new WorkspaceInvitationError("INVITATION_CONFLICT", "该邮箱已有待处理邀请，请稍后重试。", 409);
    }
    throw error;
  }

  const sent = await sendWorkspaceInvitation({
    email,
    workspaceName: workspace.name,
    inviterEmail: options.actorEmail,
    roleLabel: ROLE_LABELS[role as Exclude<WorkspaceRole, "owner">],
    token,
  });

  await db.emailSendLog.create({
    data: {
      id: crypto.randomUUID(),
      email,
      purpose: "workspace-invite",
      success: sent.success,
      provider: sent.mode,
      errorCode: sent.success ? null : sent.errorCode || "EMAIL_SEND_FAILED",
      ipHash: options.ipHash || null,
    },
  }).catch(() => undefined);

  if (!sent.success) {
    await db.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: "pending" },
      data: {
        status: "delivery_failed",
        deliveryErrorCode: sent.errorCode || "EMAIL_SEND_FAILED",
      },
    });
    throw new WorkspaceInvitationError(
      sent.errorCode || "EMAIL_SEND_FAILED",
      sent.errorCode === "SMTP_NOT_CONFIGURED"
        ? "邀请已保存但邮件服务尚未配置，未向对方发送邀请。"
        : "邀请邮件发送失败，请稍后重新发送。",
      502,
    );
  }

  const delivered = await db.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { deliveredAt: new Date(), deliveryErrorCode: null },
  });

  return serializeInvitation(delivered);
}

export async function listWorkspaceInvitations(workspaceId: string, actorUserId: string) {
  const actor = await assertWorkspaceMember(workspaceId, actorUserId, { minRole: "admin", requireActive: true });
  if (!actor.allowed || !actor.member) {
    throw new WorkspaceInvitationError(actor.code || "WORKSPACE_ACCESS_DENIED", actor.message || "无权查看邀请。", 403);
  }
  await expirePendingInvitations();
  const invitations = await db.workspaceInvitation.findMany({
    where: { workspaceId, status: { in: ["pending", "delivery_failed"] } },
    orderBy: { createdAt: "desc" },
  });
  return invitations.map(serializeInvitation);
}

export async function revokeWorkspaceInvitation(options: {
  workspaceId: string;
  invitationId: string;
  actorUserId: string;
}) {
  const actor = await assertWorkspaceMember(options.workspaceId, options.actorUserId, {
    minRole: "admin",
    requireActive: true,
  });
  if (!actor.allowed || !actor.member) {
    throw new WorkspaceInvitationError(actor.code || "WORKSPACE_ACCESS_DENIED", actor.message || "无权撤销邀请。", 403);
  }
  const invitation = await db.workspaceInvitation.findFirst({
    where: { id: options.invitationId, workspaceId: options.workspaceId },
  });
  if (!invitation) {
    throw new WorkspaceInvitationError("INVITATION_NOT_FOUND", "邀请不存在。", 404);
  }
  if (!canManageWorkspaceRole(actor.member.role, invitation.role)) {
    throw new WorkspaceInvitationError("INSUFFICIENT_HIERARCHY", "无权撤销该角色的邀请。", 403);
  }
  if (!['pending', 'delivery_failed'].includes(invitation.status)) {
    throw new WorkspaceInvitationError("INVITATION_NOT_REVOCABLE", "当前邀请状态不可撤销。", 400);
  }
  const updated = await db.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { status: "revoked" },
  });
  return serializeInvitation(updated);
}

export async function listUserWorkspaceInvitations(userEmail: string) {
  const email = normalizeWorkspaceInvitationEmail(userEmail);
  if (!email) return [];
  await expirePendingInvitations();
  const invitations = await db.workspaceInvitation.findMany({
    where: { email, status: "pending", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const workspaceIds = [...new Set(invitations.map((item) => item.workspaceId))];
  const workspaces = await db.workspace.findMany({
    where: { id: { in: workspaceIds }, isActive: true },
    select: { id: true, name: true, description: true },
  });
  const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  return invitations
    .filter((item) => workspaceMap.has(item.workspaceId))
    .map((item) => ({
      ...serializeInvitation(item),
      workspace: workspaceMap.get(item.workspaceId)!,
    }));
}

export async function getWorkspaceInvitationPreview(token: string) {
  const tokenHash = hashWorkspaceInvitationToken(token);
  await expirePendingInvitations();
  const invitation = await db.workspaceInvitation.findUnique({ where: { tokenHash } });
  if (!invitation) return null;
  const workspace = await db.workspace.findUnique({
    where: { id: invitation.workspaceId },
    select: { id: true, name: true, description: true, isActive: true },
  });
  if (!workspace) return null;
  return {
    ...serializeInvitation(invitation),
    workspace,
  };
}

export async function acceptWorkspaceInvitation(options: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const tokenHash = hashWorkspaceInvitationToken(options.token);
  const email = normalizeWorkspaceInvitationEmail(options.userEmail);
  if (!email) {
    throw new WorkspaceInvitationError("INVALID_ACCOUNT_EMAIL", "当前账号邮箱无效。", 400);
  }
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const invitation = await tx.workspaceInvitation.findUnique({ where: { tokenHash } });
    if (!invitation) return { kind: "not_found" as const };
    if (invitation.status !== "pending") return { kind: "unavailable" as const, status: invitation.status };
    if (invitation.expiresAt.getTime() <= now.getTime()) {
      await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
      return { kind: "expired" as const };
    }
    if (invitation.email !== email) {
      return { kind: "email_mismatch" as const, expectedEmail: invitation.email };
    }

    const workspace = await tx.workspace.findFirst({
      where: { id: invitation.workspaceId, isActive: true },
      select: { id: true, name: true },
    });
    if (!workspace) return { kind: "workspace_unavailable" as const };

    const existing = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: options.userId } },
    });
    if (existing?.status === "disabled") return { kind: "member_disabled" as const };

    const claimed = await tx.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: "pending", expiresAt: { gt: now } },
      data: {
        status: "accepted",
        acceptedByUserId: options.userId,
        acceptedAt: now,
      },
    });
    if (claimed.count !== 1) return { kind: "unavailable" as const, status: "claimed" };

    let member = existing;
    if (!existing || existing.status !== "active") {
      member = await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: options.userId } },
        create: {
          workspaceId: invitation.workspaceId,
          userId: options.userId,
          role: invitation.role,
          status: "active",
          invitedBy: invitation.invitedByUserId,
          invitedAt: invitation.createdAt,
          joinedAt: now,
        },
        update: {
          role: invitation.role,
          status: "active",
          invitedBy: invitation.invitedByUserId,
          invitedAt: invitation.createdAt,
          joinedAt: now,
          disabledAt: null,
          removedAt: null,
        },
      });
    }

    await tx.workspaceInvitation.updateMany({
      where: {
        workspaceId: invitation.workspaceId,
        email,
        status: "pending",
        id: { not: invitation.id },
      },
      data: { status: "revoked" },
    });

    return {
      kind: "accepted" as const,
      workspace,
      member: {
        id: member!.id,
        workspaceId: member!.workspaceId,
        userId: member!.userId,
        role: member!.role,
        status: member!.status,
        joinedAt: member!.joinedAt?.toISOString() ?? null,
      },
    };
  });

  if (result.kind === "not_found") {
    throw new WorkspaceInvitationError("INVITATION_NOT_FOUND", "邀请不存在。", 404);
  }
  if (result.kind === "expired") {
    throw new WorkspaceInvitationError("INVITATION_EXPIRED", "邀请已过期，请联系企业管理员重新发送。", 410);
  }
  if (result.kind === "email_mismatch") {
    throw new WorkspaceInvitationError(
      "INVITATION_EMAIL_MISMATCH",
      `请使用受邀邮箱 ${result.expectedEmail} 登录后接受邀请。`,
      403,
    );
  }
  if (result.kind === "workspace_unavailable") {
    throw new WorkspaceInvitationError("WORKSPACE_UNAVAILABLE", "企业工作空间不存在或已停用。", 410);
  }
  if (result.kind === "member_disabled") {
    throw new WorkspaceInvitationError("MEMBER_DISABLED", "你的成员资格已被禁用，请联系企业管理员恢复。", 403);
  }
  if (result.kind === "unavailable") {
    throw new WorkspaceInvitationError("INVITATION_UNAVAILABLE", "邀请已使用、已撤销或当前不可用。", 409);
  }
  return result;
}
