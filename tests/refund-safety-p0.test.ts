import fs from "node:fs";
import path from "node:path";
import { isPaymentSimulationAllowed } from "@/lib/billing/payment-safety";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("P0 refund truthfulness", () => {
  test("payment simulation is impossible in production", () => {
    expect(isPaymentSimulationAllowed(true, { nodeEnv: "production", explicitSandbox: true })).toBe(false);
    expect(isPaymentSimulationAllowed(true, { nodeEnv: "production", explicitSandbox: false })).toBe(false);
  });

  test("payment simulation requires an explicit non-production sandbox flag", () => {
    expect(isPaymentSimulationAllowed(true, { nodeEnv: "test", explicitSandbox: false })).toBe(false);
    expect(isPaymentSimulationAllowed(true, { nodeEnv: "test", explicitSandbox: true })).toBe(true);
    expect(isPaymentSimulationAllowed(false, { nodeEnv: "test", explicitSandbox: true })).toBe(false);
  });

  test("payment and refund paths use the same simulation guard", () => {
    expect(read("src/lib/billing/payments.ts")).toContain("isPaymentSimulationAllowed");
    expect(read("src/lib/billing/refund-service.ts")).toContain("isPaymentSimulationAllowed");
  });

  test("legacy local-only refund path cannot produce a financial success state", () => {
    const orders = read("src/lib/billing/orders.ts");
    expect(orders).toContain("LEGACY_REFUND_DISABLED");
    expect(orders).toContain("请使用支付渠道确认退款流程");
  });

  test("admin copy no longer claims the active refund flow is local-only", () => {
    const pages = [
      read("src/app/jeepwork/page.tsx"),
      read("src/app/jeepwork/settings/payment/page.tsx"),
    ].join("\n");
    expect(pages).not.toContain("退款流程仅更新本地订单状态");
    expect(pages).toContain("支付宝确认");
  });
});
