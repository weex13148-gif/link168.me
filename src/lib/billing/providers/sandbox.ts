import crypto from "crypto";
import type { PaymentProvider } from "./index";

type SandboxTransaction = {
  providerTradeNo: string;
  orderNo: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "cancelled";
  paidAt?: Date;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

type SandboxRefund = {
  refundId: string;
  providerTradeNo: string;
  amount: number;
  status: "pending" | "success" | "failed";
  reason?: string;
  createdAt: Date;
};

const sandboxTransactions = new Map<string, SandboxTransaction>();
const sandboxRefunds = new Map<string, SandboxRefund>();

export class SandboxPaymentProvider implements PaymentProvider {
  type = "sandbox" as const;

  async createPayment(
    orderId: string,
    orderNo: string,
    amount: number,
    currency: string
  ): Promise<{
    success: boolean;
    payUrl?: string;
    qrCodeUrl?: string;
    prepayId?: string;
    providerTradeNo?: string;
    errorMessage?: string;
  }> {
    const providerTradeNo = `SBX${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const metadata = {
      orderId,
      testMode: true,
    };

    sandboxTransactions.set(providerTradeNo, {
      providerTradeNo,
      orderNo,
      amount,
      currency,
      status: "pending",
      createdAt: new Date(),
      metadata,
    });

    return {
      success: true,
      payUrl: `/api/payments/sandbox/pay?tradeNo=${providerTradeNo}`,
      qrCodeUrl: `/api/payments/sandbox/qr?tradeNo=${providerTradeNo}`,
      prepayId: `prepay_${providerTradeNo}`,
      providerTradeNo,
    };
  }

  async queryPayment(providerTradeNo: string): Promise<{
    success: boolean;
    status?: "success" | "failed" | "pending" | "cancelled";
    orderNo?: string;
    amount?: number;
    paidAt?: Date;
    errorMessage?: string;
  }> {
    const transaction = sandboxTransactions.get(providerTradeNo);
    if (!transaction) {
      return { success: false, errorMessage: "交易不存在" };
    }

    return {
      success: true,
      status: transaction.status,
      orderNo: transaction.orderNo,
      amount: transaction.amount,
      paidAt: transaction.paidAt,
    };
  }

  async closePayment(providerTradeNo: string): Promise<{
    success: boolean;
    errorMessage?: string;
  }> {
    const transaction = sandboxTransactions.get(providerTradeNo);
    if (!transaction) {
      return { success: false, errorMessage: "交易不存在" };
    }

    if (transaction.status !== "pending") {
      return { success: false, errorMessage: "只能关闭待支付的交易" };
    }

    transaction.status = "cancelled";
    return { success: true };
  }

  async requestRefund(
    providerTradeNo: string,
    amount: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refundId?: string;
    errorMessage?: string;
  }> {
    const transaction = sandboxTransactions.get(providerTradeNo);
    if (!transaction) {
      return { success: false, errorMessage: "交易不存在" };
    }

    if (transaction.status !== "success") {
      return { success: false, errorMessage: "只能对已成功支付的交易退款" };
    }

    if (amount > transaction.amount) {
      return { success: false, errorMessage: "退款金额不能超过支付金额" };
    }

    const existingRefunds = Array.from(sandboxRefunds.values()).filter(
      (r) => r.providerTradeNo === providerTradeNo && r.status !== "failed"
    );
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

    if (totalRefunded + amount > transaction.amount) {
      return { success: false, errorMessage: "累计退款金额超过支付金额" };
    }

    const refundId = `RFD${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    sandboxRefunds.set(refundId, {
      refundId,
      providerTradeNo,
      amount,
      status: "pending",
      reason,
      createdAt: new Date(),
    });

    return { success: true, refundId };
  }

  async queryRefund(refundId: string): Promise<{
    success: boolean;
    status?: "success" | "failed" | "pending";
    amount?: number;
    errorMessage?: string;
  }> {
    const refund = sandboxRefunds.get(refundId);
    if (!refund) {
      return { success: false, errorMessage: "退款记录不存在" };
    }

    return {
      success: true,
      status: refund.status,
      amount: refund.amount,
    };
  }

  async verifyNotify(params: Record<string, string>): Promise<{
    valid: boolean;
    orderNo?: string;
    providerTradeNo?: string;
    amount?: number;
    status?: "success" | "failed" | "refund";
    error?: string;
  }> {
    const sandboxSign = params["sandbox_sign"];
    const expectedSign = this.generateSandboxSign(params);

    if (!sandboxSign || sandboxSign !== expectedSign) {
      return { valid: false, error: "签名验证失败" };
    }

    const providerTradeNo = params["provider_trade_no"];
    const transaction = sandboxTransactions.get(providerTradeNo || "");

    if (!transaction) {
      return { valid: false, error: "交易不存在" };
    }

    const notifyAmount = parseInt(params["amount"] || "0", 10);
    if (notifyAmount !== transaction.amount) {
      return { valid: false, error: "金额不匹配" };
    }

    const notifyOrderNo = params["order_no"];
    if (notifyOrderNo !== transaction.orderNo) {
      return { valid: false, error: "订单号不匹配" };
    }

    const notifyStatus = params["status"];
    if (!["success", "failed", "refund"].includes(notifyStatus || "")) {
      return { valid: false, error: "无效的状态" };
    }

    return {
      valid: true,
      orderNo: transaction.orderNo,
      providerTradeNo: transaction.providerTradeNo,
      amount: transaction.amount,
      status: notifyStatus as "success" | "failed" | "refund",
    };
  }

  async parseNotify(body: string | FormData): Promise<Record<string, string>> {
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        const params: Record<string, string> = {};
        new URLSearchParams(body).forEach((value, key) => {
          params[key] = value;
        });
        return params;
      }
    }

    const params: Record<string, string> = {};
    body.forEach((value, key) => {
      params[key] = String(value);
    });
    return params;
  }

  getNotifyResponse(success: boolean, message?: string): string {
    return JSON.stringify({
      success,
      message: success ? "OK" : message || "FAIL",
    });
  }

  generateSandboxSign(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params)
      .filter((key) => key !== "sandbox_sign")
      .sort();
    const stringToSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
    return crypto.createHash("sha256").update(stringToSign + "&sandbox_key=link168_test_key").digest("hex");
  }

  simulatePayment(params: {
    providerTradeNo: string;
    action: "success" | "fail" | "cancel";
    delayMs?: number;
    repeatCount?: number;
    repeatIntervalMs?: number;
  }): Promise<{ success: boolean; errorMessage?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const transaction = sandboxTransactions.get(params.providerTradeNo);
        if (!transaction) {
          resolve({ success: false, errorMessage: "交易不存在" });
          return;
        }

        if (transaction.status !== "pending") {
          resolve({ success: false, errorMessage: "交易状态不允许操作" });
          return;
        }

        switch (params.action) {
          case "success":
            transaction.status = "success";
            transaction.paidAt = new Date();
            break;
          case "fail":
            transaction.status = "failed";
            break;
          case "cancel":
            transaction.status = "cancelled";
            break;
        }

        resolve({ success: true });
      }, params.delayMs || 0);
    });
  }

  simulateRefund(params: {
    refundId: string;
    action: "success" | "fail";
  }): Promise<{ success: boolean; errorMessage?: string }> {
    const refund = sandboxRefunds.get(params.refundId);
    if (!refund) {
      return Promise.resolve({ success: false, errorMessage: "退款记录不存在" });
    }

    if (refund.status !== "pending") {
      return Promise.resolve({ success: false, errorMessage: "退款状态不允许操作" });
    }

    refund.status = params.action === "success" ? "success" : "failed";
    return Promise.resolve({ success: true });
  }

  triggerNotify(params: {
    providerTradeNo: string;
    status: "success" | "failed" | "refund";
    delayMs?: number;
    repeatCount?: number;
    repeatIntervalMs?: number;
    // 错误场景覆盖参数
    overrideAmount?: number;
    overrideOrderNo?: string;
    useInvalidSignature?: boolean;
  }): Promise<{ success: boolean; errorMessage?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const transaction = sandboxTransactions.get(params.providerTradeNo);
        if (!transaction) {
          resolve({ success: false, errorMessage: "交易不存在" });
          return;
        }

        const notifyUrl = process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/sandbox/notify`
          : `http://localhost:3000/api/payments/sandbox/notify`;

        const notifyParams: Record<string, string> = {
          provider_trade_no: transaction.providerTradeNo,
          order_no: params.overrideOrderNo ?? transaction.orderNo,
          amount: String(params.overrideAmount ?? transaction.amount),
          currency: transaction.currency,
          status: params.status,
          timestamp: String(Date.now()),
        };

        // 如果要求错误签名，使用错误的签名
        if (params.useInvalidSignature) {
          notifyParams["sandbox_sign"] = "INVALID_SIGNATURE_FOR_TESTING";
        } else {
          notifyParams["sandbox_sign"] = this.generateSandboxSign(notifyParams);
        }

        const executeNotify = async () => {
          try {
            await fetch(notifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(notifyParams),
            });
          } catch {
            // 忽略网络错误
          }
        };

        if (params.repeatCount && params.repeatCount > 1) {
          executeNotify();
          let count = 1;
          const interval = setInterval(() => {
            count++;
            executeNotify();
            if (count >= (params.repeatCount || 1)) {
              clearInterval(interval);
            }
          }, params.repeatIntervalMs || 1000);
        } else {
          executeNotify();
        }

        resolve({ success: true });
      }, params.delayMs || 0);
    });
  }

  /**
   * 创建用于测试错误场景的模拟交易（不关联真实订单）
   */
  createMockTransaction(params: {
    amount: number;
    currency?: string;
    orderNo?: string;
  }): string {
    const mockTradeNo = `MOCK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    sandboxTransactions.set(mockTradeNo, {
      providerTradeNo: mockTradeNo,
      orderNo: params.orderNo ?? `MOCK_${mockTradeNo}`,
      amount: params.amount,
      currency: params.currency ?? "CNY",
      status: "pending",
      createdAt: new Date(),
      metadata: { isMock: true },
    });
    return mockTradeNo;
  }

  getTransaction(providerTradeNo: string): SandboxTransaction | undefined {
    return sandboxTransactions.get(providerTradeNo);
  }

  getRefund(refundId: string): SandboxRefund | undefined {
    return sandboxRefunds.get(refundId);
  }
}
