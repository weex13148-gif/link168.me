export type PaymentProviderType = "sandbox" | "wechat" | "alipay";

export interface PaymentProvider {
  type: PaymentProviderType;
  createPayment(orderId: string, orderNo: string, amount: number, currency: string): Promise<{
    success: boolean;
    payUrl?: string;
    qrCodeUrl?: string;
    prepayId?: string;
    providerTradeNo?: string;
    errorMessage?: string;
  }>;
  queryPayment(providerTradeNo: string): Promise<{
    success: boolean;
    status?: "success" | "failed" | "pending" | "cancelled";
    orderNo?: string;
    amount?: number;
    paidAt?: Date;
    errorMessage?: string;
  }>;
  closePayment(providerTradeNo: string): Promise<{
    success: boolean;
    errorMessage?: string;
  }>;
  requestRefund(providerTradeNo: string, amount: number, reason?: string): Promise<{
    success: boolean;
    refundId?: string;
    errorMessage?: string;
  }>;
  queryRefund(refundId: string): Promise<{
    success: boolean;
    status?: "success" | "failed" | "pending";
    amount?: number;
    errorMessage?: string;
  }>;
  verifyNotify(params: Record<string, string>): Promise<{
    valid: boolean;
    orderNo?: string;
    providerTradeNo?: string;
    amount?: number;
    status?: "success" | "failed" | "refund";
    error?: string;
  }>;
  parseNotify(body: string | FormData): Promise<Record<string, string>>;
  getNotifyResponse(success: boolean, message?: string): string;
}

export { SandboxPaymentProvider } from "./sandbox";
