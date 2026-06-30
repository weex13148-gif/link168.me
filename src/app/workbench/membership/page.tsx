"use client";

import { useState, useEffect, useCallback } from "react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { Crown, Sparkles, Check, Loader, X, QrCode, CreditCard, Clock, CheckCircle, XCircle, Loader2, Building2, Zap, AlertCircle, RefreshCw } from "lucide-react";

type PlanDef = {
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, number | boolean>;
  highlight?: boolean;
  contact_sales?: boolean;
};

type Subscription = {
  id: string;
  plan_code: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
};

type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  percent: number | null;
};

type OrderItem = {
  id: string;
  order_no: string;
  plan_code: string;
  plan_name: string;
  billing_cycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  is_test: boolean;
  refund_amount: number;
};

type MembershipData = {
  subscription: Subscription | null;
  plan: PlanDef;
  ai_usage: AiUsage;
  credit_balance: number;
  plan_definitions: Record<string, PlanDef>;
  plan_order: string[];
  payment: {
    enabled: boolean;
    wechat_available: boolean;
    alipay_available: boolean;
    sandbox_available: boolean;
  };
};

const STATUS_LABELS: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "待支付", className: "bg-[#F6E7C8] text-[#8C612E]", icon: Clock },
  processing: { label: "处理中", className: "bg-[#DBEAFE] text-[#1E40AF]", icon: Loader2 },
  paid: { label: "已支付", className: "bg-[#DDE8CD] text-[#3F5F31]", icon: CheckCircle },
  failed: { label: "支付失败", className: "bg-red-50 text-red-600", icon: XCircle },
  cancelled: { label: "已取消", className: "bg-[#F7F1E7] text-[#7A6D5E]", icon: XCircle },
  expired: { label: "已过期", className: "bg-[#F7F1E7] text-[#7A6D5E]", icon: XCircle },
  refund_pending: { label: "退款处理中", className: "bg-[#F6E7C8] text-[#8C612E]", icon: Loader2 },
  partially_refunded: { label: "部分退款", className: "bg-[#F2E7D8] text-[#C9824B]", icon: XCircle },
  refunded: { label: "已退款", className: "bg-[#F2E7D8] text-[#C9824B]", icon: XCircle },
  closed: { label: "已关闭", className: "bg-[#F7F1E7] text-[#7A6D5E]", icon: XCircle },
};

