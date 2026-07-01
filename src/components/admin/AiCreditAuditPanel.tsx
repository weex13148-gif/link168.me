"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Loader2, RefreshCcw, Search } from "lucide-react";

type CreditEntry = {
  id: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  currentBalance: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  email: string;
  createdAt: string;
};

type ApiResult = {
  success?: boolean;
  data?: { entries?: CreditEntry[] };
  error?: { message?: string } | string | null;
};

function errorText(error: ApiResult["error"]) {
  if (typeof error === "string") return error;
  return error?.message || "AI Credits 流水加载失败。";
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    grant: "发放",
    consume: "消费",
    refund: "退回",
    adjustment: "调整",
    expire: "过期",
  };
  return labels[type] || type;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

export default function AiCreditAuditPanel() {
  const [email, setEmail] = useState("");
  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetEmail = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (targetEmail.trim()) params.set("email", targetEmail.trim().toLowerCase());
      const response = await fetch(`/api/jeepwork/ai-credits?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(errorText(result.error));
      setEntries(result.data?.entries || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI Credits 流水加载失败。 ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white">
      <div className="border-b border-[#E8DCCB] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF7ED] text-[#8C612E]"><Coins className="size-5" /></span><div><h2 className="text-xl font-black text-[#2B241E]">AI Credits 发放与消费流水</h2><p className="mt-1 text-sm leading-6 text-[#7A6D5E]">核对付款发放、每次 AI 消费、失败退回和最终余额。每次成功企业 AI 对话消耗 1 Credit。</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="输入用户邮箱；留空查看最近全部流水" className="min-h-11 rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] px-3.5 text-sm outline-none focus:border-[#8C612E]" />
          <button type="button" onClick={() => void load(email)} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8C612E] px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}查询流水</button>
          <button type="button" onClick={() => { setEmail(""); void load(); }} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#6F655A] disabled:opacity-50"><RefreshCcw className="size-4" />最近全部</button>
        </div>
        {error ? <p className="mt-3 rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}
      </div>

      {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="size-6 animate-spin text-[#8C612E]" /></div> : entries.length === 0 ? <p className="p-6 text-sm text-[#8B7B68]">暂无 AI Credits 流水。</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FAF7F2] text-xs text-[#7A6D5E]"><tr><th className="px-4 py-3">用户</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">变动</th><th className="px-4 py-3">变动后余额</th><th className="px-4 py-3">原因/关联</th><th className="px-4 py-3">时间</th></tr></thead>
            <tbody className="divide-y divide-[#EFE6DA]">
              {entries.map((entry) => <tr key={entry.id} className="align-top"><td className="px-4 py-3 text-xs font-bold text-[#2B241E]">{entry.email}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${entry.entryType === "consume" ? "bg-[#FFF1F0] text-[#B42318]" : entry.entryType === "refund" ? "bg-[#EDF3FB] text-[#315D91]" : "bg-[#EEF4E7] text-[#355126]"}`}>{typeLabel(entry.entryType)}</span></td><td className={`px-4 py-3 font-mono font-black ${entry.amount < 0 ? "text-[#B42318]" : "text-[#355126]"}`}>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</td><td className="px-4 py-3 font-mono font-black text-[#2B241E]">{entry.balanceAfter}</td><td className="max-w-sm px-4 py-3"><p className="text-xs font-bold text-[#6F655A]">{entry.reason || "—"}</p><p className="mt-1 break-all font-mono text-[10px] text-[#9A8E81]">{entry.referenceType || "—"}{entry.referenceId ? ` · ${entry.referenceId}` : ""}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs text-[#6F655A]">{formatTime(entry.createdAt)}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
