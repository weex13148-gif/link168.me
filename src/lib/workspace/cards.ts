import "server-only";
import { db } from "@/lib/db";
import { assertWorkspaceMember } from "@/lib/workspace";
import {
  canCreateWorkspaceCard,
  canPublishWorkspaceCard,
  canReadWorkspaceCard,
  canUpdateWorkspaceCard,
  type WorkspaceCardType,
} from "@/lib/workspace/card-policy";

export const WORKSPACE_CARD_TYPES = ["enterprise_home", "member_card"] as const;
export const WORKSPACE_CARD_STATUSES = ["draft", "published", "archived"] as const;
export const WORKSPACE_CARD_CONTACT_VISIBILITY = ["public", "members_only", "private"] as const;
export const WORKSPACE_CARD_TEMPLATES = ["business", "creator", "conversion"] as const;

export type WorkspaceCardStatus = (typeof WORKSPACE_CARD_STATUSES)[number];
export type WorkspaceCardContactVisibility = (typeof WORKSPACE_CARD_CONTACT_VISIBILITY)[number];
export type WorkspaceCardTemplate = (typeof WORKSPACE_CARD_TEMPLATES)[number];

export class WorkspaceCardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceCardError";
  }
}

export function isWorkspaceCardType(value: unknown): value is WorkspaceCardType {
  return typeof value === "string" && WORKSPACE_CARD_TYPES.includes(value as WorkspaceCardType);
}

export function isWorkspaceCardStatus(value: unknown): value is WorkspaceCardStatus {
  return typeof value === "string" && WORKSPACE_CARD_STATUSES.includes(value as WorkspaceCardStatus);
}

export function isWorkspaceCardContactVisibility(value: unknown): value is WorkspaceCardContactVisibility {
  return typeof value === "string"
    && WORKSPACE_CARD_CONTACT_VISIBILITY.includes(value as WorkspaceCardContactVisibility);
}

export function isWorkspaceCardTemplate(value: unknown): value is WorkspaceCardTemplate {
  return typeof value === "string" && WORKSPACE_CARD_TEMPLATES.includes(value as WorkspaceCardTemplate);
}

export async function assertWorkspaceCardMember(workspaceId: string, userId: string) {
  const check = await assertWorkspaceMember(workspaceId, userId, {
    minRole: "viewer",
    requireActive: true,
  });
  if (!check.allowed || !check.member) {
    throw new WorkspaceCardError(
      check.code || "WORKSPACE_CARD_ACCESS_DENIED",
      check.message || "无权访问该企业名片。",
      403,
    );
  }
  return check.member;
}

export async function assertWorkspaceCardTargetMember(workspaceId: string, memberUserId: string) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    select: { id: true, userId: true, role: true, status: true },
  });
  if (!member || member.status !== "active" || member.role === "viewer") {
    throw new WorkspaceCardError(
      "WORKSPACE_CARD_MEMBER_INVALID",
      "企业成员名片只能绑定当前企业的活跃所有者、管理员或成员。",
      400,
    );
  }
  return member;
}

export async function assertWorkspaceCardCreation(options: {
  workspaceId: string;
  actorUserId: string;
  cardType: WorkspaceCardType;
  memberUserId: string | null;
}) {
  const member = await assertWorkspaceCardMember(options.workspaceId, options.actorUserId);
  if (!canCreateWorkspaceCard(member.role, options.actorUserId, options.cardType, options.memberUserId)) {
    throw new WorkspaceCardError(
      "WORKSPACE_CARD_CREATE_DENIED",
      "无权创建该企业名片。",
      403,
    );
  }
  if (options.cardType === "enterprise_home" && options.memberUserId !== null) {
    throw new WorkspaceCardError(
      "WORKSPACE_CARD_MEMBER_SHAPE_INVALID",
      "企业主页不能绑定成员账号。",
      400,
    );
  }
  if (options.cardType === "member_card") {
    if (!options.memberUserId) {
      throw new WorkspaceCardError(
        "WORKSPACE_CARD_MEMBER_REQUIRED",
        "企业成员名片必须绑定成员账号。",
        400,
      );
    }
    await assertWorkspaceCardTargetMember(options.workspaceId, options.memberUserId);
  }
  return member;
}

export async function listVisibleWorkspaceCards(workspaceId: string, userId: string) {
  const member = await assertWorkspaceCardMember(workspaceId, userId);
  const cards = await db.workspaceCard.findMany({
    where: {
      workspaceId,
      status: { not: "archived" },
      ...(member.role === "owner" || member.role === "admin"
        ? {}
        : member.role === "member"
          ? {
              OR: [
                { cardType: "enterprise_home" },
                { cardType: "member_card", memberUserId: userId },
              ],
            }
          : { cardType: "enterprise_home" }),
    },
    orderBy: [{ cardType: "asc" }, { createdAt: "asc" }],
  });
  return { member, cards };
}

export async function assertWorkspaceCardAccess(options: {
  workspaceId: string;
  actorUserId: string;
  cardId: string;
  update?: boolean;
  publish?: boolean;
}) {
  const member = await assertWorkspaceCardMember(options.workspaceId, options.actorUserId);
  const card = await db.workspaceCard.findFirst({
    where: { id: options.cardId, workspaceId: options.workspaceId },
  });
  if (!card) {
    throw new WorkspaceCardError("WORKSPACE_CARD_NOT_FOUND", "企业名片不存在。", 404);
  }

  const cardType = card.cardType as WorkspaceCardType;
  if (options.publish && !canPublishWorkspaceCard(member.role)) {
    throw new WorkspaceCardError(
      "WORKSPACE_CARD_PUBLISH_DENIED",
      "只有企业所有者或管理员可以发布、下线或归档企业名片。",
      403,
    );
  }

  const allowed = options.update
    ? canUpdateWorkspaceCard(member.role, options.actorUserId, cardType, card.memberUserId)
    : canReadWorkspaceCard(member.role, options.actorUserId, cardType, card.memberUserId);
  if (!allowed) {
    throw new WorkspaceCardError(
      options.update ? "WORKSPACE_CARD_UPDATE_DENIED" : "WORKSPACE_CARD_READ_DENIED",
      options.update ? "无权修改该企业名片。" : "无权查看该企业名片。",
      403,
    );
  }

  return { member, card };
}

export async function loadWorkspaceCardComponents(workspaceId: string, cardId: string) {
  return db.workspaceCardComponent.findMany({
    where: { workspaceId, cardId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}
