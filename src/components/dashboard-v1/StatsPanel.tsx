"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, Link2, Loader2, MousePointerClick, TrendingUp, Users } from "lucide-react";

type TopLink = { title: string; clicks: number };

type DailyItem = { date: string; views: number };

type StatsData = {
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
        setData(json.data ?? json);
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
          <p className="ui-eyebrow">数据中心</p>
          <h1 className="mt-1 text-2xl ui-title sm:text-3xl">访问数据概览</h1>
        </header>
        <div className="ui-surface grid min-h-48 place-items-center p-5 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-black text-[var(--ui-muted)]">
            <Loader2 className="size-5 animate-spin text-[var(--ui-brand)]" />
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
          <p className="ui-eyebrow">数据中心</p>
          <h1 className="mt-1 text-2xl ui-title sm:text-3xl">访问数据概览</h1>
        </header>
        <div className="ui-surface grid min-h-48 place-items-center p-5 sm:p-6 text-center">
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

  const hasData = data && (data.totalProfileViews > 0 || data.totalClicks > 0 || data.totalUniqueVisitors > 0);

  const statsCards = [
    { label: "主页访问", value: data?.totalProfileViews ?? 0, icon: Eye, color: "var(--ui-brand)" },
    { label: "独立访客", value: data?.totalUniqueVisitors ?? 0, icon: Users, color: "var(--ui-info)" },
    { label: "链接点击", value: data?.totalClicks ?? 0, icon: MousePointerClick, color: "var(--ui-success)" },
    { label: "点击率", value: data ? `${(data.ctr * 100).toFixed(1)}%` : "0.0%", icon: TrendingUp, color: "var(--ui-accent)" },
    { label: "链接数量", value: data?.totalLinks ?? 0, icon: Link2, color: "var(--ui-brand-hover)" },
    { label: "今日点击", value: data?.clicksToday ?? 0, icon: BarChart3, color: "var(--ui-info)" },
  ];

  const dailyData = data?.daily ?? [];
  const maxDaily = Math.max(1, ...dailyData.map((d) => d.views));
  const topLinks = data?.topLinks ?? [];

  return (
    <div className="grid gap-5">
      <header>
        <p className="ui-eyebrow">数据中心</p>
        <h1 className="mt-1 text-xl ui-title sm:text-2xl">访问数据概览</h1>
        <p className="mt-2 text-xs leading-5 ui-muted sm:text-sm sm:leading-6">
          {username ? `${username} 的公开主页访问统计。` : "你的公开主页访问统计。"}数据每日更新，帮助你了解访客行为。
        </p>
      </header>

      {!hasData ? (
        <section className="ui-surface grid min-h-40 place-items-center p-4 sm:min-h-48 sm:p-6 text-center">
          <div>
            <BarChart3 className="mx-auto size-8 text-[var(--ui-faint)] sm:size-10" />
            <p className="mt-3 text-base font-black text-[var(--ui-ink)] sm:text-lg">暂无访问数据</p>
            <p className="mt-2 text-xs text-[var(--ui-muted)] sm:text-sm">分享你的主页后，访客数据将在这里展示。</p>
          </div>
        </section>
      ) : (
        <>
          {/* 统计卡片 */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="ui-surface flex items-center gap-3 p-4 sm:p-5">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl sm:size-11"
                    style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color }}
                  >
                    <Icon className="size-4 sm:size-5" />
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
                  <TrendingUp className="size-4 sm:size-5" />
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
                  <Link2 className="size-4 sm:size-5" />
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
                    className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] px-3 sm:min-h-12 sm:px-4"
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
