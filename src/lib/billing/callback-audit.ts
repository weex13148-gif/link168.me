import { writeAdminAuditLog } from "@/lib/admin-audit-log";

export type CallbackAuditEvent = {
  channel: "alipay" | "wechat" | "sandbox";
  eventType:
    | "callback_received"
    | "callback_success"
    | "callback_failed"
    | "callback_duplicate"
    | "callback_invalid_sign"
    | "callback_amount_mismatch"
    | "callback_order_not_found"
    | "callback_state_invalid"
    | "refund_callback_received"
    | "refund_callback_success"
    | "refund_callback_failed";
  orderNo?: string;
  providerTradeNo?: string;
  amountCents?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export async function recordCallbackAudit(event: CallbackAuditEvent): Promise<void> {
  try {
    await writeAdminAuditLog({
      action: `billing.callback.${event.channel}.${event.eventType}`,
      targetType: "payment_callback",
      targetId: event.orderNo || event.providerTradeNo || undefined,
      success: event.success,
      request: event.request,
      metadata: {
        channel: event.channel,
        eventType: event.eventType,
        orderNo: event.orderNo || null,
        providerTradeNo: event.providerTradeNo || null,
        amountCents: event.amountCents ?? null,
        error: event.error || null,
        ...(event.metadata || {}),
      },
    });
  } catch (err) {
    console.error("[callback-audit] 记录审计日志失败:", err);
  }
}

export function buildIdempotencyKey(
  channel: string,
  providerTradeNo: string,
  orderNo: string,
  eventType: string,
): string {
  return `callback:${channel}:${eventType}:${providerTradeNo}:${orderNo}`;
}

export const CALLBACK_IDEMPOTENCY_TYPES = {
  PAYMENT_SUCCESS: "payment_success",
  REFUND_SUCCESS: "refund_success",
  REFUND_FAILED: "refund_failed",
  PAYMENT_FAILED: "payment_failed",
} as const;
