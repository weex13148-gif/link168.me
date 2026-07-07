"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  ExternalLink,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
  AlertTriangle,
  CalendarClock,
  Zap,
  ArrowRight,
} from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";

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
  success?: boolean;
  error?: string;
  email_verified: boolean;
  subscription: {
    id: string;
    plan_code: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
  } | null;
  plan: PlanDef;
  ai_usage: { used: number; limit: number; remaining: number; percent: number | null };
  credit_balance: number;
  plan_definitions: Record<string, PlanDef>;
  plan_order: string[];
  payment: {
    enabled: boolean;
    alipay_available: boolean;
    alipay_reason?: string | null;
    wechat_available: false;
    wechat_status: string;
    sandbox_available?: boolean;
  };
};

type OrderItem = {
  id: string;
  orderNo: string;
  planCode: string;
  planName: string;
  billingCycle: string;
  originalAmount: number;
  payableAmount: number;
  currency: string;
  status: string;
  paymentChannel: string | null;
  providerTradeNo: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  closedAt: string | null;
  expiresAt: string | null;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_TEXT: Record<string, string> = {
  pending: "待支付",
  processing: "支付处理中",
  paid: "已支付",
  failed: "支付失败",
  cancelled: "已取消",
  expired: "已过期",
  refunded: "已退款",
  partially_refunded: "部分退款",
  refund_processing: "退款处理中",
  refund_failed: "退款失败",
  closed: "已关闭",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[#FEF3C7] text-[var(--ui-warning)]",
  processing: "bg-[#DBEAFE] text-[#1E40AF]",
  paid: "bg-[#D1FAE5] text-[#065F46]",
  failed: "bg-[#FEE2E2] text-[#991B1B]",
  cancelled: "bg-[#F3F4F6] text-[#374151]",
  expired: "bg-[#F3F4F6] text-[#374151]",
  refunded: "bg-[#E0E7FF] text-[var(--ui-brand)]",
  partially_refunded: "bg-[#C7D2FE] text-[var(--ui-brand)]",
  refund_processing: "bg-[#FEF3C7] text-[var(--ui-warning)]",
  refund_failed: "bg-[#FEE2E2] text-[#991B1B]",
  closed: "bg-[#F3F4F6] text-[#374151]",
};

function formatYuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysRemaining(endDateStr: string | null | undefined): number | null {
  if (!endDateStr) return null;
  const end = new Date(endDateStr).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export default function WorkbenchMembershipPage() {
  const [data, setData] = useState<MembershipData | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [addonBuying, setAddonBuying] = useState(false);
  const [addonNotReady, setAddonNotReady] = useState(false);
  const [addonBuyError, setAddonBuyError] = useState("");

  const loadMembership = useCallback(async () => {
    const response = await fetch("/api/workbench/membership", { cache: "no-store" });
    const result = (await response.json()) as MembershipData;
    if (!response.ok || !result.success) throw new Error(result.error || "会员信息加载失败");
    setData(result);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch("/api/billing/orders", { cache: "no-store" });
      const result = (await response.json()) as {
        success?: boolean;
        orders?: OrderItem[];
      };
      if (response.ok && result.success && result.orders) {
        setOrders(result.orders);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([loadMembership(), loadOrders()]);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMembership, loadOrders]);

  const selectedPlanDef = useMemo(
    () =>
      selectedPlan
        ? data?.plan_definitions[selectedPlan] ?? null
        : null,
    [data, selectedPlan]
  );

  const pollOrder = useCallback(
    (orderId: string) => {
      let attempts = 0;
      const run = async () => {
        attempts += 1;
        try {
          const response = await fetch(`/api/billing/orders/${orderId}`, {
            cache: "no-store",
          });
          const result = (await response.json()) as {
            success?: boolean;
            order?: OrderItem;
          };
          const status = result.order?.status;
          if (response.ok && result.success && status === "paid") {
            setCheckoutMessage("支付成功，会员权益已经开通。");
            setActiveOrderId(null);
            await Promise.all([loadMembership(), loadOrders()]);
            setCheckoutOpen(false);
            return;
          }
          if (
            status &&
            ["failed", "cancelled", "expired", "closed"].includes(status)
          ) {
            setCheckoutError(`订单状态：${STATUS_TEXT[status] || status}`);
            setActiveOrderId(null);
            await loadOrders();
            return;
          }
        } catch {
          // 网络抖动时继续轮询。
        }
        if (attempts < 90) window.setTimeout(run, 2000);
        else {
          setCheckoutMessage(
            "尚未收到支付结果，可在订单记录中刷新查看。"
          );
          setActiveOrderId(null);
        }
      };
      window.setTimeout(run, 1500);
    },
    [loadMembership, loadOrders]
  );

  function openCheckout(planCode: string) {
    setSelectedPlan(planCode);
    setCheckoutError("");
    setCheckoutMessage("");
    setActiveOrderId(null);
    setCheckoutOpen(true);
  }

  function openOrderDetail(order: OrderItem) {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  }

  function openRefund(order: OrderItem) {
    setSelectedOrder(order);
    setRefundReason("");
    setRefundError("");
    setRefundOpen(true);
  }

  async function handleBuyAddon() {
    setAddonBuying(true);
    setAddonBuyError("");
    try {
      const response = await fetch("/api/billing/addons/ai-reception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      const result = (await response.json()) as {
        success: boolean;
        code?: string;
        message?: string;
      };
      if (!response.ok || !result.success) {
        if (result.code === "ADDON_PAYMENT_NOT_READY") {
          setAddonNotReady(true);
          setAddonBuyError(result.message || "支付开通中");
        } else {
          setAddonBuyError(result.message || "购买失败，请稍后重试。");
        }
        return;
      }
    } catch {
      setAddonBuyError("网络错误，请稍后重试。");
    } finally {
      setAddonBuying(false);
    }
  }

  async function createAlipayOrder() {
    if (!selectedPlan || !data) return;
    if (!data.email_verified) {
      setCheckoutError("请先完成邮箱验证，再购买会员。");
      return;
    }
    if (!data.payment.alipay_available) {
      setCheckoutError(
        data.payment.alipay_reason || "支付宝暂不可用，请稍后再试。"
      );
      return;
    }

    setSubmitting(true);
    setCheckoutError("");
    setCheckoutMessage("");
    try {
      const response = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: selectedPlan,
          billingCycle: "yearly",
          paymentChannel: "alipay",
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        order?: OrderItem;
        payment?: { payUrl?: string; pay_url?: string };
      };
      if (!response.ok || !result.success || !result.order) {
        throw new Error(result.error || "创建支付宝订单失败");
      }

      const payUrl = result.payment?.payUrl || result.payment?.pay_url;
      setActiveOrderId(result.order.id);
      setCheckoutMessage(
        "订单已创建，请在支付宝页面完成付款。付款后本页会自动确认结果。"
      );
      await loadOrders();
      if (payUrl) window.open(payUrl, "_blank", "noopener,noreferrer");
      pollOrder(result.order.id);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "创建订单失败"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRefund() {
    if (!selectedOrder) return;
    if (!refundReason.trim()) {
      setRefundError("请填写退款原因");
      return;
    }

    setRefundSubmitting(true);
    setRefundError("");

    try {
      const response = await fetch(
        `/api/billing/orders/${selectedOrder.id}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: refundReason.trim() }),
        }
      );
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "退款申请失败");
      }

      setRefundOpen(false);
      setOrderDetailOpen(false);
      await loadOrders();
      await loadMembership();
    } catch (error) {
      setRefundError(
        error instanceof Error ? error.message : "退款申请失败"
      );
    } finally {
      setRefundSubmitting(false);
    }
  }

  if (loading) {
    return (
      <WorkbenchShell
        eyebrow="Membership"
        title="会员与收费方案"
        subtitle="正在读取会员、支付宝和订单状态。"
      >
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="size-7 animate-spin text-[var(--ui-brand)]" />
        </div>
      </WorkbenchShell>
    );
  }

  if (!data) {
    return (
      <WorkbenchShell
        eyebrow="Membership"
        title="会员与收费方案"
        subtitle="会员信息暂时无法加载。"
      >
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ui-button-primary"
        >
          <RefreshCw className="size-4" />
          重新加载
        </button>
      </WorkbenchShell>
    );
  }

  const currentPlanCode = data.subscription?.plan_code || "free";
  const currentPeriodEnd = data.subscription?.current_period_end || null;
  const daysRemaining = getDaysRemaining(currentPeriodEnd);
  const isFree = currentPlanCode === "free";
  const isGracePeriod =
    !isFree &&
    daysRemaining !== null &&
    daysRemaining <= 3 &&
    daysRemaining > 0;

  return (
    <WorkbenchShell
      eyebrow="Membership & Alipay"
      title="会员与收费方案"
      subtitle="当前在线收款仅支持支付宝。"
    >
      {!data.email_verified ? (
        <section className="mb-5 flex flex-col gap-3 rounded-[22px] border border-[var(--ui-warning-soft)] bg-[var(--ui-warning-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[var(--ui-warning)]">购买前需要完成邮箱验证</p>
            <p className="mt-1 text-sm text-[var(--ui-warning)]">
              验证完成后才能付款、开通 AI 和使用会员权益。
            </p>
          </div>
          <a href="/verify-email" className="ui-button-primary shrink-0">
            去验证邮箱
          </a>
        </section>
      ) : null}

      {isGracePeriod && currentPeriodEnd ? (
        <section className="mb-5 flex flex-col gap-3 rounded-[22px] border border-[var(--ui-warning-soft)] bg-[var(--ui-warning-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-[var(--ui-warning)]"
            />
            <div>
              <p className="font-black text-[var(--ui-warning)]">会员即将到期</p>
              <p className="mt-1 text-sm text-[var(--ui-warning)]">
                您的会员将于 {new Date(currentPeriodEnd).toLocaleDateString("zh-CN")} 到期，
                还有 {daysRemaining} 天宽限期，请及时续费以免影响使用。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCheckout(currentPlanCode)}
            className="ui-button-primary shrink-0"
          >
            <Zap className="size-4" />
            立即续费
          </button>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="ui-surface p-5">
          <div className="flex items-center gap-2 text-[var(--ui-brand)]">
            <Crown className="size-5" />
            <span className="text-sm font-black">当前套餐</span>
          </div>
          <p className="mt-3 text-2xl font-black">{data.plan.name}</p>
          <p className="mt-1 text-sm ui-muted">
            {currentPeriodEnd
              ? `有效期至 ${new Date(currentPeriodEnd).toLocaleDateString("zh-CN")}`
              : "当前为免费版"}
          </p>
          {!isFree && daysRemaining !== null && daysRemaining > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--ui-brand)]">
              <CalendarClock className="size-3.5" />
              剩余 {daysRemaining} 天
            </p>
          )}
        </article>
        <article className="ui-surface p-5">
          <div className="flex items-center gap-2 text-[var(--ui-brand)]">
            <Sparkles className="size-5" />
            <span className="text-sm font-black">AI 额度</span>
          </div>
          <p className="mt-3 text-2xl font-black">
            {data.credit_balance.toLocaleString("zh-CN")}
          </p>
          <p className="mt-1 text-sm ui-muted">当前可用 Credits</p>
          {data.ai_usage.percent !== null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-muted">本月已用</span>
                <span className="font-bold">
                  {data.ai_usage.used.toLocaleString("zh-CN")} /{" "}
                  {data.ai_usage.limit.toLocaleString("zh-CN")}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--ui-page)]">
                <div
                  className="h-full rounded-full bg-[var(--ui-success)] transition-all"
                  style={{ width: `${data.ai_usage.percent}%` }}
                />
              </div>
            </div>
          )}
        </article>
        <article className="ui-surface p-5">
          <div className="flex items-center gap-2 text-[var(--ui-info)]">
            <ShieldCheck className="size-5" />
            <span className="text-sm font-black">在线支付</span>
          </div>
          <p className="mt-3 text-xl font-black">支付宝</p>
          <p className="mt-1 text-sm ui-muted">
            {data.payment.alipay_available
              ? "支付通道已开放"
              : data.payment.alipay_reason || "支付通道暂不可用"}
          </p>
        </article>
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ui-eyebrow">年费方案</p>
            <h2 className="mt-1 text-2xl font-black">按经营阶段升级</h2>
          </div>
          <p className="text-sm ui-muted">当前仅开放年付，所有金额均为人民币。</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.plan_order.map((code) => {
            const plan = data.plan_definitions[code];
            if (!plan) return null;
            const current = currentPlanCode === code;
            const free = code === "free";
            const isUpgrade = !free && currentPlanCode !== "free";
            return (
              <article
                key={code}
                className={`flex min-h-[420px] flex-col rounded-[24px] border p-5 ${
                  plan.highlight
                    ? "border-[#6F8F4E] bg-[var(--ui-success-soft)] shadow-lg"
                    : "border-[var(--ui-line)] bg-[var(--ui-surface-strong)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 ui-muted">
                      {plan.description}
                    </p>
                  </div>
                  {plan.highlight ? (
                    <span className="rounded-full bg-[var(--ui-success)] px-2.5 py-1 text-[11px] font-black text-white">
                      推荐
                    </span>
                  ) : null}
                  {current ? (
                    <span className="rounded-full bg-[var(--ui-info)] px-2.5 py-1 text-[11px] font-black text-white">
                      当前
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 text-3xl font-black text-[var(--ui-ink)]">
                  {plan.price_display.yearly}
                  <span className="ml-1 text-sm font-bold ui-muted">/年</span>
                </p>
                <ul className="mt-5 grid gap-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  {free ? (
                    <button
                      type="button"
                      disabled
                      className="ui-button-secondary w-full"
                    >
                      免费长期使用
                    </button>
                  ) : plan.contact_sales ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openCheckout(code)}
                        disabled={
                          !data.email_verified || !data.payment.alipay_available
                        }
                        className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {current
                          ? "支付宝续费"
                          : isUpgrade
                          ? "支付宝升级"
                          : "支付宝开通"}
                      </button>
                      <a
                        href="mailto:business@link168.me"
                        className="ui-button-secondary w-full inline-flex items-center justify-center text-xs"
                      >
                        联系销售定制
                        <ArrowRight className="size-4" />
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCheckout(code)}
                      disabled={
                        !data.email_verified || !data.payment.alipay_available
                      }
                      className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {current
                        ? "支付宝续费"
                        : isUpgrade
                        ? "支付宝升级"
                        : "支付宝开通"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* AI 接待加油包 */}
      <section className="mt-6 rounded-[24px] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--ui-warning)]" />
              <h3 className="text-lg font-black text-[var(--ui-ink)]">AI 接待通用加油包</h3>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--ui-muted)]">所有用户可买，所有用户同价。只增加 AI 接待次数，不解锁会员权益。AI 加油包支付正在开通中，当前暂不支持在线购买。</p>
            <ul className="mt-3 grid gap-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                <span>100 次 AI 接待会话额度</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                <span>所有用户可购买，不限套餐</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                <span>购买后立即生效，90 天内有效</span>
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <p className="text-2xl font-black text-[var(--ui-ink)]">
              ¥9.9 <span className="text-sm font-normal text-[var(--ui-muted)]">/ 100 次</span>
            </p>
            <button
              type="button"
              disabled
              className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-45 text-sm"
            >
              支付开通中
            </button>
          </div>
        </div>
      </section>

      <section className="ui-surface mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="ui-eyebrow">订单记录</p>
            <h2 className="mt-1 text-xl font-black">我的订单</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={ordersLoading}
            className="ui-button-secondary"
          >
            <RefreshCw
              className={`size-4 ${ordersLoading ? "animate-spin" : ""}`}
            />
            刷新
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {ordersLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="size-6 animate-spin text-[var(--ui-brand)]" />
            </div>
          ) : orders.length === 0 ? (
            <p className="rounded-2xl bg-[var(--ui-page)] p-5 text-sm ui-muted">
              暂无订单。选择上方套餐即可开通会员。
            </p>
          ) : (
            orders.map((order) => (
              <article
                key={order.id}
                className="grid gap-3 rounded-2xl border border-[var(--ui-line)] p-4 hover:bg-[var(--ui-page)]/50 transition-colors cursor-pointer sm:grid-cols-[1fr_auto] sm:items-center"
                onClick={() => openOrderDetail(order)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReceiptText className="size-4 text-[var(--ui-brand)]" />
                    <span className="font-black">
                      {order.planName || order.planCode}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        STATUS_COLOR[order.status] ||
                        "bg-[var(--ui-page)] text-[var(--ui-muted)]"
                      }`}
                    >
                      {STATUS_TEXT[order.status] || order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs ui-muted">
                    订单号：{order.orderNo} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-black">
                    {formatYuan(order.payableAmount)}
                  </p>
                  <ArrowRight className="size-4 text-[var(--ui-muted)]" />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {checkoutOpen && selectedPlanDef ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4"
          onClick={() => !submitting && setCheckoutOpen(false)}
          role="presentation"
        >
          <section
            className="w-full max-w-md rounded-[28px] bg-[var(--ui-surface-strong)] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="支付宝开通会员"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-eyebrow">支付宝年付</p>
                <h2 className="mt-1 text-2xl font-black">
                  {selectedPlanDef.name}
                </h2>
                <p className="mt-2 text-sm ui-muted">
                  {selectedPlanDef.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                disabled={submitting}
                className="grid size-10 place-items-center rounded-xl bg-[var(--ui-page)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-[var(--ui-info-soft)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--ui-info)]">
                  应付金额
                </span>
                <span className="text-3xl font-black text-[var(--ui-info)]">
                  {selectedPlanDef.price_display.yearly}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ui-info)]">
                支付成功后立即开通，有效期 365 天
              </p>
            </div>
            {checkoutError ? (
              <p className="mt-4 rounded-2xl bg-[var(--ui-danger-soft)] p-4 text-sm font-bold text-[var(--ui-danger)]">
                <AlertCircle className="mr-1 inline size-4" />
                {checkoutError}
              </p>
            ) : null}
            {checkoutMessage ? (
              <p className="mt-4 rounded-2xl bg-[var(--ui-success-soft)] p-4 text-sm font-bold text-[var(--ui-brand)]">
                {activeOrderId ? (
                  <Clock3 className="mr-1 inline size-4" />
                ) : (
                  <CheckCircle2 className="mr-1 inline size-4" />
                )}
                {checkoutMessage}
              </p>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                disabled={submitting}
                className="ui-button-secondary"
              >
                稍后再说
              </button>
              <button
                type="button"
                onClick={() => void createAlipayOrder()}
                disabled={submitting || Boolean(activeOrderId)}
                className="ui-button-primary disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : activeOrderId ? (
                  <Clock3 className="size-4" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {submitting
                  ? "创建订单中"
                  : activeOrderId
                  ? "等待支付结果"
                  : "前往支付宝"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {orderDetailOpen && selectedOrder ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4"
          onClick={() => setOrderDetailOpen(false)}
          role="presentation"
        >
          <section
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[var(--ui-surface-strong)] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="订单详情"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-eyebrow">订单详情</p>
                <h2 className="mt-1 text-xl font-black">
                  {selectedOrder.planName || selectedOrder.planCode}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOrderDetailOpen(false)}
                className="grid size-10 place-items-center rounded-xl bg-[var(--ui-page)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-page)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm ui-muted">订单金额</span>
                <span className="text-2xl font-black">
                  {formatYuan(selectedOrder.payableAmount)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm ui-muted">订单状态</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    STATUS_COLOR[selectedOrder.status] ||
                    "bg-[var(--ui-surface-strong)] text-[var(--ui-muted)]"
                  }`}
                >
                  {STATUS_TEXT[selectedOrder.status] ||
                    selectedOrder.status}
                </span>
              </div>
              {selectedOrder.refundAmount > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm ui-muted">已退款金额</span>
                  <span className="text-sm font-bold text-[var(--ui-brand)]">
                    {formatYuan(selectedOrder.refundAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="ui-muted">订单号</span>
                <span className="font-mono font-bold">
                  {selectedOrder.orderNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="ui-muted">支付方式</span>
                <span>
                  {selectedOrder.paymentChannel === "alipay"
                    ? "支付宝"
                    : selectedOrder.paymentChannel === "wechat"
                    ? "微信支付"
                    : selectedOrder.paymentChannel || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="ui-muted">创建时间</span>
                <span>{formatDate(selectedOrder.createdAt)}</span>
              </div>
              {selectedOrder.paidAt && (
                <div className="flex justify-between">
                  <span className="ui-muted">支付时间</span>
                  <span>{formatDate(selectedOrder.paidAt)}</span>
                </div>
              )}
              {selectedOrder.expiresAt && (
                <div className="flex justify-between">
                  <span className="ui-muted">过期时间</span>
                  <span>{formatDate(selectedOrder.expiresAt)}</span>
                </div>
              )}
              {selectedOrder.providerTradeNo && (
                <div className="flex justify-between">
                  <span className="ui-muted">交易流水号</span>
                  <span className="font-mono text-xs">
                    {selectedOrder.providerTradeNo}
                  </span>
                </div>
              )}
            </div>

            {(selectedOrder.status === "paid" ||
              selectedOrder.status === "partially_refunded") &&
            selectedOrder.refundAmount < selectedOrder.payableAmount ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => openRefund(selectedOrder)}
                  className="w-full rounded-2xl border border-[var(--ui-danger)] bg-[var(--ui-surface-strong)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)] hover:bg-[var(--ui-danger-soft)] transition-colors"
                >
                  <XCircle className="mr-2 inline size-4" />
                  申请退款
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {refundOpen && selectedOrder ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4"
          onClick={() => !refundSubmitting && setRefundOpen(false)}
          role="presentation"
        >
          <section
            className="w-full max-w-md rounded-[28px] bg-[var(--ui-surface-strong)] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="申请退款"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-eyebrow">退款申请</p>
                <h2 className="mt-1 text-xl font-black">申请退款</h2>
              </div>
              <button
                type="button"
                onClick={() => setRefundOpen(false)}
                disabled={refundSubmitting}
                className="grid size-10 place-items-center rounded-xl bg-[var(--ui-page)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-page)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm ui-muted">可退金额</span>
                <span className="text-xl font-black text-[var(--ui-danger)]">
                  {formatYuan(
                    selectedOrder.payableAmount - selectedOrder.refundAmount
                  )}
                </span>
              </div>
              <p className="mt-2 text-xs ui-muted">
                退款将原路返回到您的支付账户
              </p>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-bold text-[var(--ui-ink)]">
                退款原因
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请简要说明退款原因..."
                rows={4}
                maxLength={500}
                className="mt-2 w-full rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] px-4 py-3 text-sm text-[var(--ui-ink)] placeholder-[var(--ui-muted)] focus:border-[var(--ui-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-danger)]/20 resize-none"
              />
              <p className="mt-1 text-right text-xs ui-muted">
                {refundReason.length}/500
              </p>
            </div>

            {refundError ? (
              <p className="mt-4 rounded-2xl bg-[var(--ui-danger-soft)] p-4 text-sm font-bold text-[var(--ui-danger)]">
                <AlertCircle className="mr-1 inline size-4" />
                {refundError}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRefundOpen(false)}
                disabled={refundSubmitting}
                className="ui-button-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void submitRefund()}
                disabled={refundSubmitting || !refundReason.trim()}
                className="rounded-2xl bg-[var(--ui-danger)] px-4 py-3 text-sm font-black text-white hover:bg-[var(--ui-danger)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundSubmitting ? (
                  <Loader2 className="size-4 animate-spin inline mr-1" />
                ) : null}
                提交退款申请
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </WorkbenchShell>
  );
}
