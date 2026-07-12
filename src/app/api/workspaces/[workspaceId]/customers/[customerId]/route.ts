import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import {
  WorkspaceCustomerError,
  assertWorkspaceCustomerAccess,
  assertWorkspaceCustomerAssignee,
  isWorkspaceCustomerStatus,
  loadWorkspaceCustomerDetails,
} from "@/lib/workspace/customers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string; customerId: string }>;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = sanitizePublicText(value.trim().slice(0, maxLength));
  return text || null;
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceCustomerError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[workspace-customer] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业客户暂时不可用。", code: "WORKSPACE_CUSTOMER_UNAVAILABLE" },
    { status: 503 },
  );
}

function customerDto(customer: {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  message: string | null;
  sourceComponent: string | null;
  sourcePage: string | null;
  interestedProductId: string | null;
  interestedProductName: string | null;
  interestedProductPrice: string | null;
  interestedProductCategory: string | null;
  status: string;
  handlerNote: string | null;
  handledAt: Date | null;
  assignedToUserId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: customer.id,
    workspaceId: customer.workspaceId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    wechat: customer.wechat,
    message: customer.message,
    sourceComponent: customer.sourceComponent,
    sourcePage: customer.sourcePage,
    interestedProductId: customer.interestedProductId,
    interestedProductName: customer.interestedProductName,
    interestedProductPrice: customer.interestedProductPrice,
    interestedProductCategory: customer.interestedProductCategory,
    status: customer.status,
    handlerNote: customer.handlerNote,
    handledAt: customer.handledAt?.toISOString() ?? null,
    assignedToUserId: customer.assignedToUserId,
    createdByUserId: customer.createdByUserId,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function detailDto(
  customer: Parameters<typeof customerDto>[0],
  details: Awaited<ReturnType<typeof loadWorkspaceCustomerDetails>>,
) {
  return {
    ...customerDto(customer),
    followUps: details.followUps.map((item) => ({
      id: item.id,
      content: item.content,
      previousStatus: item.previousStatus,
      newStatus: item.newStatus,
      createdByUserId: item.createdByUserId,
      createdAt: item.createdAt.toISOString(),
    })),
    tasks: details.tasks.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      dueAt: item.dueAt?.toISOString() ?? null,
      assignedToUserId: item.assignedToUserId,
      createdByUserId: item.createdByUserId,
      completedByUserId: item.completedByUserId,
      completedAt: item.completedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    assignmentHistory: details.history.map((item) => ({
      id: item.id,
      fromUserId: item.fromUserId,
      toUserId: item.toUserId,
      actorUserId: item.actorUserId,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, customerId } = await context.params;

  try {
    const { customer } = await assertWorkspaceCustomerAccess({
      workspaceId,
      userId: user.id,
      customerId,
    });
    const details = await loadWorkspaceCustomerDetails(workspaceId, customerId);
    return NextResponse.json({ success: true, customer: detailDto(customer, details) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId, customerId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const requestsReassignment = Object.prototype.hasOwnProperty.call(body, "assignedToUserId");

  try {
    const { customer } = await assertWorkspaceCustomerAccess({
      workspaceId,
      userId: user.id,
      customerId,
      update: true,
      reassign: requestsReassignment,
    });

    const note = cleanText(body.note, 2000);
    if (note && hasSensitiveContent(note).detected) {
      return NextResponse.json({ success: false, error: "跟进记录包含受限关键词。" }, { status: 400 });
    }
    const handlerNote = Object.prototype.hasOwnProperty.call(body, "handlerNote")
      ? cleanText(body.handlerNote, 2000)
      : customer.handlerNote;
    if (handlerNote && hasSensitiveContent(handlerNote).detected) {
      return NextResponse.json({ success: false, error: "客户备注包含受限关键词。" }, { status: 400 });
    }

    const newStatus = isWorkspaceCustomerStatus(body.status) ? body.status : customer.status;
    const statusChanged = newStatus !== customer.status;
    const requestedAssignee = requestsReassignment
      ? typeof body.assignedToUserId === "string" && body.assignedToUserId.trim()
        ? body.assignedToUserId.trim()
        : null
      : customer.assignedToUserId;

    if (requestsReassignment) {
      await assertWorkspaceCustomerAssignee(workspaceId, requestedAssignee);
    }

    const reassignOpenTasks = body.reassignOpenTasks === true;
    const reason = cleanText(body.reason, 500) ?? "企业客户重新分配";
    const assignmentChanged = requestsReassignment && requestedAssignee !== customer.assignedToUserId;

    const updated = await db.$transaction(async (tx) => {
      const customerUpdate = await tx.workspaceCustomer.update({
        where: { id: customerId },
        data: {
          name: Object.prototype.hasOwnProperty.call(body, "name")
            ? cleanText(body.name, 100) ?? customer.name
            : customer.name,
          email: Object.prototype.hasOwnProperty.call(body, "email")
            ? cleanText(body.email, 254)
            : customer.email,
          phone: Object.prototype.hasOwnProperty.call(body, "phone")
            ? cleanText(body.phone, 50)
            : customer.phone,
          wechat: Object.prototype.hasOwnProperty.call(body, "wechat")
            ? cleanText(body.wechat, 100)
            : customer.wechat,
          message: Object.prototype.hasOwnProperty.call(body, "message")
            ? cleanText(body.message, 2000)
            : customer.message,
          status: newStatus,
          handlerNote,
          handledAt: note || statusChanged ? new Date() : customer.handledAt,
          assignedToUserId: requestedAssignee,
        },
      });

      if (note || statusChanged) {
        await tx.workspaceCustomerFollowUp.create({
          data: {
            workspaceId,
            customerId,
            createdByUserId: user.id,
            content: note ?? `状态从「${customer.status}」变更为「${newStatus}」`,
            previousStatus: statusChanged ? customer.status : null,
            newStatus: statusChanged ? newStatus : null,
          },
        });
      }

      if (assignmentChanged) {
        if (reassignOpenTasks && requestedAssignee) {
          await tx.workspaceCustomerTask.updateMany({
            where: {
              workspaceId,
              customerId,
              status: { notIn: ["completed", "cancelled"] },
            },
            data: { assignedToUserId: requestedAssignee },
          });
        }
        await tx.workspaceCustomerAssignmentHistory.create({
          data: {
            workspaceId,
            customerId,
            fromUserId: customer.assignedToUserId,
            toUserId: requestedAssignee,
            actorUserId: user.id,
            reason,
          },
        });
        await tx.workspaceAuditLog.create({
          data: {
            workspaceId,
            actorUserId: user.id,
            action: "workspace.customer.reassigned",
            targetType: "workspace_customer",
            targetId: customerId,
            metadata: {
              fromUserId: customer.assignedToUserId,
              toUserId: requestedAssignee,
              reassignOpenTasks,
            },
          },
        });
      } else if (note || statusChanged) {
        await tx.workspaceAuditLog.create({
          data: {
            workspaceId,
            actorUserId: user.id,
            action: "workspace.customer.updated",
            targetType: "workspace_customer",
            targetId: customerId,
            metadata: { status: newStatus, statusChanged },
          },
        });
      }

      return customerUpdate;
    });

    const details = await loadWorkspaceCustomerDetails(workspaceId, customerId);
    return NextResponse.json({ success: true, customer: detailDto(updated, details) });
  } catch (error) {
    return errorResponse(error);
  }
}
