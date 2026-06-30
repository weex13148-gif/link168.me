import crypto from "crypto";
import { db } from "@/lib/db";
import { PlanCode, generateOrderId, getPlanDefinition, getPlanPrice, isPriceConfirmed } from "./plans";

// 业务层专用错误类
export class BillingPermissionError extends Error {
  statusCode = 403;
  code = "BILLING_PERMISSION_DENIED";
  constructor(message = "权限不足") {
    super(message);
    this.name = "BillingPermissionError";
  }
}

export class OrderNotFoundError extends Error {
  statusCode = 404;
  code = "ORDER_NOT_FOUND";
  constructor(message = "订单不存在") {
    super(message);
    this.name = "OrderNotFoundError";
  }
}

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUND_PENDING: "refund_pending",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
  CLOSED: "closed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_CHANNEL = {
  WECHAT: "wechat",
  ALIPAY: "alipay",
  SANDBOX: "sandbox",
} as const;

export type PaymentChannel = (typeof PAYMENT_CHANNEL)[keyof typeof PAYMENT_CHANNEL];

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.PAID, ORDER_STATUS.FAILED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.CLOSED],
  [ORDER_STATUS.FAILED]: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CLOSED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.EXPIRED]: [],
  [ORDER_STATUS.REFUND_PENDING]: [ORDER_STATUS.REFUNDED, ORDER_STATUS.PARTIALLY_REFUNDED, ORDER_STATUS.PAID],
  [ORDER_STATUS.PARTIALLY_REFUNDED]: [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.CLOSED],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.CLOSED]: [],
};

function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export type DbOrder = Awaited<ReturnType<typeof db.order.findFirstOrThrow>>;

export type BillingOrder = {
  id: string;
  orderNo: string;
  userId: string;
  planCode: PlanCode;
  planName: string;
  billingCycle: "monthly" | "yearly";
  originalAmount: number;
  payableAmount: number;
  currency: string;
  status: OrderStatus;
  paymentChannel: PaymentChannel | null;
  providerTradeNo: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  closedAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
};

function toApiOrder(order: DbOrder): BillingOrder {
  return {
    id: order.id,
    orderNo: order.orderNo,
    userId: order.userId,
    planCode: order.planCode as PlanCode,
    planName: order.planNameSnapshot,
    billingCycle: order.billingCycle as "monthly" | "yearly",
    originalAmount: order.originalAmount,
    payableAmount: order.payableAmount,
    currency: order.currency,
    status: order.status as OrderStatus,
    paymentChannel: order.paymentChannel as PaymentChannel | null,
    providerTradeNo: order.providerTradeNo,
    paidAt: order.paidAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    refundedAt: order.refundedAt?.toISOString() ?? null,
    closedAt: order.closedAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    metadata: (order.metadata as Record<string, unknown>) ?? {},
    refundAmount: ((order.metadata as Record<string, unknown>)?.refundAmount as number) ?? 0,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

const ORDER_EXPIRE_MINUTES = 30;

export async function createOrder(params: {
  userId: string;
  planCode: PlanCode;
  billingCycle: "monthly" | "yearly";
  metadata?: Record<string, unknown>;
}): Promise<BillingOrder> {
  const { userId, planCode, billingCycle, metadata = {} } = params;

  // Layer 2: 业务层防御性校验 — 查询用户角色，拒绝非 super_admin 购买 internal_test
  if (planCode === "internal_test") {
    const actor = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!actor || actor.role !== "super_admin") {
      throw new BillingPermissionError("无权使用内部测试套餐");
    }
  }

  const plan = getPlanDefinition(planCode);
  if (plan.contactSales) {
    throw new Error("企业版请联系销售定制，不支持在线下单");
  }

  if (!isPriceConfirmed(planCode, billingCycle)) {
    throw new Error(`套餐 ${plan.name} 的${billingCycle === "yearly" ? "年付" : "月付"}价格尚未确认，暂不支持购买`);
  }

  const payableAmount = getPlanPrice(plan, billingCycle);
  if (payableAmount <= 0) {
    throw new Error("免费套餐无需下单");
  }

  const existingPending = await db.order.findFirst({
    where: {
      userId,
      planCode,
      billingCycle,
      status: ORDER_STATUS.PENDING,
    },
  });

  if (existingPending) {
    if (existingPending.expiresAt && existingPending.expiresAt < new Date()) {
      await db.order.update({
        where: { id: existingPending.id },
        data: {
          status: ORDER_STATUS.EXPIRED,
          closedAt: new Date(),
        },
      });
    } else {
      return toApiOrder(existingPending);
    }
  }

  const orderNo = generateOrderId();
  const idempotencyKey = `order:${userId}:${planCode}:${billingCycle}:${Date.now()}`;
  const expiresAt = new Date(Date.now() + ORDER_EXPIRE_MINUTES * 60 * 1000);

  const order = await db.order.create({
    data: {
      orderNo,
      userId,
      planCode,
      planNameSnapshot: plan.name,
      billingCycle,
      originalAmount: payableAmount,
      payableAmount,
      currency: plan.currency,
      status: ORDER_STATUS.PENDING,
      paymentChannel: null,
      providerTradeNo: null,
      idempotencyKey,
      expiresAt,
      metadata: metadata as object,
    },
  });

  return toApiOrder(order);
}

export async function getOrderById(orderId: string, userId: string): Promise<BillingOrder | null> {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
  });

  return order ? toApiOrder(order) : null;
}

