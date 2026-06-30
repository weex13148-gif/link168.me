"use client";

import { useCallback, useEffect, useState } from "react";

type CostSummary = {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  avgCostPerCall: number;
  avgCostPer1kTokens: number;
};

type ModelCostRow = {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  percent: number;
};

type AssistantCostRow = {
  assistant: string;
  calls: number;
  cost: number;
  percent: number;
};

type DateCostRow = {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
};

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type CostData = {
  summary: CostSummary;
  byModel: ModelCostRow[];
  byAssistant: AssistantCostRow[];
  byDate: DateCostRow[];
};

export default function AiCostDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [data, setData] = useState<CostData | null>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/jeepwork/ai-usage?days=${days}`, { cache: "no-store" });
      const result = (await response.json()) as AdminEnvelope<{
        days: number;
        summary: {
          totalCalls: number;
          totalInputTokens: number;
          totalOutputTokens: number;
          totalTokens: number;
          estimatedCost: number;
        };
        byModel: Array<{
          model: string;
          requestCount: number;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          cost: number;
        }>;
        byAssistant: Array<{
          assistant: string;
          requestCount: number;
          cost: number;
        }>;
        byDate: Array<{
          usageDate: string;
          totalCalls: number;
        }>;
      }>;
      if (!response.ok || result.success !== true || !result.data) {
        setError(result.error?.message || "加载失败。");
        setLoading(false);
        return;
      }

      const d = result.data;
      const totalCost = d.summary.estimatedCost;
      const totalTokens = d.summary.totalTokens;

      // 构建成本数据
      const costData: CostData = {
        summary: {
          totalCost,
          totalCalls: d.summary.totalCalls,
          totalTokens,
          avgCostPerCall: d.summary.totalCalls > 0 ? totalCost / d.summary.totalCalls : 0,
          avgCostPer1kTokens: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0,
        },
        byModel: d.byModel.map((m) => ({
          model: m.model,
          calls: m.requestCount,
          inputTokens: m.promptTokens,
          outputTokens: m.completionTokens,
          totalTokens: m.totalTokens,
          cost: m.cost,
          percent: totalCost > 0 ? (m.cost / totalCost) * 100 : 0,
        })),
        byAssistant: d.byAssistant.map((a) => ({
          assistant: a.assistant,
          calls: a.requestCount,
          cost: a.cost,
          percent: totalCost > 0 ? (a.cost / totalCost) * 100 : 0,
        })),
        byDate: d.byDate.map((row) => ({
          date: row.usageDate,
          cost: 0, // AiUsageLog 不包含成本数据，设为 0
          tokens: 0,
          calls: row.totalCalls,
        })),
      };

      setData(costData);
      setLoading(false);
    } catch {
      setError("网络错误，无法加载 AI 成本。");
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const hasRealData = data && data.summary.totalCost > 0;

  return (
    <div className="grid gap-6">
      {/* 过滤器 */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8C612E]">Filter</p>
          <h2 className="mt-1 text-lg font-black text-[#2B241E]">成本统计窗口</h2>
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
            AI 成本数据将在用户使用后显示在此处。
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载 AI 成本…
        </div>
      ) : null}

      {!loading && !error && hasRealData ? (
        <>
          {/* 成本概览 */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">总估算成本</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                ¥{data?.summary.totalCost.toFixed(4) ?? "0.0000"}
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">总调用次数</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{data?.summary.totalCalls ?? 0}</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">单次调用成本</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                ¥{data?.summary.avgCostPerCall.toFixed(6) ?? "0.000000"}
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-[#7A6D5E]">每千 Token 成本</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                ¥{data?.summary.avgCostPer1kTokens.toFixed(4) ?? "0.0000"}
              </p>
            </div>
          </section>

          {/* 按模型成本分布 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按模型成本分布</h2>
            {(data?.byModel ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无模型成本数据。
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EEE4D6] text-sm font-bold text-[#7A6D5E]">
                      <th className="pb-3">模型</th>
                      <th className="pb-3 text-right">调用次数</th>
                      <th className="pb-3 text-right">输入 Token</th>
                      <th className="pb-3 text-right">输出 Token</th>
                      <th className="pb-3 text-right">估算成本</th>
                      <th className="pb-3 text-right">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.byModel ?? []).map((row) => (
                      <tr key={row.model} className="border-b border-dashed border-[#EEE4D6]">
                        <td className="py-3 text-sm font-bold text-[#2B241E]">{row.model}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.calls}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.inputTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.outputTokens.toLocaleString()}</td>
                        <td className="py-3 text-right text-sm font-black text-[#8C612E]">¥{row.cost.toFixed(4)}</td>
                        <td className="py-3 text-right text-sm text-[#7A6D5E]">{row.percent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 按 Agent 成本分布 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按 Agent 成本分布</h2>
            {(data?.byAssistant ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无 Agent 成本数据。
              </div>
            ) : (
              <div className="mt-4">
                <div className="space-y-3">
                  {(data?.byAssistant ?? []).map((row) => (
                    <div key={row.assistant} className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2B241E]">{row.assistant}</p>
                      </div>
                      <div className="w-32">
                        <div className="h-4 overflow-hidden rounded-full bg-[#EEE4D6]">
                          <div
                            className="h-full rounded-full bg-[#8C612E] transition-all"
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-sm font-black text-[#8C612E]">¥{row.cost.toFixed(4)}</span>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-xs text-[#7A6D5E]">{row.percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 按日期成本趋势 */}
          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2B241E]">按日期调用趋势</h2>
            <p className="mt-1 text-xs text-[#A69D8E]">（成本数据需配合详细用量记录使用）</p>
            {(data?.byDate ?? []).length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-6 text-center text-sm font-bold text-[#7A6D5E]">
                暂无日期数据。
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-end justify-between gap-1">
                  {data?.byDate.map((row) => {
                    const maxCalls = Math.max(...(data?.byDate.map((d) => d.calls) ?? [1]));
                    const height = maxCalls > 0 ? Math.max(10, (row.calls / maxCalls) * 120) : 10;
                    return (
                      <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full max-w-[40px] rounded-t-lg bg-[#8C612E] transition-all hover:bg-[#7A5530]"
                          style={{ height: `${height}px` }}
                          title={`${row.calls} 次`}
                        />
                        <span className="text-xs text-[#7A6D5E]">{row.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
