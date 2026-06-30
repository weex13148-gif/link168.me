/**
 * 支付配置查询 API（返回安全的公开信息）
 * 
 * 安全原则：
 * - 不返回任何敏感配置（密钥、公钥等）
 * - 只返回支付可用性状态
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getPaymentAvailability, getPaymentConfig } from "@/lib/billing/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const availability = await getPaymentAvailability();
  const config = await getPaymentConfig();

  // 只返回安全的公开信息
  return NextResponse.json({
    success: true,
    payment: {
      enabled: availability.paymentEnabled,
      wechatAvailable: availability.wechatAvailable,
      alipayAvailable: availability.alipayAvailable,
      wechatReason: availability.wechatReason,
      alipayReason: availability.alipayReason,
      testMode: config.testMode,
    },
  });
}
