"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type ByAssistant = { assistant: string; totalCalls: number; totalUsers: number };
type ByUser = { userId: string; email: string; totalCalls: number };
type ByDate = { usageDate: string; totalCalls: number; totalUsers: number };

type AiUsagePayload = {
  success?: boolean;
  error?: string;
  days?: number;
  summary?: { totalCalls: number; uniqueUsers: number };
  byAssistant?: ByAssistant[];
  byUser?: ByUser[];
  byDate?: ByDate[];
};

function formatDate(value: string) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

export default function AdminAiUsagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState({ totalCalls: 0, uniqueUsers: 0 });
  const [byAssistant, setByAssistant] = useState<ByAssistant[]>([]);
  const [byUser, setByUser] = useState<ByUser[]>([]);
  const [byDate, setByDate] = useState<ByDate[]>([]);
  const [maxDaily, setMaxDaily] = useState(0);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/admin/ai-usage?days=${days}`, { cache: "no-store" });
      const result = (await response.json()) as AiUsagePayload;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        setNotAdmin(true);
        setLoading(false);
        return;
      }
      if (!response.ok || !result.success) {
        setError(result.error || "加载 AI 调用统计失败");
        setLoading(false);
        return;
      }

      setSummary(result.summary || { totalCalls: 0, uniqueUsers: 0 });
      setByAssistant(result.byAssistant || []);
      setByUser(result.byUser || []);
      const daily = result.byDate || [];
      setByDate(daily);
      setMaxDaily(daily.reduce((maximum, item) => Math.max(maximum, item.totalCalls), 0));
      setLoading(false);
    } catch {
      setError("网络错误，无法加载 AI 调用统计");
      setLoading(false);
    }
  }, [days, router]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  if (notAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="header" />
        </header>
        <div className="mt-8 rounded-[28px] border border-[#F2C078] bg-[#FFF7E8] p-6 shadow-sm">
          <h1 className="text-2xl font-black text-[#8C612E]">超级管理员权限不足</h1>
          <p className="mt-3 text-sm leading-6 text-[#8C612E]">只有 role=super_admin 的账号可以访问 AI 使用统计。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <BrandLogo size="header" />
      </header>

      <section className="mt-8 rounded-[32px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-7 shadow-[0_24px_80px_rgba(86,68,46,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6F8F4E]">AI Usage Analytics</p>
        <h1 className="mt-3 text-4xl font-black text-[#2B241E]">AI 使用统计</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">
          按用户、按 AI Agent 类型、按日期汇总 AI 调用量，为内测阶段的配额管理提供参考。真实计费与支付功能将在后续版本上线。
        </p>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <span className="text-sm font-bold text-[#2B241E]">查询窗口：</span>
        {[7, 14, 30].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDays(option)}
            className={`min-h-11 rounded-2xl px-5 text-sm font-bold ${
              days === option ? "bg-[#6F8F4E] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"
            }`}
          >
            最近 {option} 天
          </button>
        ))}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#8C612E]">窗口内总调用次数</p>
          <p className="mt-2 text-4xl font-black text-[#2B241E]">{summary.totalCalls.toLocaleString()}</p>
          <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">数据来自 ai_usage_logs 的每日汇总。</p>
        </div>
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#35512E]">窗口内活跃用户</p>
          <p className="mt-2 text-4xl font-black text-[#2B241E]">{summary.uniqueUsers.toLocaleString()}</p>
          <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">去重 user_id 的数量。</p>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#2B241E] shadow-sm">
          正在加载 AI 使用统计…
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-[#2B241E]">按 AI Agent 类型</h2>
          {byAssistant.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-[#7A6D5E]">暂无 AI 调用记录。</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {byAssistant.map((row) => {
                const maximum = byAssistant.reduce((value, item) => Math.max(value, item.totalCalls), 0);
                const width = maximum ? Math.max(4, (row.totalCalls / maximum) * 100) : 4;
                return (
                  <li key={row.assistant} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-[#2B241E]">{row.assistant}</span>
                      <span className="text-xs font-bold text-[#6B5D4F]">
                        {row.totalCalls} 次 · {row.totalUsers} 用户
                      </span>
                    </div>
                    <div className="h-3 rounded-2xl bg-[#F2EDE3]">
                      <div style={{ width: `${width}%` }} className="h-full rounded-2xl bg-[#6F8F4E]" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-[#2B241E]">按用户 Top 30</h2>
          {byUser.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-[#7A6D5E]">暂无用户 AI 调用记录。</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {byUser.map((row) => {
                const maximum = byUser.reduce((value, item) => Math.max(value, item.totalCalls), 0);
                const width = maximum ? Math.max(4, (row.totalCalls / maximum) * 100) : 4;
                return (
                  <li key={row.userId} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-bold text-[#2B241E]">{row.email}</span>
                      <span className="shrink-0 text-xs font-bold text-[#6B5D4F]">{row.totalCalls} 次</span>
                    </div>
                    <div className="h-3 rounded-2xl bg-[#F2EDE3]">
                      <div style={{ width: `${width}%` }} className="h-full rounded-2xl bg-[#8C612E]" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2B241E]">每日趋势</h2>
        {byDate.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[#7A6D5E]">暂无数据。</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {byDate.map((row) => {
              const width = maxDaily ? Math.max(4, (row.totalCalls / maxDaily) * 100) : 4;
              return (
                <li key={row.usageDate} className="grid gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-[#2B241E]">{formatDate(row.usageDate)}</span>
                    <span className="text-xs font-bold text-[#6B5D4F]">
                      {row.totalCalls} 次 · {row.totalUsers} 用户
                    </span>
                  </div>
                  <div className="h-3 rounded-2xl bg-[#F2EDE3]">
                    <div style={{ width: `${width}%` }} className="h-full rounded-2xl bg-[#6F8F4E]" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
