import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { db } from "@/lib/db";
import {
  WorkspaceCustomerError,
  assertWorkspaceCustomerAssignee,
  assertWorkspaceCustomerManager,
  isWorkspaceCustomerStatus,
  listVisibleWorkspaceCustomers,
  loadWorkspaceCustomerDetails,
} from "@/lib/workspace/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ workspaceId: string }> };

type CreateCustomerRequest = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  wechat?: unknown;
  message?: unknown;
  sourceComponent?: unknown;
  sourcePage?: unknown;
  interestedProductId?: unknown;
  status?: unknown;
  assignedToUserId?: unknown;
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
  console.error("[workspace-customers] request failed", error);
  return NextResponse.json(
    { success: false, error: "企业客户池暂时不可用。", code: "WORKSPACE_CUSTOMER_UNAVAILABLE" },
    { status: 503 },
  );
}

function customerSummary(customer: {
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

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  const search = cleanText(url.searchParams.get("search"), 100) ?? undefined;

  try {
    const customers = await listVisibleWorkspaceCustomers({
      workspaceId,
      userId: user.id,
      status: isWorkspaceCustomerStatus(rawStatus) ? rawStatus : undefined,
      search,
    });
    return NextResponse.json({
      success: true,
      customers: customers.map(customerSummary),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;
  const { workspaceId } = await context.params;

  try {
    await assertWorkspaceCustomerManager(workspaceId, user.id);

    let body: CreateCustomerRequest;
    try {
      body = (await request.json()) as CreateCustomerRequest;
    } catch {
      return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
    }

    const name = cleanText(body.name, 100);
    if (!name || hasSensitiveContent(name).detected) {
      return NextResponse.json({ success: false, error: "请输入有效客户名称。" }, { status: 400 });
    }
    const message = cleanText(body.message, 2000);
    if (message && hasSensitiveContent(message).detected) {
      return NextResponse.json({ success: false, error: "客户需求包含受限关键词。" }, { status: 400 });
    }

    const assignedToUserId = typeof body.assignedToUserId === "string" && body.assignedToUserId.trim()
      ? body.assignedToUserId.trim()
      : null;
    await assertWorkspaceCustomerAssignee(workspaceId, assignedToUserId);

    const status = isWorkspaceCustomerStatus(body.status) ? body.status : "new";
    const interestedProductId = typeof body.interestedProductId === "string" && body.interestedProductId.trim()
      ? body.interestedProductId.trim()
      : null;
    let productSnapshot: {
      id: string;
      name: string;
      priceText: string | null;
      category: string | null;
    } | null = null;

    if (interestedProductId) {
      const mapping = await db.workspaceResource.findFirst({
        where: {
          workspaceId,
          resourceType: "product",
          resourceId: interestedProductId,
          status: "active",
        },
      });
      if (!mapping) {
        return NextResponse.json(
          { success: false, error: "关联产品不属于当前企业空间。" },
          { status: 400 },
        );
      }
      productSnapshot = await db.product.findUnique({
        where: { id: interestedProductId },
        select: { id: true, name: true, priceText: true, category: true },
      });
      if (!productSnapshot) {
        return NextResponse.json({ success: false, error: "关联产品不存在。" }, { status: 400 });
      }
    }

    const customerId = crypto.randomUUID();
    const customer = await db.$transaction(async (tx) => {
      const created = await tx.workspaceCustomer.create({
        data: {
          id: customerId,
          workspaceId,
          name,
          email: cleanText(body.email, 254),
          phone: cleanText(body.phone, 50),
          wechat: cleanText(body.wechat, 100),
          message,
          sourceComponent: cleanText(body.sourceComponent, 80),
          sourcePage: cleanText(body.sourcePage, 200),
          interestedProductId: productSnapshot?.id ?? null,
          interestedProductName: productSnapshot?.name ?? null,
          interestedProductPrice: productSnapshot?.priceText ?? null,
          interestedProductCategory: productSnapshot?.category ?? null,
          status,
          assignedToUserId,
          createdByUserId: user.id,
        },
      });
      await tx.workspaceCustomerAssignmentHistory.create({
        data: {
          workspaceId,
          customerId,
          fromUserId: null,
          toUserId: assignedToUserId,
          actorUserId: user.id,
          reason: "创建企业客户",
        },
      });
      await tx.workspaceAuditLog.create({
        data: {
          workspaceId,
          actorUserId: user.id,
          action: "workspace.customer.created",
          targetType: "workspace_customer",
          targetId: customerId,
          metadata: { assignedToUserId, status },
        },
      });
      return created;
    });

    const details = await loadWorkspaceCustomerDetails(workspaceId, customer.id);
    return NextResponse.json(
      { success: true, customer: { ...customerSummary(customer), ...details } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
