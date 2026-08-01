import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { isUuid } from "@/lib/contact-entry-domain";
import { newId } from "@/lib/dashboard-data";
import { db } from "@/lib/db";
import { assertWorkspaceMember, roleAtLeast } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ workspaceId: string; leadId: string }> };

const VALID_STATUSES = new Set(["new", "viewed", "following_up", "won", "closed"]);

function cleanNote(value: unknown) {
  if (typeof value !== "string") return null;
  const note = sanitizePublicText(value.trim().slice(0, 2000));
  return note || null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { workspaceId, leadId } = await context.params;
  if (!isUuid(workspaceId) || !isUuid(leadId)) {
    return NextResponse.json({ success: false, error: "工作空间或线索 ID 格式不正确。" }, { status: 400 });
  }
  const access = await assertWorkspaceMember(workspaceId, user.id, { minRole: "member", requireActive: true });
  if (!access.allowed || !access.member) {
    return NextResponse.json({ success: false, error: access.message, code: access.code }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!lead) return NextResponse.json({ success: false, error: "团队线索不存在。" }, { status: 404 });

  const action = typeof body.action === "string" ? body.action : "update";
  const isManager = roleAtLeast(access.member.role, "admin");

  if (action === "claim") {
    const nextStatus = lead.status === "new" ? "viewed" : lead.status;
    const claimed = await db.$transaction(async (tx) => {
      const updated = await tx.lead.updateMany({
        where: { id: lead.id, workspaceId, claimedByUserId: null, status: lead.status },
        data: { claimedByUserId: user.id, status: nextStatus, handledAt: new Date() },
      });
      if (!updated.count) return false;
      await tx.leadFollowUp.create({
        data: {
          id: newId(), leadId: lead.id, profileId: lead.profileId, createdByType: "team_member", createdByUserId: user.id,
          content: "领取了这条团队共享线索。",
          previousStatus: nextStatus === lead.status ? null : lead.status,
          newStatus: nextStatus === lead.status ? null : nextStatus,
        },
      });
      return true;
    });
    if (!claimed) {
      return NextResponse.json({ success: false, error: "该线索已被其他成员领取。" }, { status: 409 });
    }
    return NextResponse.json({ success: true, claimedByUserId: user.id });
  }

  if (action === "release") {
    if (!isManager && lead.claimedByUserId !== user.id) {
      return NextResponse.json({ success: false, error: "只能释放自己领取的线索。" }, { status: 403 });
    }
    if (!lead.claimedByUserId) {
      return NextResponse.json({ success: false, error: "该线索当前未被领取。" }, { status: 409 });
    }
    const released = await db.$transaction(async (tx) => {
      const updated = await tx.lead.updateMany({
        where: { id: lead.id, workspaceId, claimedByUserId: lead.claimedByUserId },
        data: { claimedByUserId: null },
      });
      if (!updated.count) return false;
      await tx.leadFollowUp.create({
        data: {
          id: newId(), leadId: lead.id, profileId: lead.profileId, createdByType: "team_member", createdByUserId: user.id,
          content: "已将线索放回团队共享池。", previousStatus: null, newStatus: null,
        },
      });
      return true;
    });
    if (!released) {
      return NextResponse.json({ success: false, error: "线索领取状态已变化，请刷新后重试。" }, { status: 409 });
    }
    return NextResponse.json({ success: true, claimedByUserId: null });
  }

  if (!isManager && lead.claimedByUserId !== user.id) {
    return NextResponse.json({ success: false, error: "请先领取线索后再跟进。" }, { status: 403 });
  }

  const requestedStatus = typeof body.status === "string" ? body.status : lead.status;
  if (!VALID_STATUSES.has(requestedStatus)) {
    return NextResponse.json({ success: false, error: "线索状态不正确。" }, { status: 400 });
  }
  const note = cleanNote(body.note);
  if (note && hasSensitiveContent(note).detected) {
    return NextResponse.json({ success: false, error: "跟进记录包含受限关键词。" }, { status: 400 });
  }
  if (!note && requestedStatus === lead.status) {
    return NextResponse.json({ success: false, error: "请填写跟进记录或选择新的状态。" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: {
        id: lead.id,
        workspaceId,
        status: lead.status,
        ...(!isManager ? { claimedByUserId: user.id } : {}),
      },
      data: { status: requestedStatus, handledAt: new Date() },
    });
    if (!changed.count) return null;
    await tx.leadFollowUp.create({
      data: {
        id: newId(), leadId: lead.id, profileId: lead.profileId, createdByType: "team_member", createdByUserId: user.id,
        content: note || `状态从「${lead.status}」变更为「${requestedStatus}」。`,
        previousStatus: lead.status === requestedStatus ? null : lead.status,
        newStatus: lead.status === requestedStatus ? null : requestedStatus,
      },
    });
    return tx.lead.findFirst({ where: { id: lead.id, workspaceId } });
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: "线索状态已变化，请刷新后重试。" }, { status: 409 });
  }

  return NextResponse.json({ success: true, lead: { id: updated.id, status: updated.status, claimedByUserId: updated.claimedByUserId } });
}
