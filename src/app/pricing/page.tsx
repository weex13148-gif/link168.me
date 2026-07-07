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
  const planOrder = membershipData?.plan_order ?? ["free", "plus", "pro", "enterprise"];
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
    <div className="dark-public min-h-dvh overflow-x-clip">
      <AppHeader />
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#0B0F1A_0%,#0F172A_48%,#1e1b4b_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,rgba(139,92,246,0.15),transparent_24%),radial-gradient(circle_at_76%_24%,rgba(59,130,246,0.1),transparent_20%),radial-gradient(circle_at_58%_78%,rgba(139,92,246,0.08),transparent_26%)]" />

          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)]/82 px-4 py-2 text-sm font-semibold text-[var(--ui-brand)] shadow-sm">
              <Sparkles aria-hidden className="size-4 text-[var(--ui-accent)]" />
              选择最适合你的套餐
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              简单透明的定价
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--ui-muted)] sm:text-lg">
              从免费版开始，随时升级。所有套餐均包含基础经营名片能力，满足不同阶段的经营需求。
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] p-1 shadow-sm">
              <button
                disabled
                className="rounded-full px-5 py-2 text-sm font-semibold text-[var(--ui-muted)] cursor-not-allowed"
              >
                按月付费
                <span className="ml-2 rounded-full bg-[var(--ui-surface-muted)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-muted)]">
                  不可用
                </span>
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ui-brand)] px-5 py-2 text-sm font-semibold text-white shadow"
              >
                按年付费
                <span className="rounded-full bg-[var(--ui-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-accent)]">
                  推荐
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                        ? "border-[#6F8F4E] bg-[var(--ui-brand-soft)] shadow-lg shadow-[#6F8F4E]/10"
                        : isCurrentPlan
                          ? "border-[#2563EB] bg-[var(--ui-info-soft)]"
                          : "border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-black text-[var(--ui-brand)]">{plan.name}</p>
                        <p className="mt-1 text-xs text-[var(--ui-muted)]">{plan.description}</p>
                      </div>
                      {plan.highlight && (
                        <span className="rounded-full bg-[var(--ui-brand)] px-2.5 py-1 text-[10px] font-black text-white">
                          推荐
                        </span>
                      )}
                      {isCurrentPlan && (
                        <span className="rounded-full bg-[var(--ui-info)] px-2.5 py-1 text-[10px] font-black text-white">
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
                          <span className="text-sm font-normal text-[var(--ui-muted)]"> / 永久</span>
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
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                          <span className="text-[var(--ui-ink)]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex flex-col gap-3">
                      {plan.contact_sales && priceDisplay !== "免费" ? (
                        <>
                          <button
                            onClick={() => handleSelectPlan(planCode)}
                            disabled={isCurrentPlan}
                            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
                              plan.highlight
                                ? "bg-[var(--ui-ink)] text-white hover:bg-[var(--ui-brand)]"
                                : "bg-[var(--ui-surface)] text-[var(--ui-ink)] ring-1 ring-[#E8DCCB] hover:bg-[var(--ui-surface-muted)]"
                            } ${isCurrentPlan ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isCurrentPlan ? "当前套餐" : paymentEnabled ? "立即升级" : "即将开放"}
                          </button>
                          <Link
                            href="mailto:business@link168.me"
                            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 text-xs font-black text-[var(--ui-ink)] transition hover:bg-[var(--ui-surface-muted)]"
                          >
                            <Building2 aria-hidden className="size-4" />
                            联系销售定制
                          </Link>
                        </>
                      ) : priceDisplay === "免费" ? (
                        <Link
                          href="/register"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 text-xs font-black text-[var(--ui-ink)] transition hover:bg-[var(--ui-surface-muted)]"
                        >
                          免费开始
                        </Link>
                      ) : isCurrentPlan ? (
                        <button
                          disabled
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--ui-surface)] px-4 text-xs font-black text-[var(--ui-info)] ring-1 ring-[var(--ui-info)]"
                        >
                          当前套餐
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSelectPlan(planCode)}
                            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
                              plan.highlight
                                ? "bg-[var(--ui-ink)] text-white hover:bg-[var(--ui-brand)]"
                                : "bg-[var(--ui-surface)] text-[var(--ui-ink)] ring-1 ring-[#E8DCCB] hover:bg-[var(--ui-surface-muted)]"
                            }`}
                          >
                            {paymentEnabled ? "立即升级" : "即将开放"}
                          </button>
                          {sandboxAvailable && (
                            <button
                              onClick={() => handleSelectSandboxPlan(planCode)}
                              className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full border border-[var(--ui-warning)] bg-[var(--ui-warning-soft)] px-4 text-xs font-black text-[var(--ui-warning)] transition hover:bg-[var(--ui-warning-soft)]"
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
              <div className="mt-8 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 text-center">
                <p className="text-sm font-semibold text-[var(--ui-muted)]">
                  <AlertCircle aria-hidden className="mr-2 inline size-4 text-[var(--ui-accent)]" />
                  正式在线支付功能暂不可用，目前仅支持内部沙箱测试。
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[var(--ui-surface)] px-4 py-16 sm:px-6 lg:px-8">
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
                  a: "AI 额度按月重置，当月未用完不累计到下月。额度耗尽后可购买 AI 接待通用加油包补充。",
                },
                {
                  q: "AI 接待通用加油包是什么？",
                  a: "当月 AI 接待额度用完后，可以 ¥9.9 购买 100 次额外额度，当月有效，按需购买。",
                },
                {
                  q: "退款政策是怎样的？",
                  a: "退款政策以服务条款为准。",
                },
              ].map((faq, idx) => (
                <div key={idx} className="rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-page)] p-5">
                  <p className="font-black text-[var(--ui-ink)]">{faq.q}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 接待加油包 */}
        <section className="border-t border-[var(--ui-line)] bg-[var(--ui-page)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--ui-brand)] text-white">
                <Sparkles aria-hidden className="size-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">AI 接待通用加油包</h2>
                <p className="mt-2 text-base leading-7 text-[var(--ui-muted)]">所有用户可买，所有用户同价。只增加 AI 接待次数，不解锁会员权益。AI 加油包支付正在开通中，当前暂不支持在线购买。</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5">
                    <p className="text-sm font-black text-[var(--ui-brand)]">100 次额度</p>
                    <p className="mt-1 text-sm text-[var(--ui-muted)]">每次完整对话计为 1 次</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5">
                    <p className="text-sm font-black text-[var(--ui-brand)]">90 天有效</p>
                    <p className="mt-1 text-sm text-[var(--ui-muted)]">购买后 90 天内使用</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5">
                    <p className="text-sm font-black text-[var(--ui-brand)]">按需购买</p>
                    <p className="mt-1 text-sm text-[var(--ui-muted)]">不限次数，用完再买</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row">
                  <p className="text-3xl font-black text-[var(--ui-ink)]">¥9.9 <span className="text-base font-normal text-[var(--ui-muted)]">/ 100 次</span></p>
                  <button disabled className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ui-ink)] px-6 text-sm font-black text-white transition opacity-40 cursor-not-allowed">
                    支付开通中
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />

      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[var(--ui-surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[var(--ui-ink)]">
                  开通 {plans?.[selectedPlan]?.name}
                </p>
                <p className="mt-1 text-sm text-[var(--ui-muted)]">
                  按年付费
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[var(--ui-page)] text-[var(--ui-ink)] transition hover:bg-[var(--ui-line)]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--ui-page)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--ui-muted)]">应付金额</span>
                <span className="text-2xl font-black text-[var(--ui-ink)]">
                  {plans?.[selectedPlan]?.price_display?.yearly}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[var(--ui-ink)]">选择支付方式</p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--ui-info)] bg-[var(--ui-info)]/10 py-3 text-sm font-semibold text-[var(--ui-info)]"
                >
                  <CreditCard aria-hidden className="size-4" />
                  支付宝
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[var(--ui-warning-soft)] p-4">
              <p className="text-xs text-[var(--ui-warning)]">
                <AlertCircle aria-hidden className="mr-1 inline size-3" />
                当前为沙箱测试环境，请使用沙箱测试功能体验完整流程。
              </p>
            </div>

            {orderResult?.error && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {orderResult.error}
              </div>
            )}

            {orderResult?.order_no && !orderResult.error && (
              <div className="mt-4 rounded-2xl bg-[var(--ui-brand-soft)] p-4">
                <p className="text-sm font-semibold text-[var(--ui-brand)]">订单已创建</p>
                <p className="mt-1 text-xs text-[var(--ui-ink)]">订单号：{orderResult.order_no}</p>
                {pollingStatus === "polling" && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[var(--ui-brand)]">
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    正在等待支付结果...
                  </p>
                )}
                {pollingStatus === "success" && (
                  <p className="mt-2 text-sm font-black text-[var(--ui-brand)]">
                    支付成功！会员已开通
                  </p>
                )}
                {pollingStatus === "failed" && (
                  <p className="mt-2 text-xs text-[var(--ui-accent)]">
                    支付失败或取消
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 min-h-11 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-semibold text-[var(--ui-ink)] transition hover:bg-[var(--ui-page)]"
              >
                取消
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={orderLoading || pollingStatus === "polling" || pollingStatus === "success"}
                className="flex-1 min-h-11 rounded-full bg-[var(--ui-brand)] text-sm font-black text-white transition hover:bg-[var(--ui-success)] disabled:opacity-50"
              >
                {orderLoading ? "创建订单中..." : pollingStatus === "success" ? "支付成功" : "确认支付"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSandboxModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[var(--ui-surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-[var(--ui-ink)]">
                  沙箱测试支付
                </p>
                <p className="mt-1 text-sm text-[var(--ui-muted)]">
                  套餐：{plans?.[selectedPlan]?.name} | 按年
                </p>
              </div>
              <button
                onClick={() => setShowSandboxModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[var(--ui-page)] text-[var(--ui-ink)] transition hover:bg-[var(--ui-line)]"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--ui-warning-soft)] p-4 border border-[var(--ui-warning-soft)]">
              <div className="flex items-center gap-2 mb-2">
                <Zap aria-hidden className="size-4 text-[var(--ui-warning)]" />
                <span className="text-sm font-semibold text-[var(--ui-warning)]">测试订单</span>
              </div>
              <p className="text-xs text-[var(--ui-warning)]">
                此订单仅用于内部测试，不会产生真实交易。
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--ui-page)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--ui-muted)]">测试金额</span>
                <span className="text-2xl font-black text-[var(--ui-ink)]">
                  {plans?.[selectedPlan]?.price_display?.yearly}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[var(--ui-ink)]">模拟支付结果</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSandboxAction("success")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "success"
                      ? "border-[#10B981] bg-[#ECFDF5] text-[#059669]"
                      : "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-ink)] hover:bg-[var(--ui-page)]"
                  }`}
                >
                  支付成功
                </button>
                <button
                  onClick={() => setSandboxAction("fail")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "fail"
                      ? "border-[#EF4444] bg-red-50 text-red-600"
                      : "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-ink)] hover:bg-[var(--ui-page)]"
                  }`}
                >
                  支付失败
                </button>
                <button
                  onClick={() => setSandboxAction("cancel")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "cancel"
                      ? "border-[var(--ui-warning)] bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]"
                      : "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-ink)] hover:bg-[var(--ui-page)]"
                  }`}
                >
                  用户取消
                </button>
                <button
                  onClick={() => setSandboxAction("timeout")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${
                    sandboxAction === "timeout"
                      ? "border-[#6B7280] bg-gray-50 text-gray-600"
                      : "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-ink)] hover:bg-[var(--ui-page)]"
                  }`}
                >
                  超时
                </button>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-[var(--ui-ink)]">回调延迟（秒）</p>
              <div className="flex gap-2">
                {[0, 3, 5, 10].map((delay) => (
                  <button
                    key={delay}
                    onClick={() => setSandboxDelay(delay)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                      sandboxDelay === delay
                        ? "border-[#6F8F4E] bg-[var(--ui-brand)] text-white"
                        : "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-ink)] hover:bg-[var(--ui-page)]"
                    }`}
                  >
                    {delay === 0 ? "立即" : `${delay}秒`}
                  </button>
                ))}
              </div>
            </div>

            {sandboxResult && (
              <div className={`mt-4 rounded-2xl p-4 ${sandboxResult.success ? "bg-[var(--ui-brand-soft)]" : "bg-red-50"}`}>
                <p className={`text-sm font-semibold ${sandboxResult.success ? "text-[var(--ui-brand)]" : "text-red-600"}`}>
                  {sandboxResult.success ? "" : ""} {sandboxResult.message}
                </p>
                {sandboxResult.order_no && (
                  <p className="mt-1 text-xs text-[var(--ui-ink)]">订单号：{sandboxResult.order_no}</p>
                )}
                {pollingStatus === "polling" && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[var(--ui-brand)]">
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    正在等待回调...
                  </p>
                )}
                {pollingStatus === "success" && (
                  <p className="mt-2 text-sm font-black text-[var(--ui-brand)]">
                    支付成功！会员已开通
                  </p>
                )}
                {pollingStatus === "failed" && (
                  <p className="mt-2 text-xs text-[var(--ui-accent)]">
                    支付失败或取消
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSandboxModal(false)}
                className="flex-1 min-h-11 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-semibold text-[var(--ui-ink)] transition hover:bg-[var(--ui-page)]"
              >
                取消
              </button>
              <button
                onClick={handleCreateSandboxOrder}
                disabled={orderLoading || pollingStatus === "polling" || pollingStatus === "success"}
                className="flex-1 min-h-11 rounded-full bg-[var(--ui-warning)] text-sm font-black text-white transition hover:bg-[var(--ui-warning)] disabled:opacity-50"
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
