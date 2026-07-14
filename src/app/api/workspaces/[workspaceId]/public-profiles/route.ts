import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertWorkspaceMember, roleAtLeast } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;

  const check = await assertWorkspaceMember(workspaceId, user.id, { minRole: "member", requireActive: true });
  if (!check.allowed) {
    return NextResponse.json({ success: false, error: check.message, code: check.code }, { status: 403 });
  }

  const isAdmin = roleAtLeast(check.member!.role, "admin");

  if (isAdmin) {
    const members = await db.workspaceMember.findMany({
      where: { workspaceId, status: "active" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                isPublic: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      profiles: members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        role: m.role,
        profile: m.user.profile
          ? {
              id: m.user.profile.id,
              username: m.user.profile.username,
              displayName: m.user.profile.displayName,
              bio: m.user.profile.bio,
              avatarUrl: m.user.profile.avatarUrl,
              isPublic: m.user.profile.isPublic,
            }
          : null,
      })),
    });
  } else {
    const member = await db.workspaceMember.findUnique({
      where: { id: check.member!.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                isPublic: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: "成员记录不存在。" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profiles: [
        {
          userId: member.userId,
          email: member.user.email,
          role: member.role,
          profile: member.user.profile
            ? {
                id: member.user.profile.id,
                username: member.user.profile.username,
                displayName: member.user.profile.displayName,
                bio: member.user.profile.bio,
                avatarUrl: member.user.profile.avatarUrl,
                isPublic: member.user.profile.isPublic,
              }
            : null,
        },
      ],
    });
  }
}