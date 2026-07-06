import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspaces } from "@/lib/workspace";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const allWorkspaces = await getUserWorkspaces(user.id);

  const enterpriseWorkspaces = allWorkspaces.filter(
    (ws) => ws.workspaceType === "enterprise" && ws.isActive,
  );

  return NextResponse.json({
    success: true,
    organizations: enterpriseWorkspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      planCode: ws.planCode,
      myRole: ws.members[0]?.role ?? null,
      myStatus: ws.members[0]?.status ?? null,
      joinedAt: ws.members[0]?.joinedAt?.toISOString() ?? null,
      createdAt: ws.createdAt.toISOString(),
    })),
  });
}
