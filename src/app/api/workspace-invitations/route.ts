import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { listUserWorkspaceInvitations } from "@/lib/workspace/invitations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const invitations = await listUserWorkspaceInvitations(user.email);
    return NextResponse.json({ success: true, invitations });
  } catch {
    return NextResponse.json(
      { success: false, error: "邀请列表暂时无法加载。", code: "INVITATION_LIST_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
