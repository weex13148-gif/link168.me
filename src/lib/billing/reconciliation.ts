import { db } from "@/lib/db";
import { ORDER_STATUS } from "./orders";

export interface ReconciliationItem {
  orderId: string;
  orderNo: string;
  userId: string;
  planCode: string;
  localAmount: number;
  providerAmount: number | null;
  localStatus: string;
  providerStatus: string | null;
  providerTradeNo: string | null;
  localPaidAt: Date | null;
  providerPaidAt: Date | null;
  discrepancyStatus: "MATCH" | "AMOUNT_MISMATCH" | "STATUS_MISMATCH" | "DUPLICATE_TRADE" | "PROVIDER_ONLY" | "LOCAL_ONLY";
  manualStatus: "UNHANDLED" | "INVESTIGATING" | "RESOLVED";
  manualNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getReconciliationReport(): Promise<{
  items: ReconciliationItem[];
  summary: {
    totalOrders: number;
    matched: number;
    discrepancies: number;
    unhandled: number;
  };
}> {
  const orders = await db.order.findMany({
    where: {
      status: {
        in: [ORDER_STATUS.PAID, ORDER_STATUS.FAILED, ORDER_STATUS.REFUNDED, ORDER_STATUS.PARTIALLY_REFUNDED],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const providerTradeNoMap = new Map<string, string[]>();
  orders.forEach((order) => {
    if (order.providerTradeNo) {
      const existing = providerTradeNoMap.get(order.providerTradeNo) || [];
      existing.push(order.id);
      providerTradeNoMap.set(order.providerTradeNo, existing);
    }
  });

  const items: ReconciliationItem[] = orders.map((order) => {
    const isDuplicate = order.providerTradeNo
      ? (providerTradeNoMap.get(order.providerTradeNo) || []).length > 1
      : false;

    let discrepancyStatus: ReconciliationItem["discrepancyStatus"] = "MATCH";

    if (isDuplicate) {
      discrepancyStatus = "DUPLICATE_TRADE";
    } else if (!order.providerTradeNo) {
      discrepancyStatus = "LOCAL_ONLY";
    }

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      userId: order.userId,
      planCode: order.planCode,
      localAmount: order.payableAmount,
      providerAmount: order.payableAmount || null,
      localStatus: order.status,
      providerStatus: order.status === ORDER_STATUS.PAID ? "success" : order.status === ORDER_STATUS.FAILED ? "failed" : order.status === ORDER_STATUS.REFUNDED ? "refunded" : null,
      providerTradeNo: order.providerTradeNo || null,
      localPaidAt: order.paidAt,
      providerPaidAt: order.paidAt || null,
      discrepancyStatus,
      manualStatus: "UNHANDLED" as const,
      manualNote: null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });

  const matched = items.filter((i) => i.discrepancyStatus === "MATCH").length;
  const unhandled = items.filter((i) => i.manualStatus === "UNHANDLED" && i.discrepancyStatus !== "MATCH").length;

  return {
    items,
    summary: {
      totalOrders: items.length,
      matched,
      discrepancies: items.length - matched,
      unhandled,
    },
  };
}

export async function getDiscrepancyDetail(orderId: string): Promise<ReconciliationItem | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return null;

  const ordersWithSameTradeNo = await db.order.findMany({
    where: {
      providerTradeNo: order.providerTradeNo,
    },
  });

  const isDuplicate = order.providerTradeNo
    ? ordersWithSameTradeNo.length > 1
    : false;

  let discrepancyStatus: ReconciliationItem["discrepancyStatus"] = "MATCH";

  if (isDuplicate) {
    discrepancyStatus = "DUPLICATE_TRADE";
  } else if (!order.providerTradeNo) {
    discrepancyStatus = "LOCAL_ONLY";
  }

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    userId: order.userId,
    planCode: order.planCode,
    localAmount: order.payableAmount,
    providerAmount: order.payableAmount || null,
    localStatus: order.status,
    providerStatus: order.status === ORDER_STATUS.PAID ? "success" : order.status === ORDER_STATUS.FAILED ? "failed" : order.status === ORDER_STATUS.REFUNDED ? "refunded" : null,
    providerTradeNo: order.providerTradeNo || null,
    localPaidAt: order.paidAt,
    providerPaidAt: order.paidAt || null,
    discrepancyStatus,
    manualStatus: "UNHANDLED" as const,
    manualNote: null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getTestReconciliationData(): Promise<{
  items: ReconciliationItem[];
  summary: {
    totalOrders: number;
    matched: number;
    discrepancies: number;
    unhandled: number;
  };
}> {
  const testItems: ReconciliationItem[] = [
    {
      orderId: "test-1",
      orderNo: "LNK20250101000001",
      userId: "test-user-1",
      planCode: "member_basic",
      localAmount: 9900,
      providerAmount: 9900,
      localStatus: ORDER_STATUS.PAID,
      providerStatus: "success",
      providerTradeNo: "SBX20250101000001",
      localPaidAt: new Date("2025-01-01T10:00:00Z"),
      providerPaidAt: new Date("2025-01-01T10:00:00Z"),
      discrepancyStatus: "MATCH",
      manualStatus: "RESOLVED",
      manualNote: "正常交易",
      createdAt: new Date("2025-01-01T10:00:00Z"),
      updatedAt: new Date("2025-01-01T10:00:00Z"),
    },
    {
      orderId: "test-2",
      orderNo: "LNK20250101000002",
      userId: "test-user-2",
      planCode: "member_plus",
      localAmount: 19900,
      providerAmount: 9900,
      localStatus: ORDER_STATUS.PAID,
      providerStatus: "success",
      providerTradeNo: "SBX20250101000002",
      localPaidAt: new Date("2025-01-01T11:00:00Z"),
      providerPaidAt: new Date("2025-01-01T11:00:00Z"),
      discrepancyStatus: "AMOUNT_MISMATCH",
      manualStatus: "INVESTIGATING",
      manualNote: "金额不一致，正在核实",
      createdAt: new Date("2025-01-01T11:00:00Z"),
      updatedAt: new Date("2025-01-02T09:00:00Z"),
    },
    {
      orderId: "test-3",
      orderNo: "LNK20250101000003",
      userId: "test-user-3",
      planCode: "member_basic",
      localAmount: 9900,
      providerAmount: 9900,
      localStatus: ORDER_STATUS.PENDING,
      providerStatus: "success",
      providerTradeNo: "SBX20250101000003",
      localPaidAt: null,
      providerPaidAt: new Date("2025-01-01T12:00:00Z"),
      discrepancyStatus: "STATUS_MISMATCH",
      manualStatus: "UNHANDLED",
      manualNote: null,
      createdAt: new Date("2025-01-01T12:00:00Z"),
      updatedAt: new Date("2025-01-01T12:00:00Z"),
    },
    {
      orderId: "test-4",
      orderNo: "LNK20250101000004",
      userId: "test-user-4",
      planCode: "member_plus",
      localAmount: 19900,
      providerAmount: 19900,
      localStatus: ORDER_STATUS.PAID,
      providerStatus: "success",
      providerTradeNo: "SBX20250101000004",
      localPaidAt: new Date("2025-01-01T13:00:00Z"),
      providerPaidAt: new Date("2025-01-01T13:00:00Z"),
      discrepancyStatus: "DUPLICATE_TRADE",
      manualStatus: "UNHANDLED",
      manualNote: null,
      createdAt: new Date("2025-01-01T13:00:00Z"),
      updatedAt: new Date("2025-01-01T13:00:00Z"),
    },
    {
      orderId: "test-5",
      orderNo: "LNK20250101000005",
      userId: "test-user-5",
      planCode: "member_basic",
      localAmount: 9900,
      providerAmount: null,
      localStatus: ORDER_STATUS.PAID,
      providerStatus: null,
      providerTradeNo: null,
      localPaidAt: new Date("2025-01-01T14:00:00Z"),
      providerPaidAt: null,
      discrepancyStatus: "LOCAL_ONLY",
      manualStatus: "UNHANDLED",
      manualNote: null,
      createdAt: new Date("2025-01-01T14:00:00Z"),
      updatedAt: new Date("2025-01-01T14:00:00Z"),
    },
    {
      orderId: "test-6",
      orderNo: "LNK20250102000001",
      userId: "test-user-6",
      planCode: "member_plus",
      localAmount: 19900,
      providerAmount: 19900,
      localStatus: ORDER_STATUS.REFUNDED,
      providerStatus: "success",
      providerTradeNo: "SBX20250102000001",
      localPaidAt: new Date("2025-01-02T09:00:00Z"),
      providerPaidAt: new Date("2025-01-02T09:00:00Z"),
      discrepancyStatus: "STATUS_MISMATCH",
      manualStatus: "INVESTIGATING",
      manualNote: "已退款但供应商状态未更新",
      createdAt: new Date("2025-01-02T09:00:00Z"),
      updatedAt: new Date("2025-01-03T10:00:00Z"),
    },
  ];

  const matched = testItems.filter((i) => i.discrepancyStatus === "MATCH").length;
  const unhandled = testItems.filter((i) => i.manualStatus === "UNHANDLED").length;

  return {
    items: testItems,
    summary: {
      totalOrders: testItems.length,
      matched,
      discrepancies: testItems.length - matched,
      unhandled,
    },
  };
}
