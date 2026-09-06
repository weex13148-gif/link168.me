import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/contact-entry-domain";
import { assertWorkspaceMember } from "@/lib/workspace";
import { workspaceLeadReadWhere } from "@/lib/workspace-lead-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId } = await context.params;
  if (!isUuid(workspaceId)) {
    return NextResponse.json({ success: false, error: "工作空间 ID 格式不正确。" }, { status: 400 });
  }
  const access = await assertWorkspaceMember(workspaceId, user.id, { minRole: "member", requireActive: true });
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.message, code: access.code }, { status: 403 });
  }

  if (!access.member || !["owner", "admin", "member"].includes(access.member.role)) {
    return NextResponse.json({ success: false, error: "无权查看团队线索。" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const assignment = searchParams.get("assignment");
  const accessWhere = workspaceLeadReadWhere({
    workspaceId,
    userId: user.id,
    role: access.member.role as "owner" | "admin" | "member",
  });
  const assignmentWhere = assignment === "unclaimed"
    ? { claimedByUserId: null }
    : assignment === "mine"
      ? { claimedByUserId: user.id }
      : {};
  const where = { AND: [accessWhere, assignmentWhere] };

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contactEntry: { select: { id: true, title: true, payloadJson: true } },
      followUps: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return NextResponse.json({
    success: true,
    workspaceId,
    myRole: access.member?.role,
    leads: leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      wechat: lead.wechat,
      message: lead.message,
      status: lead.status,
      claimedByUserId: lead.claimedByUserId,
      sourceComponent: lead.sourceComponent,
      sourcePage: lead.sourcePage,
      contactEntry: lead.contactEntry ? {
        id: lead.contactEntry.id,
        title: lead.contactEntry.title,
        payload: lead.contactEntry.payloadJson,
      } : null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      followUps: lead.followUps.map((followUp) => ({
        id: followUp.id,
        content: followUp.content,
        createdByUserId: followUp.createdByUserId,
        createdAt: followUp.createdAt.toISOString(),
      })),
    })),
  });
}
