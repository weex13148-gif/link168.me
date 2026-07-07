import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SandboxPaymentProvider } from "@/lib/billing/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sandboxProvider = new SandboxPaymentProvider();

function isSandboxEnvironmentAllowed() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYMENT_MODE === "sandbox" && process.env.ENABLE_SANDBOX_PAYMENT === "true";
}

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] || char);
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  if (user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: "仅超级管理员可以使用支付宝测试页。" }, { status: 403 });
  }
  if (!isSandboxEnvironmentAllowed()) {
    return NextResponse.json({ success: false, error: "支付宝测试模式在生产环境已禁用。" }, { status: 403 });
  }

  const orderNo = new URL(request.url).searchParams.get("orderNo")?.trim() || "";
  if (!orderNo) return NextResponse.json({ success: false, error: "缺少 orderNo 参数" }, { status: 400 });

  const order = await db.order.findFirst({ where: { orderNo, userId: user.id } });
  if (!order) return NextResponse.json({ success: false, error: "订单不存在" }, { status: 404 });
  if (!["pending", "processing"].includes(order.status)) {
    return NextResponse.json({ success: false, error: `当前订单状态不可测试：${order.status}` }, { status: 409 });
  }

  const transaction = await sandboxProvider.createPayment(
    order.id,
    order.orderNo,
    order.payableAmount,
    order.currency,
  );
  if (!transaction.success || !transaction.providerTradeNo) {
    return NextResponse.json({ success: false, error: transaction.errorMessage || "创建沙箱交易失败" }, { status: 500 });
  }

  const tradeNo = htmlEscape(transaction.providerTradeNo);
  const safeOrderNo = htmlEscape(order.orderNo);
  const amount = (order.payableAmount / 100).toFixed(2);
  const page = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Link168 支付宝内部测试</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f4ef;color:#2b241e;margin:0;padding:24px}
    main{max-width:560px;margin:40px auto;background:#fff;border:1px solid #e8dccb;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(43,36,30,.08)}
    h1{font-size:24px;margin:0 0 12px}.meta{line-height:1.9;color:#6b625a}.warn{background:#fff7ed;border:1px solid #f2c9a5;border-radius:16px;padding:14px;margin:20px 0;color:#9a4e12}
    .actions{display:grid;gap:12px;margin-top:22px}button,a{min-height:46px;border-radius:14px;border:0;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;display:flex;align-items:center;justify-content:center}
    .ok{background:#6f8f4e;color:#fff}.fail{background:#f4ece2;color:#7c4c2a}.cancel{background:#eee;color:#444}.back{background:#fff;border:1px solid #ddd;color:#333}#result{margin-top:18px;white-space:pre-wrap;font-size:14px}
  </style>
</head>
<body>
<main>
  <h1>支付宝内部测试</h1>
  <div class="meta">订单号：${safeOrderNo}<br/>金额：¥${amount}<br/>交易号：${tradeNo}</div>
  <div class="warn">仅用于超级管理员验证支付闭环。正式生产环境必须关闭沙箱开关。</div>
  <div class="actions">
    <button class="ok" onclick="pay('success')">模拟支付成功</button>
    <button class="fail" onclick="pay('fail')">模拟支付失败</button>
    <button class="cancel" onclick="pay('cancel')">模拟用户取消</button>
    <a class="back" href="/workbench/membership">返回会员页面</a>
  </div>
  <div id="result"></div>
</main>
<script>
async function pay(action){
  const result = document.getElementById('result');
  result.textContent = '正在处理…';
  try {
    const response = await fetch('/api/payments/sandbox?action=pay', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tradeNo:'${tradeNo}', payAction:action})
    });
    const data = await response.json();
    result.textContent = data.success ? '操作已提交，请返回会员页面等待订单刷新。' : (data.error || '操作失败');
  } catch (error) {
    result.textContent = '请求失败，请返回后重试。';
  }
}
</script>
</body>
</html>`;

  return new NextResponse(page, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
