import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isValidSlug,
  sanitizeSlug,
  getUserWorkspaces,
} from "@/lib/workspace";

export const runtime = "nodejs";

function isMissingWorkspaceTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return maybeError.code === "P2021"
    || (typeof maybeError.message === "string" && maybeError.message.includes("public.workspaces"));
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let workspaces: Awaited<ReturnType<typeof getUserWorkspaces>>;
  try {
    workspaces = await getUserWorkspaces(user.id);
  } catch (error) {
    if (isMissingWorkspaceTableError(error)) {
      return NextResponse.json({
        success: true,
        workspaces: [],
        message: "企业工作空间暂未完成数据库初始化，当前版本作为保留入口展示。",
      });
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    workspaces: workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      workspaceType: ws.workspaceType,
      planCode: ws.planCode,
      isActive: ws.isActive,
      myRole: ws.members[0]?.role ?? null,
      myStatus: ws.members[0]?.status ?? null,
      joinedAt: ws.members[0]?.joinedAt?.toISOString() ?? null,
      invitedAt: ws.members[0]?.invitedAt?.toISOString() ?? null,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
    workspaceType?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2 || name.length > 50) {
    return NextResponse.json({ success: false, error: "工作空间名称必须为 2-50 个字符。" }, { status: 400 });
  }

  const rawSlug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  let slug: string;
  if (rawSlug) {
    if (!isValidSlug(rawSlug)) {
      return NextResponse.json(
        { success: false, error: "自定义链接后缀必须是 3-32 个字符，仅限小写字母、数字和 -。" },
        { status: 400 },
      );
    }
    let existing: Awaited<ReturnType<typeof db.workspace.findUnique>>;
    try {
      existing = await db.workspace.findUnique({ where: { slug: rawSlug } });
    } catch (error) {
      if (isMissingWorkspaceTableError(error)) {
        return NextResponse.json(
          { success: false, error: "企业工作空间暂未完成数据库初始化，请部署 migration 后再创建。" },
          { status: 503 },
        );
      }
      throw error;
    }
    if (existing) {
      return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个。" }, { status: 409 });
    }
    slug = rawSlug;
  } else {
    const baseSlug = sanitizeSlug(name);
    let attempts = 0;
    slug = baseSlug;
    while (attempts < 5) {
      let conflict: Awaited<ReturnType<typeof db.workspace.findUnique>>;
      try {
        conflict = await db.workspace.findUnique({ where: { slug } });
      } catch (error) {
        if (isMissingWorkspaceTableError(error)) {
          return NextResponse.json(
            { success: false, error: "企业工作空间暂未完成数据库初始化，请部署 migration 后再创建。" },
            { status: 503 },
          );
        }
        throw error;
      }
      if (!conflict) break;
      const suffix = crypto.randomBytes(2).toString("hex").toLowerCase();
      slug = `${baseSlug.slice(0, 26)}-${suffix}`;
      attempts++;
    }
  }

  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;
  const workspaceType =
    typeof body.workspaceType === "string" && ["personal", "team", "enterprise"].includes(body.workspaceType)
      ? body.workspaceType
      : "team";

  const workspaceId = crypto.randomUUID();

  let workspace: Awaited<ReturnType<typeof db.workspace.create>>;
  try {
    workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          id: workspaceId,
          name,
          slug,
          description,
          workspaceType,
          planCode: "free",
          ownerId: user.id,
          isActive: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: user.id,
          role: "owner",
          status: "active",
          invitedBy: user.id,
          joinedAt: new Date(),
        },
      });

      return ws;
    });
  } catch (error) {
    if (isMissingWorkspaceTableError(error)) {
      return NextResponse.json(
        { success: false, error: "企业工作空间暂未完成数据库初始化，请部署 migration 后再创建。" },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      workspaceType: workspace.workspaceType,
      planCode: workspace.planCode,
      isActive: workspace.isActive,
      myRole: "owner",
      myStatus: "active",
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    },
  });
}
