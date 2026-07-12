import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  WorkspaceInvitationError,
  createWorkspaceInvitation,
  listWorkspaceInvitations,
  revokeWorkspaceInvitation,
} from "@/lib/workspace/invitations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

function invitationErrorResponse(error: unknown) {
  if (error instanceof WorkspaceInvitationError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { success: false, error: "企业邀请服务暂时不可用，请稍后重试。", code: "INVITATION_SERVICE_UNAVAILABLE" },
    { status: 503 },
  );
}

function requestIpHash(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || request.headers.get("cf-connecting-ip")
    || "";
  return ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  try {
    const invitations = await listWorkspaceInvitations(workspaceId, user.id);
    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    return invitationErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const limited = await rateLimit(request, "workspace:invite", 20, 60 * 60 * 1000);
  if (!limited.passed) {
    return NextResponse.json(
      { success: false, error: "邀请操作过于频繁，请稍后再试。", code: "INVITATION_RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  try {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      actorUserId: user.id,
      actorEmail: user.email,
      email: body.email,
      role: body.role,
      ipHash: requestIpHash(request),
    });
    return NextResponse.json(
      { success: true, invitation, message: "邀请邮件已发送，对方接受后才会获得企业访问权。" },
      { status: 201 },
    );
  } catch (error) {
    return invitationErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: { invitationId?: unknown; action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const invitationId = typeof body.invitationId === "string" ? body.invitationId : "";
  if (!invitationId) {
    return NextResponse.json({ success: false, error: "缺少邀请 ID。" }, { status: 400 });
  }
  if (body.action !== "revoke") {
    return NextResponse.json({ success: false, error: "未知邀请操作。" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  try {
    const invitation = await revokeWorkspaceInvitation({ workspaceId, invitationId, actorUserId: user.id });
    return NextResponse.json({ success: true, invitation, message: "邀请已撤销。" });
  } catch (error) {
    return invitationErrorResponse(error);
  }
}
