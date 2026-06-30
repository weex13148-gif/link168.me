"use client";

import { useCallback, useEffect, useState } from "react";

type UsageSummary = { totalCalls: number; uniqueUsers: number };

type UsageRow = {
  assistant: string;
  totalCalls: number;
  totalUsers: number;
};

type UserRow = {
  userId: string;
  email: string;
  totalCalls: number;
};

type DateRow = {
  usageDate: string;
  totalCalls: number;
  totalUsers: number;
};

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type UsageData = {
  days?: number;
  summary?: UsageSummary;
  byAssistant?: UsageRow[];
  byUser?: UserRow[];
  byDate?: DateRow[];
};

export default function AdminAiUsageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [data, setData] = useState<UsageData | null>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/jeepwork/ai-usage?days=${days}`, { cache: "no-store" });
      const result = (await response.json()) as AdminEnvelope<UsageData>;
      if (!response.ok || result.success !== true || !result.data) {
        setError(result.error?.message || "加载失败。");
        setLoading(false);
        return;
      }
      setData(result.data);
      setLoading(false);
    } catch {
      setError("网络错误，无法加载 AI 用量。");
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8C612E]">Filter</p>
          <h2 className="mt-1 text-lg font-black text-[#2B241E]">统计窗口</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 7)}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm font-bold text-[#2B241E]"
          >
            <option value={7}>最近 7 天</option>
            <option value={14}>最近 14 天</option>
            <option value={30}>最近 30 天</option>
            <option value={90}>最近 90 天</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载 AI 用量…
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">总调用次数</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{data?.summary?.totalCalls ?? 0}</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">独立用户数</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{data?.summary?.uniqueUsers ?? 0}</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">统计窗口</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{days} 天</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按 Agent 统计</h2>
            {(data?.byAssistant ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无 Agent 调用数据。
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {(data?.byAssistant ?? []).map((row) => (
                  <div
                    key={row.assistant}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] px-4 py-3"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#2B241E]">{row.assistant}</p>
                    <p className="text-sm font-black text-[#6F8F4E]">
                      {row.totalCalls} 次 · {row.totalUsers} 用户
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按用户统计（前 30）</h2>
            {(data?.byUser ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无用户调用数据。
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {(data?.byUser ?? []).map((row) => (
                  <div
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] px-4 py-3"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#2B241E]">{row.email}</p>
                    <p className="text-sm font-black text-[#6F8F4E]">{row.totalCalls} 次</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按日期统计</h2>
            {(data?.byDate ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无日期维度数据。
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {(data?.byDate ?? []).map((row) => (
                  <div
                    key={row.usageDate}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] px-4 py-3"
                  >
                    <p className="text-sm font-bold text-[#2B241E]">{row.usageDate}</p>
                    <p className="text-sm font-black text-[#6F8F4E]">
                      {row.totalCalls} 次 · {row.totalUsers} 用户
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
