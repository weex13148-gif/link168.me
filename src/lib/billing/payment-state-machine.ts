import { db } from "@/lib/db";
import { ORDER_STATUS, type OrderStatus, type DbOrder } from "./orders";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";

export const ORDER_STATE_MACHINE = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  CLOSED: "closed",
  REFUND_PROCESSING: "refund_processing",
  REFUNDED: "refunded",
  REFUND_FAILED: "refund_failed",
  PARTIALLY_REFUNDED: "partially_refunded",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type OrderStateMachineStatus = (typeof ORDER_STATE_MACHINE)[keyof typeof ORDER_STATE_MACHINE];

const ALLOWED_TRANSITIONS: Record<OrderStateMachineStatus, OrderStateMachineStatus[]> = {
  pending: ["processing", "cancelled", "expired", "closed"],
  processing: ["paid", "failed", "cancelled", "closed"],
  paid: ["refund_processing", "partially_refunded", "refunded", "closed"],
  failed: ["closed", "cancelled"],
  closed: [],
  refund_processing: ["refunded", "partially_refunded", "refund_failed", "paid"],
  refunded: [],
  refund_failed: ["refund_processing", "closed"],
  partially_refunded: ["refund_processing", "refunded", "closed"],
  cancelled: [],
  expired: ["closed"],
};

export function canTransition(from: OrderStatus | string, to: OrderStateMachineStatus): boolean {
  const fromStatus = from as OrderStateMachineStatus;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getTransitionDescription(from: OrderStatus | string, to: OrderStateMachineStatus): string {
  const map: Record<string, string> = {
    "pending→processing": "订单进入支付处理中",
    "pending→cancelled": "订单被取消",
    "pending→expired": "订单过期未支付",
    "pending→closed": "订单关闭",
    "processing→paid": "支付成功",
    "processing→failed": "支付失败",
    "processing→cancelled": "支付取消",
    "processing→closed": "订单关闭",
    "paid→refund_processing": "发起退款申请",
    "paid→partially_refunded": "部分退款完成",
    "paid→refunded": "全额退款完成",
    "paid→closed": "订单关闭",
    "failed→closed": "订单关闭",
    "failed→cancelled": "订单取消",
    "refund_processing→refunded": "全额退款成功",
    "refund_processing→partially_refunded": "部分退款成功",
    "refund_processing→refund_failed": "退款失败",
    "refund_processing→paid": "退款申请撤回",
    "refund_failed→refund_processing": "重新发起退款",
    "refund_failed→closed": "订单关闭",
    "partially_refunded→refund_processing": "再次发起退款",
    "partially_refunded→refunded": "剩余金额全额退款完成",
    "partially_refunded→closed": "订单关闭",
    "expired→closed": "过期订单关闭",
  };
  return map[`${from}→${to}`] || `状态变更：${from} → ${to}`;
}

export type StateTransitionResult = {
  success: boolean;
  error?: string;
  order?: DbOrder;
  transitioned: boolean;
  idempotent: boolean;
};

export async function transitionOrderState(params: {
  orderId: string;
  toState: OrderStateMachineStatus;
  actorUserId?: string;
  actorRole?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  extraUpdateData?: Record<string, unknown>;
}): Promise<StateTransitionResult> {
  const { orderId, toState, actorUserId, actorRole, reason, metadata = {}, extraUpdateData = {} } = params;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "订单不存在", transitioned: false, idempotent: false };
  }

  const fromState = order.status as OrderStateMachineStatus;

  if (fromState === toState) {
    return { success: true, order, transitioned: false, idempotent: true };
  }

  if (!canTransition(fromState, toState)) {
    const errorMsg = `非法状态跳转：${fromState} → ${toState}`;
    console.error("[payment-state-machine]", errorMsg, { orderId });
    await writeAdminAuditLog({
      actorUserId,
      actorRole,
      action: "billing.order_state_transition_rejected",
      targetType: "order",
      targetId: orderId,
      success: false,
      metadata: {
        fromState,
        toState,
        reason: errorMsg,
        orderNo: order.orderNo,
        ...metadata,
      },
    });
    return { success: false, error: errorMsg, transitioned: false, idempotent: false };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (!current) {
        throw new Error("订单不存在");
      }

      const currentState = current.status as OrderStateMachineStatus;

      if (currentState === toState) {
        return { order: current, transitioned: false, idempotent: true };
      }

      if (!canTransition(currentState, toState)) {
        throw new Error(`并发冲突：状态已变更为 ${currentState}，无法跳转到 ${toState}`);
      }

      const updateData: Record<string, unknown> = {
        status: toState,
        ...extraUpdateData,
      };

      const timestampFields: Partial<Record<OrderStateMachineStatus, string>> = {
        paid: "paidAt",
        cancelled: "cancelledAt",
        closed: "closedAt",
        refunded: "refundedAt",
        expired: "closedAt",
      };

      const tsField = timestampFields[toState];
      if (tsField) {
        updateData[tsField] = new Date();
      }

      const existingMeta = current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
        ? current.metadata as Record<string, unknown>
        : {};

      const transitionLog = {
        from: currentState,
        to: toState,
        at: new Date().toISOString(),
        reason: reason || null,
        actor: actorUserId || null,
        ...metadata,
      };

      const history = Array.isArray(existingMeta.transitionHistory)
        ? [...existingMeta.transitionHistory, transitionLog]
        : [transitionLog];

      updateData.metadata = {
        ...existingMeta,
        transitionHistory: history,
      };

      if (reason && !updateData.cancelReason) {
        if (toState === "cancelled") {
          (updateData as Record<string, unknown>).cancelReason = reason;
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      return { order: updated, transitioned: true, idempotent: false };
    });

    if (result.transitioned) {
      const description = getTransitionDescription(fromState, toState);
      await writeAdminAuditLog({
        actorUserId,
        actorRole,
        action: "billing.order_state_transition",
        targetType: "order",
        targetId: orderId,
        success: true,
        metadata: {
          fromState,
          toState,
          description,
          reason: reason || null,
          orderNo: order.orderNo,
          amount: order.payableAmount,
          planCode: order.planCode,
          ...metadata,
        },
      });
    }

    return { success: true, ...result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[payment-state-machine] 状态跳转失败:", { orderId, fromState, toState, error: errorMsg });
    return { success: false, error: errorMsg, transitioned: false, idempotent: false };
  }
}

export function isFinalState(status: OrderStatus | string): boolean {
  const finalStates: OrderStateMachineStatus[] = ["cancelled", "expired", "refunded", "closed"];
  return finalStates.includes(status as OrderStateMachineStatus);
}

export function isRefundable(status: OrderStatus | string): boolean {
  const refundableStates: OrderStateMachineStatus[] = ["paid", "partially_refunded"];
  return refundableStates.includes(status as OrderStateMachineStatus);
}

export function canInitiateRefund(status: OrderStatus | string): boolean {
  const allowed: OrderStateMachineStatus[] = ["paid", "partially_refunded", "refund_failed"];
  return allowed.includes(status as OrderStateMachineStatus);
}
