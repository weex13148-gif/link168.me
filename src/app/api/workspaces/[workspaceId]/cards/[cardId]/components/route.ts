import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import {
  WorkspaceCardError,
  assertWorkspaceCardAccess,
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
  console.error("[workspace-card-components] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业名片组件暂时不可用。", code: "WORKSPACE_CARD_COMPONENT_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, cardId } = await context.params;

  try {
    await assertWorkspaceCardAccess({ workspaceId, actorUserId: user.id, cardId });
    const components = await loadWorkspaceCardComponents(workspaceId, cardId);
    return NextResponse.json({ success: true, components: components.map(componentDto) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, cardId } = await context.params;

  try {
    await assertWorkspaceCardAccess({
      workspaceId,
      actorUserId: user.id,
      cardId,
      update: true,
    });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const title = cleanText(body.title, 160);
    if (!title) {
      return NextResponse.json({ success: false, error: "请输入组件标题。" }, { status: 400 });
    }
    const type = cleanText(body.type, 80) ?? "link";
    const component = await db.$transaction(async (tx) => {
      const created = await tx.workspaceCardComponent.create({
        data: {
          workspaceId,
          cardId,
          type,
          title,
          description: cleanText(body.description, 1000),
          url: cleanUrl(body.url),
          payloadJson: typeof body.payloadJson === "string"
            ? body.payloadJson.slice(0, 20_000)
            : body.payloadJson && typeof body.payloadJson === "object"
              ? JSON.stringify(body.payloadJson).slice(0, 20_000)
              : null,
          position: typeof body.position === "number" ? Math.max(0, Math.floor(body.position)) : 0,
          isActive: typeof body.isActive === "boolean" ? body.isActive : true,
          createdByUserId: user.id,
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.card.component.created",
          targetType: "workspace_card_component",
          targetId: created.id,
          metadata: { cardId, type },
        },
      });
      return created;
    });

    return NextResponse.json({ success: true, component: componentDto(component) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, cardId } = await context.params;

  try {
    await assertWorkspaceCardAccess({
      workspaceId,
      actorUserId: user.id,
      cardId,
      update: true,
    });

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const componentId = typeof body.componentId === "string" ? body.componentId : "";
    if (!componentId) {
      return NextResponse.json({ success: false, error: "缺少组件ID。" }, { status: 400 });
    }
    const existing = await db.workspaceCardComponent.findFirst({
      where: { id: componentId, workspaceId, cardId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "企业名片组件不存在。" }, { status: 404 });
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.workspaceCardComponent.update({
        where: { id: componentId },
        data: {
          type: Object.prototype.hasOwnProperty.call(body, "type")
            ? cleanText(body.type, 80) ?? existing.type
            : existing.type,
          title: Object.prototype.hasOwnProperty.call(body, "title")
            ? cleanText(body.title, 160) ?? existing.title
            : existing.title,
          description: Object.prototype.hasOwnProperty.call(body, "description")
            ? cleanText(body.description, 1000)
            : existing.description,
          url: Object.prototype.hasOwnProperty.call(body, "url") ? cleanUrl(body.url) : existing.url,
          payloadJson: Object.prototype.hasOwnProperty.call(body, "payloadJson")
            ? typeof body.payloadJson === "string"
              ? body.payloadJson.slice(0, 20_000)
              : body.payloadJson && typeof body.payloadJson === "object"
                ? JSON.stringify(body.payloadJson).slice(0, 20_000)
                : null
            : existing.payloadJson,
          position: typeof body.position === "number"
            ? Math.max(0, Math.floor(body.position))
            : existing.position,
          isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.card.component.updated",
          targetType: "workspace_card_component",
          targetId: componentId,
          metadata: { cardId },
        },
      });
      return result;
    });

    return NextResponse.json({ success: true, component: componentDto(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
