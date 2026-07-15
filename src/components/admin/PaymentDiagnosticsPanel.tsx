"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";

type Diagnostic = {
  id: string;
  action: string;
  targetId?: string | null;
  success: boolean;
  createdAt: string;
  type?: string;
  orderNo?: string | null;
  tradeNo?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
};

type PaymentOrder = {
  id: string;
  orderNo: string;
  planCode: string;
  planNameSnapshot: string;
  payableAmount: number;
  status: string;
  providerTradeNo?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

type ApiResult = {
  success?: boolean;
  data?: Record<string, unknown> & {
    diagnostics?: Diagnostic[];
    orders?: PaymentOrder[];
    payment?: { payUrl?: string };
    order?: { orderNo?: string };
  };
  error?: { message?: string } | string | null;
};

function errorText(error: ApiResult["error"]) {
  if (typeof error === "string") return error;
  return error?.message || "操作失败，请稍后重试。";
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待支付",
    processing: "支付处理中",
    paid: "已支付",
    expired: "已过期",
    cancelled: "已取消",
    failed: "失败",
    refunded: "已退款",
  };
  return labels[status] || status;
}

export default function PaymentDiagnosticsPanel() {
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/jeepwork/settings/payment", { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success || !result.data) throw new Error(errorText(result.error));
      setDiagnostics(result.data.diagnostics || []);
      setOrders(result.data.orders || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "支付诊断数据加载失败。 ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function action(name: string, extra?: Record<string, unknown>) {
    setBusyAction(name);
    setMessage("");
    setError("");
    setLastResult(null);
    try {
      const response = await fetch("/api/jeepwork/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, ...extra }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(errorText(result.error));
      setLastResult(result.data || null);
      if (name === "test-keys") setMessage("本地密钥格式与 RSA2 签名校验通过；这不代表支付宝真实服务已通过。 ");
      else if (name === "create-test-order") {
        const payUrl = result.data?.payment?.payUrl;
        const createdOrderNo = result.data?.order?.orderNo;
        if (createdOrderNo) setOrderNo(createdOrderNo);
        setMessage("0.01 元内部测试订单已创建。 ");
        if (payUrl) window.open(payUrl, "_blank", "noopener,noreferrer");
      } else if (name === "query-order") setMessage("支付宝订单状态查询完成。 ");
      else if (name === "reconcile-order") setMessage("查单和补单处理完成。 ");
      else if (name === "reconcile-pending") setMessage("批量漏单检查完成。 ");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "支付操作失败。 ");
    } finally {
      setBusyAction("");
    }
  }

  if (loading) {
    return <section className="grid min-h-48 place-items-center rounded-[24px] border border-[#E8DCCB] bg-white"><Loader2 className="size-7 animate-spin text-[#1677FF]" /></section>;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-[#D9E4F4] bg-[#F7FAFF] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#1677FF]"><ShieldCheck className="size-5" /></span>
          <div>
            <h2 className="text-xl font-black text-[#2B241E]">支付宝测试与漏单补偿</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F655A]">本地校验密钥格式；只有真实主动查单并通过支付宝响应验签，才会记录真实服务通过。</p>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => void action("test-keys")} disabled={Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BED2EE] bg-white px-4 text-sm font-black text-[#1677FF] disabled:opacity-50">
            {busyAction === "test-keys" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}测试密钥
          </button>
          <button type="button" onClick={() => void action("create-test-order")} disabled={Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 text-sm font-black text-white disabled:opacity-50">
            {busyAction === "create-test-order" ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}创建 0.01 元订单
          </button>
          <button type="button" onClick={() => void action("reconcile-pending", { limit: 30 })} disabled={Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F0C88D] bg-[#FFF9F0] px-4 text-sm font-black text-[#8C612E] disabled:opacity-50">
            {busyAction === "reconcile-pending" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}批量检查漏单
          </button>
          <button type="button" onClick={() => void load()} disabled={Boolean(busyAction)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#6F655A] disabled:opacity-50">
            <Activity className="size-4" />刷新诊断
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#2B241E]">订单号</span>
            <input value={orderNo} onChange={(event) => setOrderNo(event.target.value.trim())} placeholder="输入 Link168 订单号" className="min-h-11 rounded-xl border border-[#D9E4F4] bg-white px-3.5 text-sm outline-none focus:border-[#1677FF]" />
          </label>
          <button type="button" onClick={() => void action("query-order", { orderNo })} disabled={Boolean(busyAction) || !orderNo} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BED2EE] bg-white px-5 text-sm font-black text-[#1677FF] disabled:opacity-50">
            {busyAction === "query-order" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}只查状态
          </button>
          <button type="button" onClick={() => void action("reconcile-order", { orderNo })} disabled={Boolean(busyAction) || !orderNo} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2B241E] px-5 text-sm font-black text-white disabled:opacity-50">
            {busyAction === "reconcile-order" ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}查单并补单
          </button>
        </div>

        {lastResult ? (
          <details className="mt-4 rounded-xl border border-[#D9E4F4] bg-white p-4">
            <summary className="cursor-pointer text-sm font-black text-[#2B241E]">查看本次操作结果</summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-[#6F655A]">{JSON.stringify(lastResult, null, 2)}</pre>
          </details>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E8DCCB] px-5 py-4">
          <div><h2 className="font-black text-[#2B241E]">最近支付宝订单</h2><p className="mt-1 text-xs text-[#8B7B68]">可以复制订单号到上方主动查单。</p></div>
        </div>
        {orders.length === 0 ? <p className="p-6 text-sm text-[#8B7B68]">暂无支付宝订单。</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#FAF7F2] text-xs text-[#7A6D5E]"><tr><th className="px-4 py-3">订单号</th><th className="px-4 py-3">套餐/金额</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">支付宝交易号</th><th className="px-4 py-3">创建时间</th></tr></thead>
              <tbody className="divide-y divide-[#EFE6DA]">
                {orders.map((order) => <tr key={order.id} className="align-top"><td className="px-4 py-3"><button type="button" onClick={() => setOrderNo(order.orderNo)} className="font-mono text-xs font-black text-[#1677FF] hover:underline">{order.orderNo}</button></td><td className="px-4 py-3"><p className="font-bold">{order.planNameSnapshot}</p><p className="mt-1 text-xs text-[#8B7B68]">¥{(order.payableAmount / 100).toFixed(2)}</p></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${order.status === "paid" ? "bg-[#EEF4E7] text-[#355126]" : order.status === "processing" ? "bg-[#EDF3FB] text-[#315D91]" : "bg-[#FFF7ED] text-[#8C612E]"}`}>{statusLabel(order.status)}</span></td><td className="px-4 py-3 font-mono text-xs text-[#6F655A]">{order.providerTradeNo || "—"}</td><td className="px-4 py-3 text-xs text-[#6F655A]">{formatTime(order.createdAt)}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white">
        <div className="border-b border-[#E8DCCB] px-5 py-4"><h2 className="font-black text-[#2B241E]">最近回调与查单诊断</h2><p className="mt-1 text-xs text-[#8B7B68]">不保存密钥或完整支付参数，只记录结果、订单号和失败原因。</p></div>
        {diagnostics.length === 0 ? <p className="p-6 text-sm text-[#8B7B68]">暂无诊断记录。</p> : (
          <div className="divide-y divide-[#EFE6DA]">
            {diagnostics.map((item) => <article key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${item.success ? "bg-[#EEF4E7] text-[#355126]" : "bg-[#FFF1F0] text-[#B42318]"}`}>{item.success ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-[#2B241E]">{item.type || item.action}</p>{item.orderNo || item.targetId ? <button type="button" onClick={() => setOrderNo(String(item.orderNo || item.targetId))} className="font-mono text-xs font-bold text-[#1677FF]">{String(item.orderNo || item.targetId)}</button> : null}</div><p className="mt-1 text-xs text-[#8B7B68]">{formatTime(item.createdAt)}{item.tradeNo ? ` · 交易号 ${item.tradeNo}` : ""}</p>{item.error ? <p className="mt-2 text-sm font-bold text-[#B42318]">{item.error}</p> : null}</div></article>)}
          </div>
        )}
      </section>
    </div>
  );
}
