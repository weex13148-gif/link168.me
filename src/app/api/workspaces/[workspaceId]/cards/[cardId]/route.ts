import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import {
  WorkspaceCardError,
  assertWorkspaceCardAccess,
  isWorkspaceCardContactVisibility,
  isWorkspaceCardStatus,
  isWorkspaceCardTemplate,
  loadWorkspaceCardComponents,
} from "@/lib/workspace/cards";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string; cardId: string }>;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return sanitizePublicText(value.trim().slice(0, maxLength)) || null;
}

function cleanUrl(value: unknown): string | null {
  const raw = cleanText(value, 2048);
  return raw ? sanitizePublicUrl(raw).url ?? null : null;
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

function componentDto(component: {
  id: string;
  workspaceId: string;
  cardId: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  payloadJson: string | null;
  position: number;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...component,
    createdAt: component.createdAt.toISOString(),
    updatedAt: component.updatedAt.toISOString(),
  };
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceCardError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[workspace-card] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业名片暂时不可用。", code: "WORKSPACE_CARD_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, cardId } = await context.params;

  try {
    const { card } = await assertWorkspaceCardAccess({
      workspaceId,
      actorUserId: user.id,
      cardId,
    });
    const components = await loadWorkspaceCardComponents(workspaceId, cardId);
    return NextResponse.json({
      success: true,
      card: { ...cardDto(card), components: components.map(componentDto) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, cardId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const requestsStatus = Object.prototype.hasOwnProperty.call(body, "status");

  try {
    const { card } = await assertWorkspaceCardAccess({
      workspaceId,
      actorUserId: user.id,
      cardId,
      update: true,
      publish: requestsStatus,
    });

    const nextStatus = requestsStatus && isWorkspaceCardStatus(body.status)
      ? body.status
      : card.status;
    if (requestsStatus && !isWorkspaceCardStatus(body.status)) {
      return NextResponse.json({ success: false, error: "名片状态不正确。" }, { status: 400 });
    }

    const statusChanged = nextStatus !== card.status;
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.workspaceCard.update({
        where: { id: cardId },
        data: {
          status: nextStatus,
          displayName: Object.prototype.hasOwnProperty.call(body, "displayName")
            ? cleanText(body.displayName, 100)
            : card.displayName,
          bio: Object.prototype.hasOwnProperty.call(body, "bio")
            ? cleanText(body.bio, 1000)
            : card.bio,
          avatarUrl: Object.prototype.hasOwnProperty.call(body, "avatarUrl")
            ? cleanUrl(body.avatarUrl)
            : card.avatarUrl,
          coverImageUrl: Object.prototype.hasOwnProperty.call(body, "coverImageUrl")
            ? cleanUrl(body.coverImageUrl)
            : card.coverImageUrl,
          company: Object.prototype.hasOwnProperty.call(body, "company")
            ? cleanText(body.company, 120)
            : card.company,
          jobTitle: Object.prototype.hasOwnProperty.call(body, "jobTitle")
            ? cleanText(body.jobTitle, 120)
            : card.jobTitle,
          phone: Object.prototype.hasOwnProperty.call(body, "phone")
            ? cleanText(body.phone, 50)
            : card.phone,
          email: Object.prototype.hasOwnProperty.call(body, "email")
            ? cleanText(body.email, 254)
            : card.email,
          wechat: Object.prototype.hasOwnProperty.call(body, "wechat")
            ? cleanText(body.wechat, 100)
            : card.wechat,
          city: Object.prototype.hasOwnProperty.call(body, "city")
            ? cleanText(body.city, 100)
            : card.city,
          address: Object.prototype.hasOwnProperty.call(body, "address")
            ? cleanText(body.address, 300)
            : card.address,
          website: Object.prototype.hasOwnProperty.call(body, "website")
            ? cleanUrl(body.website)
            : card.website,
          socialLinks: Object.prototype.hasOwnProperty.call(body, "socialLinks")
            && body.socialLinks
            && typeof body.socialLinks === "object"
            ? body.socialLinks
            : card.socialLinks,
          contactVisibility: isWorkspaceCardContactVisibility(body.contactVisibility)
            ? body.contactVisibility
            : card.contactVisibility,
          theme: Object.prototype.hasOwnProperty.call(body, "theme")
            ? cleanText(body.theme, 100) ?? card.theme
            : card.theme,
          customTheme: Object.prototype.hasOwnProperty.call(body, "customTheme")
            ? cleanText(body.customTheme, 5000)
            : card.customTheme,
          template: isWorkspaceCardTemplate(body.template) ? body.template : card.template,
          publishedAt: nextStatus === "published"
            ? card.publishedAt ?? new Date()
            : nextStatus === "draft"
              ? null
              : card.publishedAt,
        },
      });

      const action = statusChanged
        ? nextStatus === "published"
          ? "workspace.card.published"
          : nextStatus === "archived"
            ? "workspace.card.archived"
            : "workspace.card.unpublished"
        : "workspace.card.updated";
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action,
          targetType: "workspace_card",
          targetId: cardId,
          metadata: { previousStatus: card.status, status: nextStatus },
        },
      });
      return result;
    });

    const components = await loadWorkspaceCardComponents(workspaceId, cardId);
    return NextResponse.json({
      success: true,
      card: { ...cardDto(updated), components: components.map(componentDto) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
