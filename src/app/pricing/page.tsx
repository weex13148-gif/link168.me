"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles, Building2, X, Loader2, CreditCard, Zap, AlertCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

type PlanDef = {
  code: string;
  name: string;
  description: string;
  price_cents: { monthly: number | null; yearly: number | null };
  price_display: { monthly: string; yearly: string };
  currency: string;
  features: string[];
  limits: Record<string, number | boolean>;
  highlight?: boolean;
  contact_sales?: boolean;
};

type MembershipData = {
  subscription: { id: string; plan_code: string; status: string; current_period_end: string | null } | null;
  plan: PlanDef;
  plan_definitions: Record<string, PlanDef>;
  plan_order: string[];
  payment: { enabled: boolean; wechat_available: boolean; alipay_available: boolean; sandbox_available: boolean };
};

export default function PricingPage() {
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    order_id?: string;
    order_no?: string;
    pay_url?: string;
    qr_code_url?: string;
    error?: string;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "failed">("idle");
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{
    success?: boolean;
    message?: string;
    order_no?: string;
  } | null>(null);
  const [sandboxAction, setSandboxAction] = useState<"success" | "fail" | "cancel" | "timeout">("success");
  const [sandboxDelay, setSandboxDelay] = useState(0);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);

  const fetchMembership = async () => {
    try {
      const res = await fetch("/api/workbench/membership");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMembershipData(json);
        }
      }
    } catch {
      // not logged in is fine
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const plans = membershipData?.plan_definitions;
  const planOrder = membershipData?.plan_order ?? ["free", "pro", "enterprise"];
  const currentPlanCode = membershipData?.subscription?.plan_code ?? "free";
  const paymentEnabled = membershipData?.payment.enabled ?? false;
  const sandboxAvailable = membershipData?.payment.sandbox_available ?? false;

  const handleSelectPlan = async (planCode: string) => {
    const plan = plans?.[planCode];
    if (!plan) return;

    if (plan.contact_sales) {
      return;
    }

    const priceCents = plan.price_cents?.yearly;
    if (priceCents === null || priceCents === undefined || priceCents <= 0) {
      return;
    }

    setSelectedPlan(planCode);
    setAcceptedLegalTerms(false);
    setShowPaymentModal(true);
    setOrderResult(null);
    setPollingStatus("idle");
  };

  const handleSelectSandboxPlan = (planCode: string) => {
    const plan = plans?.[planCode];
    if (!plan || plan.contact_sales) return;
    const priceCents = plan.price_cents?.yearly;
    if (priceCents === null || priceCents === undefined || priceCents <= 0) return;

    setSelectedPlan(planCode);
    setShowSandboxModal(true);
    setSandboxResult(null);
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan) return;
    if (!acceptedLegalTerms) {
      setOrderResult({ error: "请先阅读并同意会员服务协议、支付与退款规则和 AI 服务说明。" });
      return;
    }

    setOrderLoading(true);
    setOrderResult(null);

    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_code: selectedPlan,
          billing_cycle: "yearly",
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
        body: JSON.stringify({ payment_method: "alipay" }),
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
          billing_cycle: "yearly",
          is_test: true,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setSandboxResult({ success: false, message: json.error || "创建订单失败" });
        return;
      }

      const orderId = json.order.id;

      const sandboxRes = await fetch("/api/payments/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          action: sandboxAction,
          delay: sandboxDelay,
        }),
      });

      const sandboxJson = await sandboxRes.json();

      if (!sandboxJson.success) {
        setSandboxResult({ success: false, message: sandboxJson.error || "沙箱支付失败" });
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

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#F7F1E7] text-[#2B241E]">
      <AppHeader />
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_48%,#F2E7D8_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,rgba(221,232,205,0.65),transparent_24%),radial-gradient(circle_at_76%_24%,rgba(200,164,93,0.14),transparent_20%),radial-gradient(circle_at_58%_78%,rgba(242,231,216,0.72),transparent_26%)]" />

          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8]/82 px-4 py-2 text-sm font-semibold text-[#3F5F31] shadow-sm">
              <Sparkles aria-hidden className="size-4 text-[#C8A45D]" />
              选择最适合你的套餐
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              简单透明的定价
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#7A6D5E] sm:text-lg">
              从免费版开始，随时升级。所有套餐均包含基础经营名片能力，满足不同阶段的经营需求。
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] p-1 shadow-sm">
              <button
                disabled
                className="rounded-full px-5 py-2 text-sm font-semibold text-[#A89888] cursor-not-allowed"
              >
                按月付费
                <span className="ml-2 rounded-full bg-[#F5F0E8] px-2 py-0.5 text-[10px] font-black text-[#A89888]">
                  不可用
                </span>
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[#6F8F4E] px-5 py-2 text-sm font-semibold text-white shadow"
              >
                按年付费
                <span className="rounded-full bg-[#F6E7C8] px-2 py-0.5 text-[10px] font-black text-[#8C612E]">
                  推荐
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-3">
              {planOrder.map((planCode) => {
                const plan = plans?.[planCode];
                if (!plan) return null;

                const isCurrentPlan = currentPlanCode === planCode;
                const priceDisplay = plan.price_display?.yearly ?? "不可用";

                return (
                  <div
                    key={planCode}
                    className={`flex flex-col rounded-[28px] border p-6 transition ${
                      plan.highlight
                        ? "border-[#6F8F4E] bg-[#DDE8CD] shadow-lg shadow-[#6F8F4E]/10"
                        : isCurrentPlan
                          ? "border-[#2563EB] bg-[#EAF3FF]"
                          : "border-[#E8DCCB] bg-[#FFFDF8] shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-black text-[#3F5F31]">{plan.name}</p>
                        <p className="mt-1 text-xs text-[#7A6D5E]">{plan.description}</p>
                      </div>
                      {plan.highlight && (
                        <span className="rounded-full bg-[#6F8F4E] px-2.5 py-1 text-[10px] font-black text-white">
                          推荐
                        </span>
                      )}
                      {isCurrentPlan && (
                        <span className="rounded-full bg-[#2563EB] px-2.5 py-1 text-[10px] font-black text-white">
                          当前
                        </span>
                      )}
                    </div>

                    <div className="mt-5">
                      {plan.contact_sales ? (
                        <p className="text-2xl font-black tracking-tight">联系销售</p>
                      ) : priceDisplay === "免费" ? (
                        <p className="text-3xl font-black tracking-tight">
                          免费
                          <span className="text-sm font-normal text-[#7A6D5E]"> / 永久</span>
                        </p>
                      ) : (
                        <p className="text-3xl font-black tracking-tight">
                          {priceDisplay}
                        </p>
                      )}
                    </div>

                    <ul className="mt-5 flex-1 space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[#6F8F4E]" />
                          <span className="text-[#2B241E]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex flex-col gap-3">
                      {plan.contact_sales ? (
                        <Link
                          href="mailto:business@link168.me"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2B241E] px-4 text-xs font-black text-white transition hover:bg-[#3F5F31]"
                        >
                          <Building2 aria-hidden className="size-4" />
                          联系销售
                        </Link>
                      ) : priceDisplay === "免费" ? (
                        <Link
                          href="/register"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 text-xs font-black text-[#2B241E] transition hover:bg-[#F2E7D8]"
                        >
                          免费开始
                        </Link>
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
                            onClick={() => handleSelectPlan(planCode)}
                            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
                              plan.highlight
                                ? "bg-[#2B241E] text-white hover:bg-[#3F5F31]"
                                : "bg-white text-[#2B241E] ring-1 ring-[#E8DCCB] hover:bg-[#F2E7D8]"
                            }`}
                          >
                            {paymentEnabled ? "立即升级" : "即将开放"}
                          </button>
                          {sandboxAvailable && (
                            <button
                              onClick={() => handleSelectSandboxPlan(planCode)}
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
              <div className="mt-8 rounded-[24px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center">
                <p className="text-sm font-semibold text-[#7A6D5E]">
                  <AlertCircle aria-hidden className="mr-2 inline size-4 text-[#C8A45D]" />
                  正式在线支付功能暂不可用，目前仅支持内部沙箱测试。
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#FFFDF8] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-black sm:text-4xl">常见问题</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                {
                  q: "可以随时升级套餐吗？",
                  a: "可以随时升级套餐，升级后立即生效。",
                },
                {
                  q: "支持哪些支付方式？",
                  a: "当前支持支付宝支付。",
                },
                {
                  q: "AI 额度怎么计算？",
                  a: "AI 额度按月重置，当月未用完不累计到下月。",
                },
                {
                  q: "退款政策是怎样的？",
                  a: "具体适用条件、处理流程和到账时间请查看《支付与退款规则》。",
                },
              ].map((faq, idx) => (
                <div key={idx} className="rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-5">
                  <p className="font-black text-[#2B241E]">{faq.q}</p>
                  <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />

      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[#2B241E]">
                  开通 {plans?.[selectedPlan]?.name}
                </p>
                <p className="mt-1 text-sm text-[#7A6D5E]">
                  按年付费
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[#F7F1E7] text-[#5F5347] transition hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#F7F1E7] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#7A6D5E]">应付金额</span>
                <span className="text-2xl font-black text-[#2B241E]">
                  {plans?.[selectedPlan]?.price_display?.yearly}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[#2B241E]">选择支付方式</p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#1677FF] bg-[#1677FF]/10 py-3 text-sm font-semibold text-[#1677FF]"
                >
                  <CreditCard aria-hidden className="size-4" />
                  支付宝
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#FFFBEB] p-4">
              <p className="text-xs text-[#B45309]">
                <AlertCircle aria-hidden className="mr-1 inline size-3" />
                当前为沙箱测试环境，请使用沙箱测试功能体验完整流程。
              </p>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#E8DCCB] bg-white p-4 text-xs leading-5 text-[#5F5347]">
              <input
                type="checkbox"
                checked={acceptedLegalTerms}
                onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                我已阅读并同意
                <Link href="/membership-agreement" target="_blank" className="font-black text-[#3F5F31]">《会员服务协议》</Link>、
                <Link href="/refund-policy" target="_blank" className="font-black text-[#3F5F31]">《支付与退款规则》</Link>和
                <Link href="/ai-disclaimer" target="_blank" className="font-black text-[#3F5F31]">《AI 服务说明》</Link>。
              </span>
            </label>

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
                    支付成功！会员已开通
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
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 min-h-11 rounded-full border border-[#E8DCCB] bg-white text-sm font-semibold text-[#5F5347] transition hover:bg-[#F7F1E7]"
              >
                取消
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!acceptedLegalTerms || orderLoading || pollingStatus === "polling" || pollingStatus === "success"}
                className="flex-1 min-h-11 rounded-full bg-[#6F8F4E] text-sm font-black text-white transition hover:bg-[#5E7F3F] disabled:opacity-50"
              >
                {orderLoading ? "创建订单中..." : pollingStatus === "success" ? "支付成功" : "确认支付"}
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
                  套餐：{plans?.[selectedPlan]?.name} | 按年
                </p>
              </div>
              <button
                onClick={() => setShowSandboxModal(false)}
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
                  {plans?.[selectedPlan]?.price_display?.yearly}
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
                  支付成功
                </button>
                <button
                  onClick={() => setSandboxAction("fail")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "fail"
                      ? "border-[#EF4444] bg-red-50 text-red-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  支付失败
                </button>
                <button
                  onClick={() => setSandboxAction("cancel")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "cancel"
                      ? "border-[#F59E0B] bg-[#FFFBEB] text-[#B45309]"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  用户取消
                </button>
                <button
                  onClick={() => setSandboxAction("timeout")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "timeout"
                      ? "border-[#6B7280] bg-gray-50 text-gray-600"
                      : "border-[#E8DCCB] bg-white text-[#2B241E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  超时
                </button>
              </div>
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
                  {sandboxResult.success ? "" : ""} {sandboxResult.message}
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
                    支付成功！会员已开通
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
                onClick={() => setShowSandboxModal(false)}
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
    </div>
  );
}