export async function getOrderByNo(orderNo: string, userId: string): Promise<BillingOrder | null> {
  const order = await db.order.findFirst({
    where: { orderNo, userId },
  });

  return order ? toApiOrder(order) : null;
}

export async function getUserOrders(userId: string): Promise<BillingOrder[]> {
  await closeExpiredOrders();

  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(toApiOrder);
}

export async function getLatestPendingOrder(userId: string, planCode: PlanCode): Promise<BillingOrder | null> {
  await closeExpiredOrders();

  const order = await db.order.findFirst({
    where: {
      userId,
      planCode,
      status: ORDER_STATUS.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });

  return order ? toApiOrder(order) : null;
}

export async function updateOrderPaymentChannel(
  orderId: string,
  userId: string,
  paymentChannel: PaymentChannel,
): Promise<BillingOrder | null> {
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: ORDER_STATUS.PENDING,
    },
  });

  if (!order) return null;

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      paymentChannel,
      status: ORDER_STATUS.PROCESSING,
    },
  });

  return toApiOrder(updated);
}

export async function cancelOrder(
  orderId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: ORDER_STATUS.PENDING,
    },
  });

  if (!order) {
    return { success: false, error: "订单不存在或无法取消" };
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: ORDER_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason ?? "用户主动取消",
    },
  });

  return { success: true };
}

export async function closeExpiredOrders(): Promise<number> {
  const result = await db.order.updateMany({
    where: {
      status: ORDER_STATUS.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: ORDER_STATUS.EXPIRED,
      closedAt: new Date(),
    },
  });

  return result.count;
}

