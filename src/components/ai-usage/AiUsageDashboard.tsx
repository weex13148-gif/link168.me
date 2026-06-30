"use client";

import { useCallback, useEffect, useState } from "react";

type UsageSummary = {
  totalCalls: number;
  uniqueUsers: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  estimatedCost: number;
};

type UsageRow = {
  assistant: string;
  model: string | null;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  cost: number;
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

type ErrorClassification = {
  "401": number;
  "404": number;
  "429": number;
  "5xx": number;
  "other": number;
};

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type UsageData = {
  days: number;
  summary: UsageSummary;
  byAssistant: UsageRow[];
  byModel: UsageRow[];
  byUser: UserRow[];
  byDate: DateRow[];
  successCalls: number;
  errorCalls: number;
  blockedCalls: number;
  errorClassification: ErrorClassification;
  byBlockReason: Record<string, number>;
};

export default function AiUsageDashboard() {
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

  const hasRealData = data && (
    (data.summary.totalCalls > 0) ||
    (data.summary.totalInputTokens > 0) ||
    (data.summary.totalOutputTokens > 0)
  );

  return (
    <div className="grid gap-6">
      {/* 过滤器 */}
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

      {/* 无真实数据提示 */}
      {!loading && !hasRealData ? (
        <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-10 text-center">
          <p className="text-lg font-black text-[#7A6D5E]">暂无真实调用数据</p>
          <p className="mt-2 text-sm text-[#A69D8E]">
            AI 调用记录将在用户使用后显示在此处。
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载 AI 用量…
        </div>
      ) : null}

      {!loading && !error && hasRealData ? (
        <>
          {/* 核心指标卡片 */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">总调用次数</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{data?.summary.totalCalls ?? 0}</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">成功/失败/拦截</p>
              <p className="mt-2 text-xl font-black text-[#2B241E]">
                <span className="text-[#6F8F4E]">{data?.successCalls ?? 0}</span>
                {" / "}
                <span className="text-[#B42318]">{data?.errorCalls ?? 0}</span>
                {" / "}
                <span className="text-[#8C612E]">{data?.blockedCalls ?? 0}</span>
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">Token 总数</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                {data?.summary.totalTokens.toLocaleString() ?? 0}
              </p>
              <p className="mt-1 text-xs text-[#A69D8E]">
                输入 {((data?.summary.totalInputTokens ?? 0) / 1000).toFixed(1)}k / 输出 {((data?.summary.totalOutputTokens ?? 0) / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">估算成本</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                ¥{data?.summary.estimatedCost.toFixed(4) ?? "0.0000"}
              </p>
              <p className="mt-1 text-xs text-[#A69D8E]">平均 {data?.summary.avgLatencyMs ?? 0}ms</p>
            </div>
          </section>

          {/* 错误分类 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">错误分类</h2>
            <div className="mt-4 grid grid-cols-5 gap-3">
              <div className="rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] p-4 text-center">
                <p className="text-2xl font-black text-[#B42318]">{data?.errorClassification["401"] ?? 0}</p>
                <p className="mt-1 text-xs font-bold text-[#7A6D5E]">401</p>
              </div>
              <div className="rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] p-4 text-center">
                <p className="text-2xl font-black text-[#B42318]">{data?.errorClassification["404"] ?? 0}</p>
                <p className="mt-1 text-xs font-bold text-[#7A6D5E]">404</p>
              </div>
              <div className="rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] p-4 text-center">
                <p className="text-2xl font-black text-[#B42318]">{data?.errorClassification["429"] ?? 0}</p>
                <p className="mt-1 text-xs font-bold text-[#7A6D5E]">429</p>
              </div>
              <div className="rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] p-4 text-center">
                <p className="text-2xl font-black text-[#B42318]">{data?.errorClassification["5xx"] ?? 0}</p>
                <p className="mt-1 text-xs font-bold text-[#7A6D5E]">5xx</p>
              </div>
              <div className="rounded-2xl border border-[#EEE4D6] bg-[#FFFDF8] p-4 text-center">
                <p className="text-2xl font-black text-[#B42318]">{data?.errorClassification["other"] ?? 0}</p>
                <p className="mt-1 text-xs font-bold text-[#7A6D5E]">其他</p>
              </div>
            </div>

            {/* 拦截原因 */}
            {data?.byBlockReason && Object.keys(data.byBlockReason).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-[#7A6D5E]">拦截分类</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(data.byBlockReason).map(([reason, count]) => (
                    <span key={reason} className="rounded-full bg-[#8C612E] px-3 py-1 text-xs font-bold text-white">
                      {reason}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 按 Agent 统计 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按 Agent 统计</h2>
            {(data?.byAssistant ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无 Agent 调用数据。
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EEE4D6] text-sm font-bold text-[#7A6D5E]">
                      <th className="pb-3">Agent</th>
                      <th className="pb-3 text-right">调用次数</th>
                      <th className="pb-3 text-right">输入 Token</th>
                      <th className="pb-3 text-right">输出 Token</th>
                      <th className="pb-3 text-right">总 Token</th>
                      <th className="pb-3 text-right">估算成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.byAssistant ?? []).map((row) => (
                      <tr key={row.assistant} className="border-b border-dashed border-[#EEE4D6]">
                        <td className="py-3 text-sm font-bold text-[#2B241E]">{row.assistant}</td>
                        <td className="py-3 text-right text-sm font-black text-[#6F8F4E]">{row.requestCount}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.promptTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.completionTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.totalTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm font-black text-[#8C612E]">¥{row.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 按模型统计 */}
          {(data?.byModel ?? []).length > 0 && (
            <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#2B241E]">按模型统计</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EEE4D6] text-sm font-bold text-[#7A6D5E]">
                      <th className="pb-3">模型</th>
                      <th className="pb-3 text-right">调用次数</th>
                      <th className="pb-3 text-right">输入 Token</th>
                      <th className="pb-3 text-right">输出 Token</th>
                      <th className="pb-3 text-right">平均耗时</th>
                      <th className="pb-3 text-right">估算成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.byModel ?? []).map((row) => (
                      <tr key={row.model} className="border-b border-dashed border-[#EEE4D6]">
                        <td className="py-3 text-sm font-bold text-[#2B241E]">{row.model}</td>
                        <td className="py-3 text-right text-sm font-black text-[#6F8F4E]">{row.requestCount}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.promptTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.completionTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.avgLatencyMs}ms</td>
                        <td className="py-3 text-right text-sm font-black text-[#8C612E]">¥{row.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 按日期趋势 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按日期趋势</h2>
            {(data?.byDate ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无日期维度数据。
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-end justify-between gap-1">
                  {data?.byDate.map((row) => {
                    const maxCalls = Math.max(...(data?.byDate.map((d) => d.totalCalls) ?? [1]));
                    const height = maxCalls > 0 ? Math.max(10, (row.totalCalls / maxCalls) * 120) : 10;
                    return (
                      <div key={row.usageDate} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full max-w-[40px] rounded-t-lg bg-[#6F8F4E] transition-all hover:bg-[#5A7A3F]"
                          style={{ height: `${height}px` }}
                          title={`${row.totalCalls} 次`}
                        />
                        <span className="text-xs text-[#7A6D5E]">{row.usageDate.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 按用户统计 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按用户统计（前 50）</h2>
            {(data?.byUser ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无用户调用数据。
              </div>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        </>
      ) : null}
    </div>
  );
}
