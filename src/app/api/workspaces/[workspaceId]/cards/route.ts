import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireDashboardUser } from "@/lib/auth";
import { sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import {
  WorkspaceCardError,
  assertWorkspaceCardCreation,
  isWorkspaceCardContactVisibility,
  isWorkspaceCardTemplate,
  isWorkspaceCardType,
  listVisibleWorkspaceCards,
  loadWorkspaceCardComponents,
} from "@/lib/workspace/cards";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string }> };

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return sanitizePublicText(value.trim().slice(0, maxLength)) || null;
}

function cleanUrl(value: unknown): string | null {
  const raw = cleanText(value, 2048);
  return raw ? sanitizePublicUrl(raw).url ?? null : null;
}

function cleanJsonObject(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function cardDto(card: {
  id: string;
  workspaceId: string;
  cardType: string;
  memberUserId: string | null;
  status: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  socialLinks: unknown;
  contactVisibility: string;
  theme: string;
  customTheme: string | null;
  template: string;
  createdByUserId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...card,
    publishedAt: card.publishedAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceCardError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[workspace-cards] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业名片服务暂时不可用。", code: "WORKSPACE_CARD_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  try {
    const { cards } = await listVisibleWorkspaceCards(workspaceId, user.id);
    return NextResponse.json({ success: true, cards: cards.map(cardDto) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  if (!isWorkspaceCardType(body.cardType)) {
    return NextResponse.json({ success: false, error: "企业名片类型不正确。" }, { status: 400 });
  }

  const cardType = body.cardType;
  const memberUserId = cardType === "member_card"
    ? typeof body.memberUserId === "string" && body.memberUserId.trim()
      ? body.memberUserId.trim()
      : user.id
    : null;

  try {
    await assertWorkspaceCardCreation({
      workspaceId,
      actorUserId: user.id,
      cardType,
      memberUserId,
    });

    const existing = await db.workspaceCard.findFirst({
      where: cardType === "enterprise_home"
        ? { workspaceId, cardType: "enterprise_home" }
        : { workspaceId, cardType: "member_card", memberUserId },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: cardType === "enterprise_home" ? "当前企业已经存在企业主页。" : "该成员已经存在企业名片。",
          code: cardType === "enterprise_home" ? "WORKSPACE_ENTERPRISE_HOME_EXISTS" : "WORKSPACE_MEMBER_CARD_EXISTS",
        },
        { status: 409 },
      );
    }

    const displayName = cleanText(body.displayName, 100);
    if (!displayName) {
      return NextResponse.json({ success: false, error: "请输入名片名称。" }, { status: 400 });
    }

    const socialLinks = cleanJsonObject(body.socialLinks);
    const cardId = crypto.randomUUID();
    const card = await db.$transaction(async (tx) => {
      const created = await tx.workspaceCard.create({
        data: {
          id: cardId,
          workspaceId,
          cardType,
          memberUserId,
          status: "draft",
          displayName,
          bio: cleanText(body.bio, 1000),
          avatarUrl: cleanUrl(body.avatarUrl),
          coverImageUrl: cleanUrl(body.coverImageUrl),
          company: cleanText(body.company, 120),
          jobTitle: cleanText(body.jobTitle, 120),
          phone: cleanText(body.phone, 50),
          email: cleanText(body.email, 254),
          wechat: cleanText(body.wechat, 100),
          city: cleanText(body.city, 100),
          address: cleanText(body.address, 300),
          website: cleanUrl(body.website),
          socialLinks,
          contactVisibility: isWorkspaceCardContactVisibility(body.contactVisibility)
            ? body.contactVisibility
            : "public",
          theme: cleanText(body.theme, 100) ?? "default",
          customTheme: cleanText(body.customTheme, 5000),
          template: isWorkspaceCardTemplate(body.template) ? body.template : "business",
          createdByUserId: user.id,
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.card.created",
          targetType: "workspace_card",
          targetId: cardId,
          metadata: { cardType, memberUserId },
        },
      });
      return created;
    });

    const components = await loadWorkspaceCardComponents(workspaceId, card.id);
    return NextResponse.json(
      { success: true, card: { ...cardDto(card), components } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
