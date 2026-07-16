export type PaymentSimulationOptions = {
  nodeEnv?: string;
  explicitSandbox?: boolean;
};

export function isPaymentSimulationAllowed(
  testMode: boolean,
  options: PaymentSimulationOptions = {},
): boolean {
  if (!testMode) return false;
  const nodeEnv = (options.nodeEnv ?? process.env.NODE_ENV ?? "").toLowerCase();
  const explicitSandbox = options.explicitSandbox
    ?? String(process.env.ALLOW_PAYMENT_SANDBOX || "false").toLowerCase() === "true";
  return nodeEnv !== "production" && explicitSandbox;
}

export function paymentSimulationBlockedReason(testMode: boolean): string | null {
  if (!testMode) return null;
  return isPaymentSimulationAllowed(testMode)
    ? null
    : "当前环境禁止测试支付模式，请关闭测试模式并完成真实支付配置。";
}
