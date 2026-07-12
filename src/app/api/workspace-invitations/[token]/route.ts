import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import {
  WorkspaceInvitationError,
  acceptWorkspaceInvitation,
  getWorkspaceInvitationPreview,
} from "@/lib/workspace/invitations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function invitationErrorResponse(error: unknown) {
  if (error instanceof WorkspaceInvitationError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { success: false, error: "企业邀请服务暂时不可用。", code: "INVITATION_SERVICE_UNAVAILABLE" },
    { status: 503 },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { token } = await context.params;
  try {
    const invitation = await getWorkspaceInvitationPreview(token);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "邀请不存在。", code: "INVITATION_NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        matchesCurrentEmail: invitation.email === user.email.trim().toLowerCase(),
      },
    });
  } catch (error) {
    return invitationErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { token } = await context.params;
  try {
    const accepted = await acceptWorkspaceInvitation({
      token,
      userId: user.id,
      userEmail: user.email,
    });
    return NextResponse.json({
      success: true,
      workspace: accepted.workspace,
      member: accepted.member,
      redirectTo: "/console/account/enterprise",
      message: "邀请已接受，你现在可以访问该企业工作空间。",
    });
  } catch (error) {
    return invitationErrorResponse(error);
  }
}
