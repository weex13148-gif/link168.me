import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 旧版支付回调入口已停用。
 *
 * 正式支付宝回调统一使用：/api/payments/alipay/notify
 * 沙箱回调统一使用：/api/payments/sandbox/notify
 *
 * 保留本路由仅用于兼容旧客户端发现接口迁移，不再接受任何订单状态修改，
 * 避免未验签 JSON 请求直接激活会员。
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "旧版支付回调已停用，请使用统一支付回调入口。",
      code: "LEGACY_PAYMENT_NOTIFY_DISABLED",
    },
    { status: 410 },
  );
}