export async function processPaymentSuccess(params: {
  orderNo: string;
  providerTradeNo: string;
  paymentChannel: PaymentChannel;
  paidAmount?: number;
  paidAmountCents?: number;
}): Promise<{ success: boolean; order?: BillingOrder; error?: string }> {
  const { orderNo, providerTradeNo, paymentChannel, paidAmount, paidAmountCents } = params;

  const order = await db.order.findUnique({
    where: { orderNo },
  });

  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  const receivedAmountCents =
    paidAmountCents ?? (paidAmount !== undefined ? Math.round(paidAmount * 100) : undefined);

  if (receivedAmountCents !== undefined && receivedAmountCents !== order.payableAmount) {
    console.error(
      "[processPaymentSuccess] 金额不匹配: orderNo=%s expected=%s actual=%s",
      orderNo,
      order.payableAmount,
      receivedAmountCents,
    );
    return {
      success: false,
      error: `金额验证失败: 期望${(order.payableAmount / 100).toFixed(2)}元, 收到${(receivedAmountCents / 100).toFixed(2)}元`,
    };
  }

  if (order.status === ORDER_STATUS.PAID) {
    if (order.providerTradeNo === providerTradeNo) {
      return { success: true, order: toApiOrder(order) };
    }
    return { success: false, error: "订单已支付且交易号不匹配" };
  }

  if (!isValidTransition(order.status as OrderStatus, ORDER_STATUS.PAID)) {
    return { success: false, error: `订单状态不允许支付：${order.status}` };
  }

  if (order.expiresAt && order.expiresAt < new Date()) {
    await db.order.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS.EXPIRED },
    });
    return { success: false, error: "订单已超时" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!currentOrder) {
        throw new Error("订单不存在");
      }

      if (receivedAmountCents !== undefined && receivedAmountCents !== currentOrder.payableAmount) {
        throw new Error("金额验证失败");
      }

      if (currentOrder.status === ORDER_STATUS.PAID) {
        if (currentOrder.providerTradeNo === providerTradeNo) {
          return currentOrder;
        }
        throw new Error("订单已支付且交易号不匹配");
      }

      if (!isValidTransition(currentOrder.status as OrderStatus, ORDER_STATUS.PAID)) {
        throw new Error(`订单状态不允许支付：${currentOrder.status}`);
      }

      if (currentOrder.expiresAt && currentOrder.expiresAt < new Date()) {
        await tx.order.update({
          where: { id: currentOrder.id },
          data: { status: ORDER_STATUS.EXPIRED },
        });
        throw new Error("订单已超时");
      }

      const paidAt = new Date();
      const claimed = await tx.order.updateMany({
        where: {
          id: currentOrder.id,
          status: currentOrder.status,
          providerTradeNo: null,
        },
        data: {
          status: ORDER_STATUS.PAID,
          paidAt,
          paymentChannel,
          providerTradeNo,
        },
      });

      if (claimed.count !== 1) {
        const latestOrder = await tx.order.findUnique({
          where: { id: currentOrder.id },
        });

        if (latestOrder?.status === ORDER_STATUS.PAID && latestOrder.providerTradeNo === providerTradeNo) {
          return latestOrder;
        }

        throw new Error("订单支付处理中，请稍后重试");
      }

      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: currentOrder.id },
      });

      const existingSubscription = await tx.membershipSubscription.findUnique({
        where: { userId: currentOrder.userId },
      });

      let periodStart = paidAt;
      let periodEnd: Date;

      if (currentOrder.billingCycle === "yearly") {
        periodEnd = new Date(paidAt);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd = new Date(paidAt);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      if (
        existingSubscription &&
        existingSubscription.status === "active" &&
        existingSubscription.currentPeriodEnd &&
        existingSubscription.currentPeriodEnd > paidAt
      ) {
        periodStart = existingSubscription.currentPeriodEnd;
        periodEnd = new Date(existingSubscription.currentPeriodEnd);
        if (currentOrder.billingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
      }

      await tx.membershipSubscription.upsert({
        where: { userId: currentOrder.userId },
        create: {
          userId: currentOrder.userId,
          planCode: currentOrder.planCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planCode: currentOrder.planCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      // 发放 AI credits
      const planForCredits = getPlanDefinition(currentOrder.planCode);
      const grantAmount = planForCredits.limits.aiCreditsGrant;

      if (grantAmount > 0) {
        const creditAccount = await tx.aiCreditAccount.findUnique({
          where: { userId: currentOrder.userId },
        });

        const idempotencyKey = `grant:order:${currentOrder.id}`;

        if (creditAccount) {
          await tx.aiCreditAccount.update({
            where: { id: creditAccount.id },
            data: {
              balance: { increment: grantAmount },
              version: { increment: 1 },
            },
          });

          try {
            await tx.aiCreditLedger.create({
              data: {
                id: crypto.randomUUID(),
                accountId: creditAccount.id,
                entryType: "grant",
                amount: grantAmount,
                balanceAfter: creditAccount.balance + grantAmount,
                idempotencyKey,
                referenceType: "order",
                referenceId: currentOrder.id,
                metadata: {
                  planCode: currentOrder.planCode,
                  planName: currentOrder.planNameSnapshot,
                  billingCycle: currentOrder.billingCycle,
                  orderNo: currentOrder.orderNo,
                },
              },
            });
          } catch (e) {
            // 幂等：已存在则跳过
          }
        }
      }

      return updatedOrder;
    });

    return { success: true, order: toApiOrder(result) };
  } catch (err) {
    console.error("[orders] 处理支付成功失败:", err);
    return { success: false, error: err instanceof Error ? err.message : "支付处理失败，请稍后重试" };
  }
}

export async function processRefund(params: {
  orderId: string;
  reason: string;
  refundedBy: string;
  amount?: number;
}): Promise<{ success: boolean; error?: string; refundAmount?: number }> {
  const { orderId, reason, refundedBy, amount } = params;

  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  if (order.status !== ORDER_STATUS.PAID && order.status !== ORDER_STATUS.PARTIALLY_REFUNDED) {
    return { success: false, error: `订单状态不允许退款：${order.status}` };
  }

  const payableAmount = order.payableAmount;
  const alreadyRefunded = Number((order.metadata as Record<string, unknown>)?.refundAmount ?? 0);
  const requestedAmount = amount ?? payableAmount;
  const remainingAmount = payableAmount - alreadyRefunded;

  if (requestedAmount > remainingAmount) {
    return {
      success: false,
      error: `退款金额超过可退金额（可退：${remainingAmount}分）`,
    };
  }

  if (requestedAmount <= 0) {
    return { success: false, error: "退款金额必须大于 0" };
  }

  const newRefundAmount = alreadyRefunded + requestedAmount;

  try {
    await db.$transaction(async (tx) => {
      const isFullRefund = newRefundAmount >= payableAmount;

      const updateData: Record<string, unknown> = {
        metadata: {
          ...(order.metadata as Record<string, unknown>),
          refundAmount: newRefundAmount,
        },
        refundReason: reason,
        refundBy: refundedBy,
      };

      if (isFullRefund) {
        updateData.status = ORDER_STATUS.REFUNDED;
        updateData.refundedAt = new Date();
      } else {
        updateData.status = ORDER_STATUS.PARTIALLY_REFUNDED;
      }

      await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      if (isFullRefund) {
        const subscription = await tx.membershipSubscription.findUnique({
          where: { userId: order.userId },
        });

        if (subscription && subscription.planCode !== "free") {
          await tx.membershipSubscription.update({
            where: { userId: order.userId },
            data: {
              planCode: "free",
              status: "cancelled",
            },
          });
        }
      }
    });

    return {
      success: true,
      refundAmount: newRefundAmount,
    };
  } catch (err) {
    console.error("[orders] 处理退款失败:", err);
    return { success: false, error: "退款处理失败，请稍后重试" };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, error: "订单不存在" };
  }

  if (!isValidTransition(order.status as OrderStatus, status)) {
    return { success: false, error: `不允许从 ${order.status} 转换到 ${status}` };
  }

  const updateData: Record<string, unknown> = { status };

  switch (status) {
    case ORDER_STATUS.CANCELLED:
      updateData.cancelledAt = new Date();
      updateData.cancelReason = reason ?? "订单已取消";
      break;
    case ORDER_STATUS.CLOSED:
      updateData.closedAt = new Date();
      break;
    case ORDER_STATUS.FAILED:
      updateData.closedAt = new Date();
      break;
  }

  await db.order.update({
    where: { id: orderId },
    data: updateData,
  });

  return { success: true };
}

export async function getOrdersForAdmin(params: {
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: BillingOrder[]; total: number }> {
  const { filters = {}, page = 1, pageSize = 20 } = params;

  const where: Record<string, unknown> = { ...filters };
  if (filters.orderNo) {
    where.orderNo = { contains: filters.orderNo };
  }

  const [orders, count] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.order.count({ where }),
  ]);

  return {
    orders: orders.map(toApiOrder),
    total: count,
  };
}

export async function getOrderByIdInternal(orderId: string): Promise<DbOrder | null> {
  return db.order.findUnique({
    where: { id: orderId },
  });
}

export async function getOrderByNoInternal(orderNo: string): Promise<DbOrder | null> {
  return db.order.findUnique({
    where: { orderNo },
  });
}

export async function getOrderByProviderTradeNo(providerTradeNo: string): Promise<DbOrder | null> {
  return db.order.findUnique({
    where: { providerTradeNo },
  });
}
