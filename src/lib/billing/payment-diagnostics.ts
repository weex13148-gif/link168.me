import { db } from "@/lib/db";

const ACTION_PREFIX = "PAYMENT_ALIPAY_";

export type PaymentDiagnosticEvent = {
  type: string;
  success: boolean;
  orderNo?: string;
  tradeNo?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

function serializeMetadata(event: PaymentDiagnosticEvent) {
  return JSON.stringify({
    type: event.type,
    orderNo: event.orderNo || null,
    tradeNo: event.tradeNo || null,
    error: event.error || null,
    metadata: event.metadata || {},
  });
}

export async function recordAlipayDiagnostic(event: PaymentDiagnosticEvent) {
  try {
    await db.adminAuditLog.create({
      data: {
        action: `${ACTION_PREFIX}${event.type.toUpperCase()}`,
        targetType: "alipay_payment",
        targetId: event.orderNo || event.tradeNo || null,
        metadataRaw: serializeMetadata(event),
        success: event.success,
      },
    });
  } catch (error) {
    console.error("[payment-diagnostics] 记录支付宝诊断失败:", error);
  }
}

export async function listAlipayDiagnostics(limit = 30) {
  const rows = await db.adminAuditLog.findMany({
    where: { action: { startsWith: ACTION_PREFIX } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      action: true,
      targetId: true,
      metadataRaw: true,
      success: true,
      createdAt: true,
    },
  });

  return rows.map((row) => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = row.metadataRaw ? JSON.parse(row.metadataRaw) as Record<string, unknown> : {};
    } catch {
      metadata = {};
    }
    return {
      id: row.id,
      action: row.action,
      targetId: row.targetId,
      success: row.success,
      createdAt: row.createdAt.toISOString(),
      ...metadata,
    };
  });
}
