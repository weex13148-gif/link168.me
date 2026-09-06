"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, Link2, Loader2, MessageCircle, TrendingUp, Users } from "lucide-react";

type TopLink = { title: string; clicks: number };

type DailyItem = { date: string; views: number };

type StatsData = {
  visits: number;
  consultations: number;
  leads: number;
  conversions: number;
  totalProfileViews: number;
  totalUniqueVisitors: number;
  totalClicks: number;
  totalLinks: number;
  clicksToday: number;
  clicksLast7Days: number;
  ctr: number;
  byDevice?: Record<string, number>;
  topLinks?: TopLink[];
  daily?: DailyItem[];
  profileDaily?: DailyItem[];
};

export function StatsPanel({ username }: { username: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`请求失败 (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json.stats ?? json.data ?? json);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5">
        <header>
          <p className="ui-eyebrow">主页数据</p>
          <h1 className="mt-1 text-2xl ui-title sm:text-3xl">访问数据概览</h1>
        </header>
        <div role="status" aria-live="polite" aria-label="正在加载访问数据" className="ui-surface grid min-h-48 place-items-center p-5 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-black text-[var(--ui-muted)]">
            <Loader2 aria-hidden className="size-5 animate-spin text-[var(--ui-brand)]" />
            正在加载数据…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-5">
        <header>
          <p className="ui-eyebrow">主页数据</p>
          <h1 className="mt-1 text-2xl ui-title sm:text-3xl">访问数据概览</h1>
        </header>
        <div role="alert" className="ui-surface grid min-h-48 place-items-center p-5 sm:p-6 text-center">
          <p className="text-sm text-[var(--ui-danger)]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ui-button-secondary mt-3"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  const hasData = data && (
    data.visits > 0
    || data.consultations > 0
    || data.leads > 0
    || data.conversions > 0
  );

  const statsCards = [
    { label: "访问量", value: data?.visits ?? 0, icon: Eye, color: "var(--ui-brand)" },
    { label: "咨询量", value: data?.consultations ?? 0, icon: MessageCircle, color: "var(--ui-info)" },
    { label: "线索量", value: data?.leads ?? 0, icon: Users, color: "var(--ui-success)" },
    { label: "成交量", value: data?.conversions ?? 0, icon: TrendingUp, color: "var(--ui-accent)" },
  ];

  const dailyData = data?.daily ?? [];
  const maxDaily = Math.max(1, ...dailyData.map((d) => d.views));
  const topLinks = data?.topLinks ?? [];

  return (
    <div className="grid gap-5">
      <header>
        <p className="ui-eyebrow">主页数据</p>
        <h1 className="mt-1 text-xl ui-title sm:text-2xl">访问数据概览</h1>
        <p className="mt-2 text-xs leading-5 ui-muted sm:text-sm sm:leading-6">
          {username ? `${username} 的公开主页访问统计。` : "你的公开主页访问统计。"}数据每日更新，帮助你了解访客行为。
        </p>
      </header>

      {!hasData ? (
        <section role="status" aria-live="polite" className="ui-surface grid min-h-40 place-items-center p-4 sm:min-h-48 sm:p-6 text-center">
          <div>
            <BarChart3 aria-hidden className="mx-auto size-8 text-[var(--ui-faint)] sm:size-10" />
            <p className="mt-3 text-base font-black text-[var(--ui-ink)] sm:text-lg">暂无访问数据</p>
            <p className="mt-2 text-xs text-[var(--ui-muted)] sm:text-sm">分享你的主页后，访客数据将在这里展示。</p>
          </div>
        </section>
      ) : (
        <>
          {/* 统计卡片 */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="ui-surface flex items-center gap-3 p-4 sm:p-5">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl sm:size-11"
                    style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color }}
                  >
                    <Icon aria-hidden className="size-4 sm:size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xl font-black text-[var(--ui-ink)] sm:text-2xl">{card.value}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ui-muted)] sm:text-xs">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* 7天访问趋势 */}
          {dailyData.length > 0 && (
            <section className="ui-surface p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)] sm:size-10">
                  <TrendingUp aria-hidden className="size-4 sm:size-5" />
                </span>
                <div>
                  <h2 className="text-base font-black sm:text-lg">近7天访问趋势</h2>
                  <p className="mt-0.5 text-[11px] ui-muted sm:text-xs">主页每日访问量变化</p>
                </div>
              </div>
              <div className="mt-4 flex items-end gap-1.5 sm:mt-5 sm:gap-2" style={{ minHeight: 120 }}>
                {dailyData.map((item) => {
                  const pct = Math.max(2, (item.views / maxDaily) * 100);
                  const label = item.date.slice(5);
                  return (
                    <div key={item.date} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[11px] font-black text-[var(--ui-ink)] sm:text-xs">{item.views}</span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${pct}%`,
                          minHeight: 6,
                          background: "var(--ui-brand)",
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-[9px] text-[var(--ui-muted)] sm:text-[10px]">{label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 热门链接排行 */}
          {topLinks.length > 0 && (
            <section className="ui-surface p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-info-soft)] text-[var(--ui-info)] sm:size-10">
                  <Link2 aria-hidden className="size-4 sm:size-5" />
                </span>
                <div>
                  <h2 className="text-base font-black sm:text-lg">热门链接排行</h2>
                  <p className="mt-0.5 text-[11px] ui-muted sm:text-xs">点击次数最多的链接</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:mt-5">
                {topLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white px-3 sm:min-h-12 sm:px-4"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black sm:size-7 sm:text-xs ${
                        index < 3
                          ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"
                          : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-xs font-black text-[var(--ui-ink)] sm:text-sm">{link.title}</span>
                    <span className="shrink-0 text-[11px] font-black text-[var(--ui-muted)] sm:text-sm">{link.clicks} 次点击</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
