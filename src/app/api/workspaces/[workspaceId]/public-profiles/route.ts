import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { assertWorkspaceMember } from "@/lib/workspace";
import {
  createWorkspacePublicProfile,
  updateWorkspacePublicProfileSlug,
  setWorkspacePublicProfileStatus,
  getWorkspacePublicProfiles,
} from "@/lib/domains";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

async function assertProfileManager(request: Request, workspaceId: string) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return { user: null, error: response };

  const access = await assertWorkspaceMember(workspaceId, user.id, {
    minRole: "admin",
    requireActive: true,
  });
  if (!access.allowed || !access.member) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          code: access.code,
          message: access.message ?? "无权管理该企业员工名片",
        },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

async function assertProfileReader(request: Request, workspaceId: string) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return { user: null, error: response };

  const access = await assertWorkspaceMember(workspaceId, user.id, {
    minRole: "viewer",
    requireActive: true,
  });
  if (!access.allowed || !access.member) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          code: access.code,
          message: access.message ?? "无权查看该企业员工名片",
        },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

export async function GET(request: Request, { params }: Props) {
  try {
    const workspaceId = (await params).workspaceId;

    const { user, error } = await assertProfileReader(request, workspaceId);
    if (error) return error;
    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "未登录" },
        { status: 401 },
      );
    }

    const profiles = await getWorkspacePublicProfiles(workspaceId);
    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    console.error("[public-profiles] 获取员工名片列表失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    const workspaceId = (await params).workspaceId;

    const { user, error } = await assertProfileManager(request, workspaceId);
    if (error) return error;
    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "未登录" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string;

    switch (action) {
      case "create": {
        const userId = body.userId as string;
        const slug = body.slug as string;
        if (!userId) {
          return NextResponse.json(
            { success: false, code: "USER_ID_REQUIRED", message: "请提供员工 userId" },
            { status: 400 },
          );
        }
        if (!slug) {
          return NextResponse.json(
            { success: false, code: "SLUG_REQUIRED", message: "请提供员工名片 slug" },
            { status: 400 },
          );
        }
        const result = await createWorkspacePublicProfile(workspaceId, userId, slug);
        return NextResponse.json({ success: true, profile: result });
      }

      case "update-slug": {
        const profileId = body.profileId as string;
        const slug = body.slug as string;
        if (!profileId) {
          return NextResponse.json(
            { success: false, code: "PROFILE_ID_REQUIRED", message: "请提供名片 ID" },
            { status: 400 },
          );
        }
        if (!slug) {
          return NextResponse.json(
            { success: false, code: "SLUG_REQUIRED", message: "请提供新的 slug" },
            { status: 400 },
          );
        }
        const result = await updateWorkspacePublicProfileSlug(profileId, workspaceId, slug);
        return NextResponse.json({ success: true, profile: result });
      }

      case "set-status": {
        const profileId = body.profileId as string;
        const status = body.status as "active" | "disabled" | "removed";
        if (!profileId) {
          return NextResponse.json(
            { success: false, code: "PROFILE_ID_REQUIRED", message: "请提供名片 ID" },
            { status: 400 },
          );
        }
        if (!status || !["active", "disabled", "removed"].includes(status)) {
          return NextResponse.json(
            { success: false, code: "INVALID_STATUS", message: "无效的状态值" },
            { status: 400 },
          );
        }
        const result = await setWorkspacePublicProfileStatus(profileId, workspaceId, status);
        return NextResponse.json({ success: true, profile: result });
      }

      default:
        return NextResponse.json(
          { success: false, code: "INVALID_ACTION", message: "无效的操作类型" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[public-profiles] 操作失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}