export default function WorkbenchMembershipPage() {
  const [data, setData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    order_id?: string;
    order_no?: string;
    pay_url?: string;
    qr_code_url?: string;
    error?: string;
  } | null>(null);
  const [sandboxResult, setSandboxResult] = useState<{
    success?: boolean;
    message?: string;
    order_no?: string;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<"plans" | "orders">("plans");
  const [sandboxAction, setSandboxAction] = useState<"success" | "fail" | "cancel" | "timeout" | "amount_error" | "order_error" | "signature_error">("success");
  const [sandboxDelay, setSandboxDelay] = useState(0);

  const fetchMembership = useCallback(async () => {
    try {
      const res = await fetch("/api/workbench/membership");
      const json = await res.json();
      if (json.success) {
        setData(json as MembershipData);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/billing/orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  const handleSelectPlan = (planCode: string) => {
    const plan = data?.plan_definitions?.[planCode];
    if (!plan) return;

    if (plan.contact_sales) {
      return;
    }

    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    if (price <= 0) {
      return;
    }

    setSelectedPlan(planCode);
    setShowPaymentModal(true);
    setOrderResult(null);
    setPollingStatus("idle");
  };

  const handleSelectSandboxPlan = (planCode: string) => {
    const plan = data?.plan_definitions?.[planCode];
    if (!plan || plan.contact_sales) return;
    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    if (price <= 0) return;

    setSelectedPlan(planCode);
    setShowSandboxModal(true);
    setSandboxResult(null);
    setPollingStatus("idle");
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan) return;

    setOrderLoading(true);
    setOrderResult(null);

    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_code: selectedPlan,
          billing_cycle: billingCycle,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setOrderResult({ error: json.error || "创建订单失败" });
        return;
      }

      const orderId = json.order.id;
      const payRes = await fetch(`/api/billing/orders/${orderId}?action=pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: paymentMethod }),
      });

      const payJson = await payRes.json();

      if (!payJson.success) {
        setOrderResult({ error: payJson.error || "支付下单失败" });
        return;
      }

      setOrderResult({
        order_id: orderId,
        order_no: json.order.order_no,
        pay_url: payJson.payment?.pay_url,
        qr_code_url: payJson.payment?.qr_code_url,
      });

      startPolling(orderId);
    } catch (error) {
      setOrderResult({ error: error instanceof Error ? error.message : "网络错误" });
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCreateSandboxOrder = async () => {
    if (!selectedPlan) return;

    setOrderLoading(true);
    setSandboxResult(null);

    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_code: selectedPlan,
          billing_cycle: billingCycle,
          is_test: true,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setSandboxResult({ success: false, message: json.error || "创建订单失败" });
        return;
      }

      const orderId = json.order.id;
      const tradeNo = json.order.trade_no;

      // 根据选择的场景决定调用哪个 API action
      const isErrorScenario = sandboxAction === "amount_error" || sandboxAction === "order_error" || sandboxAction === "signature_error";

      const sandboxPayload: Record<string, unknown> = {
        tradeNo,
        ...(isErrorScenario
          ? { errorType: sandboxAction.replace("_error", "") }
          : { payAction: sandboxAction === "timeout" ? "success" : sandboxAction }),
        ...(sandboxDelay > 0 ? { delayMs: sandboxDelay * 1000 } : {}),
      };

      const sandboxRes = await fetch("/api/payments/sandbox?action=" + (isErrorScenario ? "pay-with-error" : "pay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sandboxPayload),
      });

      const sandboxJson = await sandboxRes.json();

      if (!sandboxJson.success) {
        setSandboxResult({ success: false, message: sandboxJson.error || "沙箱操作失败" });
        return;
      }

      setSandboxResult({
        success: true,
        message: sandboxJson.message || "沙箱操作已触发",
        order_no: json.order.order_no,
      });

      startPolling(orderId);
    } catch (error) {
      setSandboxResult({ success: false, message: error instanceof Error ? error.message : "网络错误" });
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/billing/orders/${orderId}?action=cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        fetchOrders();
      }
    } catch {
      // ignore
    }
  };

  const handleRetryPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/billing/orders/${orderId}?action=pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: "wechat" }),
      });
      const json = await res.json();
      if (json.success) {
        startPolling(orderId);
      }
    } catch {
      // ignore
    }
  };

  const startPolling = (orderId: string) => {
    setPollingStatus("polling");
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPollingStatus("failed");
        return;
      }

      attempts++;
      try {
        const res = await fetch(`/api/billing/orders/${orderId}`);
        const json = await res.json();

        if (json.success && json.order.status === "paid") {
          setPollingStatus("success");
          fetchMembership();
          fetchOrders();
          return;
        }

        if (json.success && (json.order.status === "cancelled" || json.order.status === "closed")) {
          setPollingStatus("failed");
          return;
        }

        if (json.success && json.order.status === "failed") {
          setPollingStatus("failed");
          return;
        }
      } catch {
        // ignore
      }

      setTimeout(poll, 2000);
    };

    setTimeout(poll, sandboxDelay > 0 ? sandboxDelay * 1000 + 1000 : 2000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setShowSandboxModal(false);
    setSelectedPlan(null);
    setOrderResult(null);
    setSandboxResult(null);
    setPollingStatus("idle");
    fetchOrders();
    fetchMembership();
  };

  if (loading) {
    return (
      <WorkbenchShell eyebrow="Membership & AI Quota" title="会员与 AI 额度" subtitle="管理当前订阅、查看 AI 调用额度与剩余资源、升级或续费。">
        <div className="flex items-center justify-center py-20">
          <Loader className="size-6 animate-spin text-[#6F8F4E]" />
        </div>
      </WorkbenchShell>
    );
  }

  const planDef = data?.plan;
  const aiUsage = data?.ai_usage;
  const subscription = data?.subscription;
  const planDefinitions = data?.plan_definitions ?? {};
  const planOrder = data?.plan_order ?? ["free", "member_basic", "member_plus", "enterprise"];
  const creditBalance = data?.credit_balance ?? 0;
  const paymentEnabled = data?.payment.enabled ?? false;
  const sandboxAvailable = data?.payment.sandbox_available ?? false;

  const planLimit = planDef?.limits.ai_chats_per_month ?? 50;
  const usedChats = aiUsage?.used ?? 0;
  const remainingChats = aiUsage?.remaining ?? 0;
  const usagePercent = aiUsage?.percent ?? 0;

  const now = new Date();
  const endDate = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const remainingDays = endDate && endDate > now
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <WorkbenchShell eyebrow="Membership & AI Quota" title="会员与 AI 额度" subtitle="管理当前订阅、查看 AI 调用额度与剩余资源、升级或续费。">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-[#F6E7C8] text-[#8C612E]">
              <Crown aria-hidden className="size-4" />
            </span>
            <p className="text-sm font-black text-[#3F5F31]">当前订阅</p>
          </div>
          <p className="mt-3 text-2xl font-black text-[#2B241E]">{planDef?.name ?? "免费版"}</p>
          {subscription?.current_period_end ? (
            <>
              <p className="text-xs text-[#7A6D5E]">
                到期时间：{new Date(subscription.current_period_end).toLocaleDateString("zh-CN")}
              </p>
              {remainingDays !== null && remainingDays <= 7 && (
                <p className="mt-1 text-xs text-[#C9824B]">
                  <AlertCircle aria-hidden className="inline size-3 mr-1" />
                  剩余 {remainingDays} 天到期
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#7A6D5E]">尚未订阅付费套餐</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1.5 font-black ${
                subscription?.status === "active" ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E]"
              }`}
            >
              {subscription?.status === "active" ? "已开通" : "未开通"}
            </span>
            {subscription?.current_period_end && (
              <span className="rounded-full bg-[#F7F1E7] px-3 py-1.5 font-black text-[#3F5F31]">
                {subscription.plan_code.toUpperCase()} 套餐
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">AI 咨询额度</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {usedChats.toLocaleString()}
            <span className="text-sm text-[#7A6D5E]">
              {" "}
              / {planLimit === -1 ? "∞" : usedChats + remainingChats}
            </span>
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#F7F1E7]">
            <div
              className="h-full rounded-full bg-[#6F8F4E]"
              style={{ width: `${Math.min(100, usagePercent ?? 0)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[#7A6D5E]">
            {remainingChats === -1
              ? "本月已使用 " + usedChats.toLocaleString() + " 次（无限额度）"
              : `本月剩余 ${remainingChats.toLocaleString()} 次，建议升级或单独购买额度包。`}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">资源使用概览</p>
          <dl className="mt-3 grid gap-3 text-sm">
            {[
              { label: "AI 名片", value: `1 / ${planDef?.limits.products ?? 3}` },
              {
                label: "企业资料库",
                value: `0 篇 / ${planDef?.limits.knowledge_docs ?? 5} 篇`,
              },
              { label: "AI 额度余额", value: creditBalance > 0 ? `${creditBalance} Credits` : "—" },
              { label: "当前套餐", value: planDef?.name ?? "免费版" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3"
              >
                <dt className="font-bold text-[#2B241E]">{item.label}</dt>
                <dd className="text-xs font-black text-[#3F5F31]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden className="size-4 text-[#6F8F4E]" />
            <p className="text-sm font-black text-[#3F5F31]">套餐中心</p>
          </div>
          <div className="flex gap-1 rounded-full bg-[#F7F1E7] p-1">
            <button
              onClick={() => setActiveTab("plans")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === "plans" ? "bg-white text-[#2B241E] shadow-sm" : "text-[#7A6D5E]"
              }`}
            >
              套餐选择
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === "orders" ? "bg-white text-[#2B241E] shadow-sm" : "text-[#7A6D5E]"
              }`}
            >
              我的订单
            </button>
          </div>
        </div>

        {activeTab === "plans" && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[#7A6D5E]">选择最适合你当前经营阶段的套餐。</p>
              <div className="inline-flex items-center gap-1 rounded-full bg-[#F7F1E7] p-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    billingCycle === "monthly" ? "bg-white text-[#2B241E] shadow-sm" : "text-[#7A6D5E]"
                  }`}
                >
                  月付
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    billingCycle === "yearly" ? "bg-white text-[#2B241E] shadow-sm" : "text-[#7A6D5E]"
                  }`}
                >
                  年付
                  <span className="rounded-full bg-[#DDE8CD] px-1.5 py-0.5 text-[10px] font-black text-[#3F5F31]">
                    省
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              {planOrder.map((planKey) => {
                const plan = planDefinitions[planKey];
                if (!plan) return null;
                const isCurrentPlan = subscription?.plan_code === planKey;
                const isHighlight = plan.highlight;
                const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;

                return (
                  <div
                    key={planKey}
                    className={`flex flex-col justify-between rounded-[28px] border p-5 ${
                      isHighlight
                        ? "border-[#6F8F4E] bg-[#DDE8CD]"
                        : isCurrentPlan
                          ? "border-[#2563EB] bg-[#EAF3FF]"
                          : "border-[#E8DCCB] bg-[#F7F1E7]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-black text-[#2B241E]">{plan.name}</p>
                        {isHighlight && (
                          <span className="rounded-full bg-[#6F8F4E] px-3 py-1 text-xs font-black text-white">
                            推荐
                          </span>
                        )}
                        {isCurrentPlan && (
                          <span className="rounded-full bg-[#2563EB] px-3 py-1 text-xs font-black text-white">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-2xl font-black tracking-tight text-[#2B241E]">
                        {plan.contact_sales
                          ? "¥ 面议"
                          : price <= 0
                            ? "¥ 0"
                            : `¥ ${price}`}
                        <span className="text-sm text-[#7A6D5E]">
                          {" "}
                          / {plan.contact_sales ? "" : billingCycle === "yearly" ? "年" : "月"}
                        </span>
                      </p>
                      <ul className="mt-4 grid gap-2 text-sm">
                        {plan.features.slice(0, 5).map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check aria-hidden className="mt-0.5 size-4 text-[#6F8F4E]" />
                            <span className="text-[#2B241E]">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-5 flex flex-col gap-2">
                      {plan.contact_sales ? (
                        <a
                          href="mailto:business@link168.me"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2B241E] px-4 text-xs font-black text-white"
                        >
                          <Building2 aria-hidden className="size-4" />
                          联系销售
                        </a>
                      ) : price <= 0 ? (
                        <button
                          disabled
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#7A6D5E] ring-1 ring-[#E8DCCB]"
                        >
                          当前套餐
                        </button>
                      ) : isCurrentPlan ? (
                        <button
                          disabled
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#2563EB] ring-1 ring-[#2563EB]"
                        >
                          当前套餐
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectPlan(planKey)}
                            disabled={!paymentEnabled}
                            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
                              isHighlight
                                ? "bg-[#2B241E] text-white hover:bg-[#3F5F31]"
                                : "bg-white text-[#2B241E] ring-1 ring-[#E8DCCB] hover:bg-[#F2E7D8]"
                            } disabled:opacity-50 disabled:hover:bg-white`}
                          >
                            {paymentEnabled ? "立即升级" : "即将开放"}
                          </button>
                          {sandboxAvailable && (
                            <button
                              onClick={() => handleSelectSandboxPlan(planKey)}
                              className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full border border-[#F59E0B] bg-[#FFFBEB] px-4 text-xs font-black text-[#B45309] transition hover:bg-[#FEF3C7]"
                            >
                              <Zap aria-hidden className="size-3" />
                              沙箱测试
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!paymentEnabled && (
              <p className="mt-4 text-center text-xs text-[#7A6D5E]">
                <AlertCircle aria-hidden className="inline size-3 mr-1 text-[#C9824B]" />
                在线支付接口配置中，暂未开放自动支付。目前仅支持内部沙箱测试。
              </p>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <div className="mt-4">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader className="size-5 animate-spin text-[#6F8F4E]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid size-14 place-items-center rounded-full bg-[#F7F1E7]">
                  <Clock aria-hidden className="size-6 text-[#7A6D5E]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#2B241E]">暂无订单</p>
                <p className="mt-1 text-xs text-[#7A6D5E]">升级套餐后订单记录会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                  const StatusIcon = statusInfo.icon;
                  const isPending = order.status === "pending";
                  const isFailed = order.status === "failed";
                  const isExpired = order.status === "expired";

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid size-10 place-items-center rounded-xl ${statusInfo.className}`}
                          >
                            <StatusIcon aria-hidden className="size-5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-[#2B241E]">{order.plan_name}</p>
                              {order.is_test && (
                                <span className="rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-black text-[#B45309]">
                                  测试订单
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#7A6D5E]">
                              订单号：{order.order_no} · {order.billing_cycle === "yearly" ? "年付" : "月付"}
                            </p>
                            {order.paid_at && (
                              <p className="text-xs text-[#7A6D5E]">
                                支付时间：{new Date(order.paid_at).toLocaleString("zh-CN")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-[#2B241E]">¥ {order.amount}</p>
                          {order.refund_amount > 0 && (
                            <p className="text-xs text-[#C9824B]">已退款 ¥ {order.refund_amount}</p>
                          )}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      {(isPending || isFailed || isExpired) && (
                        <div className="flex gap-2 border-t border-[#E8DCCB] pt-3">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleRetryPayment(order.id)}
                                className="flex-1 min-h-8 flex items-center justify-center gap-1 rounded-xl bg-[#6F8F4E] text-xs font-black text-white transition hover:bg-[#5E7F3F]"
                              >
                                <RefreshCw aria-hidden className="size-3" />
                                重新支付
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="min-h-8 rounded-xl border border-[#E8DCCB] bg-white px-4 text-xs font-semibold text-[#7A6D5E] transition hover:bg-[#F7F1E7]"
                              >
                                取消订单
                              </button>
                            </>
                          )}
                          {(isFailed || isExpired) && (
                            <button
                              onClick={() => handleRetryPayment(order.id)}
                              className="flex-1 min-h-8 flex items-center justify-center gap-1 rounded-xl bg-[#6F8F4E] text-xs font-black text-white transition hover:bg-[#5E7F3F]"
                            >
                              <RefreshCw aria-hidden className="size-3" />
                              重新支付
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[#2B241E]">
                  开通 {planDefinitions[selectedPlan]?.name}
                </p>
                <p className="mt-1 text-sm text-[#7A6D5E]">
                  {billingCycle === "yearly" ? "按年付费" : "按月付费"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="grid size-9 place-items-center rounded-full bg-[#F7F1E7] text-[#5F5347] transition hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#F7F1E7] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#7A6D5E]">应付金额</span>
                <span className="text-2xl font-black text-[#2B241E]">
                  ¥ {billingCycle === "yearly"
                    ? planDefinitions[selectedPlan]?.price_yearly
                    : planDefinitions[selectedPlan]?.price_monthly}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[#2B241E]">选择支付方式</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("wechat")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    paymentMethod === "wechat"
                      ? "border-[#07C160] bg-[#07C160]/10 text-[#07C160]"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  <QrCode aria-hidden className="size-4" />
                  微信支付
                </button>
                <button
                  onClick={() => setPaymentMethod("alipay")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    paymentMethod === "alipay"
                      ? "border-[#1677FF] bg-[#1677FF]/10 text-[#1677FF]"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  <CreditCard aria-hidden className="size-4" />
                  支付宝
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#FFFBEB] p-4">
              <p className="text-xs text-[#B45309]">
                <AlertCircle aria-hidden className="mr-1 inline size-3" />
                正式支付暂未开放，请使用沙箱测试功能体验完整流程。
              </p>
            </div>

            {orderResult?.error && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {orderResult.error}
              </div>
            )}

            {orderResult?.order_no && !orderResult.error && (
              <div className="mt-4 rounded-2xl bg-[#DDE8CD] p-4">
                <p className="text-sm font-semibold text-[#3F5F31]">订单已创建</p>
                <p className="mt-1 text-xs text-[#5F5347]">订单号：{orderResult.order_no}</p>
                {pollingStatus === "polling" && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#3F5F31]">
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    正在等待支付结果...
                  </p>
                )}
                {pollingStatus === "success" && (
                  <p className="mt-2 text-sm font-black text-[#3F5F31]">
                    ✅ 支付成功！会员已开通
                  </p>
                )}
                {pollingStatus === "failed" && (
                  <p className="mt-2 text-xs text-[#C9824B]">
                    支付失败或取消
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 min-h-11 rounded-full border border-[#E8DCCB] bg-white text-sm font-semibold text-[#5F5347] transition hover:bg-[#F7F1E7]"
              >
                取消
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={orderLoading || pollingStatus === "polling" || pollingStatus === "success"}
                className="flex-1 min-h-11 rounded-full bg-[#6F8F4E] text-sm font-black text-white transition hover:bg-[#5E7F3F] disabled:opacity-50"
              >
                {orderLoading
                  ? "创建订单中..."
                  : pollingStatus === "success"
                    ? "支付成功"
                    : "确认支付"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSandboxModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[#2B241E]">
                  沙箱测试支付
                </p>
                <p className="mt-1 text-sm text-[#7A6D5E]">
                  套餐：{planDefinitions[selectedPlan]?.name} | {billingCycle === "yearly" ? "按年" : "按月"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="grid size-9 place-items-center rounded-full bg-[#F7F1E7] text-[#5F5347] transition hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#FFFBEB] p-4 border border-[#FDE68A]">
              <div className="flex items-center gap-2 mb-2">
                <Zap aria-hidden className="size-4 text-[#F59E0B]" />
                <span className="text-sm font-semibold text-[#B45309]">测试订单</span>
              </div>
              <p className="text-xs text-[#92400E]">
                此订单仅用于内部测试，不会产生真实交易。
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-[#F7F1E7] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#7A6D5E]">测试金额</span>
                <span className="text-2xl font-black text-[#2B241E]">
                  ¥ {billingCycle === "yearly"
                    ? planDefinitions[selectedPlan]?.price_yearly
                    : planDefinitions[selectedPlan]?.price_monthly}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[#2B241E]">模拟支付结果</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSandboxAction("success")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "success"
                      ? "border-[#10B981] bg-[#ECFDF5] text-[#059669]"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  ✅ 支付成功
                </button>
                <button
                  onClick={() => setSandboxAction("fail")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "fail"
                      ? "border-[#EF4444] bg-red-50 text-red-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  ❌ 支付失败
                </button>
                <button
                  onClick={() => setSandboxAction("cancel")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "cancel"
                      ? "border-[#F59E0B] bg-[#FFFBEB] text-[#B45309]"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  ⏹️ 用户取消
                </button>
                <button
                  onClick={() => setSandboxAction("timeout")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "timeout"
                      ? "border-[#6B7280] bg-gray-50 text-gray-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  ⏱️ 超时
                </button>
                <button
                  onClick={() => setSandboxAction("amount_error")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "amount_error"
                      ? "border-[#8B5CF6] bg-purple-50 text-purple-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  💰 错误金额
                </button>
                <button
                  onClick={() => setSandboxAction("signature_error")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "signature_error"
                      ? "border-[#8B5CF6] bg-purple-50 text-purple-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  🔐 错误签名
                </button>
              </div>
              {sandboxAction === "amount_error" && (
                <p className="mt-2 text-xs text-purple-600">⚠️ 将收到金额为 0.01 元 的回调（与订单金额不匹配）</p>
              )}
              {sandboxAction === "signature_error" && (
                <p className="mt-2 text-xs text-purple-600">⚠️ 将收到签名验证失败的回调</p>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[#2B241E]">回调延迟（秒）</p>
              <div className="flex gap-2">
                {[0, 3, 5, 10].map((delay) => (
                  <button
                    key={delay}
                    onClick={() => setSandboxDelay(delay)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                      sandboxDelay === delay
                        ? "border-[#6F8F4E] bg-[#6F8F4E] text-white"
                        : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                    }`}
                  >
                    {delay === 0 ? "立即" : `${delay}秒`}
                  </button>
                ))}
              </div>
            </div>

            {sandboxResult && (
              <div className={`mt-4 rounded-2xl p-4 ${sandboxResult.success ? "bg-[#DDE8CD]" : "bg-red-50"}`}>
                <p className={`text-sm font-semibold ${sandboxResult.success ? "text-[#3F5F31]" : "text-red-600"}`}>
                  {sandboxResult.success ? "✅" : "❌"} {sandboxResult.message}
                </p>
                {sandboxResult.order_no && (
                  <p className="mt-1 text-xs text-[#5F5347]">订单号：{sandboxResult.order_no}</p>
                )}
                {pollingStatus === "polling" && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#3F5F31]">
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    正在等待回调...
                  </p>
                )}
                {pollingStatus === "success" && (
                  <p className="mt-2 text-sm font-black text-[#3F5F31]">
                    ✅ 支付成功！会员已开通
                  </p>
                )}
                {pollingStatus === "failed" && (
                  <p className="mt-2 text-xs text-[#C9824B]">
                    支付失败或取消
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 min-h-11 rounded-full border border-[#E8DCCB] bg-white text-sm font-semibold text-[#5F5347] transition hover:bg-[#F7F1E7]"
              >
                取消
              </button>
              <button
                onClick={handleCreateSandboxOrder}
                disabled={orderLoading || pollingStatus === "polling" || pollingStatus === "success"}
                className="flex-1 min-h-11 rounded-full bg-[#F59E0B] text-sm font-black text-white transition hover:bg-[#D97706] disabled:opacity-50"
              >
                {orderLoading ? "处理中..." : pollingStatus === "success" ? "已完成" : "执行测试"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkbenchShell>
  );
}
