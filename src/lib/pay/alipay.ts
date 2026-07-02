export type PayPlan = "basic" | "plus" | "pro";

export type CreateOrderInput = {
  userId: string;
  planCode: PayPlan;
  amount: number;
};

export function createAlipayOrder(input: CreateOrderInput) {
  const orderId = `lp_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  // MOCK MODE (production later replace with Alipay SDK)
  const payUrl = `/api/pay/mock?orderId=${orderId}&plan=${input.planCode}`;

  return {
    orderId,
    payUrl,
    amount: input.amount,
    planCode: input.planCode
  };
}