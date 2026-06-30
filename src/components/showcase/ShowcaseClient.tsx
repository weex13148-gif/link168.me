"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ShowcaseV2Bullet = { title: string; description?: string; icon?: string };
type ShowcaseV2Stat = { label: string; value: string; hint?: string };

type PublicSection = {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: ShowcaseV2Bullet[];
  stats: ShowcaseV2Stat[];
  ctaText: string | null;
  ctaUrl: string | null;
  theme: string;
  animation: boolean;
  allowSwipe: boolean;
  dwellSec: number;
};

type PublicPayload = {
  meta: {
    version: string;
    brand: string;
    tagline: string;
    enableAI: boolean;
    allowFreeInput: boolean;
    welcomeByAssistant: Record<string, string>;
    suggestedQuestionsByAssistant: Record<string, string[]>;
  };
  sections: PublicSection[];
};

type AssistantKey = "tax" | "legal" | "market" | "design" | "social";

const ASSISTANT_LABEL: Record<AssistantKey, string> = {
  tax: "财税助理",
  legal: "法务助理",
  market: "市场调研助理",
  design: "设计助理",
  social: "社媒运营助理",
};

const ASSISTANT_ICON: Record<AssistantKey, string> = {
  tax: "¥",
  legal: "§",
  market: "◎",
  design: "✎",
  social: "♺",
};

type ChatMessage = { role: "user" | "assistant"; content: string; latencyMs?: number; error?: string };

function themeClass(theme: string) {
  switch (theme) {
    case "light":
      return "bg-[#F4EFE6] text-[#2B241E]";
    case "gradient":
      return "bg-gradient-to-br from-[#0E1F33] via-[#1B1230] to-[#3D1A4B] text-white";
    default:
      return "bg-[#070A12] text-white";
  }
}

export default function ShowcaseClient() {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState<AssistantKey | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [autoPlayOn, setAutoPlayOn] = useState(false);
  const [autoPlayRemaining, setAutoPlayRemaining] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionStartTimeRef = useRef<number>(Date.now());
  const lastTrackedSectionRef = useRef<string>("");
  const statsQueueRef = useRef<Array<{ sectionKey: string; dwellMs: number; progress: number }>>([]);
  const statsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserInteractingRef = useRef(false);

  // 加载展示内容
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/showcase/content", { cache: "no-store" });
        const json = (await res.json()) as { success?: boolean; data?: PublicPayload; error?: { message?: string } };
        if (cancelled) return;
        if (!res.ok || !json.success || !json.data) {
          setError(json.error?.message || "比赛展示中心不可用");
          return;
        }
        setPayload(json.data);
      } catch (e) {
        if (cancelled) return;
        setError("网络异常，请稍后重试");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 安全发送统计数据（使用 sendBeacon，浏览器关闭时也能发送）
  const sendStatsSafely = (sectionKey: string, dwellMs: number, progress: number) => {
    if (typeof window === "undefined") return;
    const data = JSON.stringify({ sectionKey, dwellMs, progress });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/showcase/track", data);
    } else {
      void fetch("/api/showcase/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: data,
        cache: "no-store",
        keepalive: true,
      }).catch(() => undefined);
    }
  };

  // 批量发送统计数据（去抖）
  const flushStatsQueue = () => {
    if (statsQueueRef.current.length === 0) return;
    const stats = statsQueueRef.current;
    statsQueueRef.current = [];
    for (const s of stats) {
      sendStatsSafely(s.sectionKey, s.dwellMs, s.progress);
    }
  };

  // 离开页面时安全发送所有统计数据
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushStatsQueue();
      // 发送当前章节最终停留时间
      if (lastTrackedSectionRef.current && payload) {
        const dwellMs = Date.now() - sectionStartTimeRef.current;
        sendStatsSafely(lastTrackedSectionRef.current, dwellMs, 1);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        flushStatsQueue();
      }
    };
  }, [payload]);

  // 自动播放计时器
  const clearAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (autoPlayCountdownRef.current) {
      clearInterval(autoPlayCountdownRef.current);
      autoPlayCountdownRef.current = null;
    }
  };

  const startAutoPlay = (sectionIndex: number, dwellSec: number) => {
    if (!payload || dwellSec <= 0) return;
    clearAutoPlay();
    setAutoPlayRemaining(dwellSec);
    autoPlayCountdownRef.current = setInterval(() => {
      setAutoPlayRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    autoPlayTimerRef.current = setTimeout(() => {
      clearAutoPlay();
      setAutoPlayRemaining(0);
      const nextIndex = sectionIndex + 1;
      if (nextIndex < payload.sections.length) {
        setActiveIndex(nextIndex);
      } else if (autoPlayOn) {
        setAutoPlayOn(false);
      }
    }, dwellSec * 1000);
  };

  // 用户主动操作后暂停自动播放
  const pauseAutoPlay = () => {
    if (!isUserInteractingRef.current) {
      isUserInteractingRef.current = true;
      clearAutoPlay();
      setAutoPlayOn(false);
    }
  };

  useEffect(() => {
    if (!payload) return;
    const total = payload.sections.length;
    if (total === 0) return;
    function onWheel(event: WheelEvent) {
      if (!payload) return;
      pauseAutoPlay();
      if (event.deltaY > 50) {
        setActiveIndex((idx) => Math.min(idx + 1, total - 1));
      } else if (event.deltaY < -50) {
        setActiveIndex((idx) => Math.max(idx - 1, 0));
      }
    }
    function onKey(event: KeyboardEvent) {
      if (!payload) return;
      const total = payload.sections.length;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        pauseAutoPlay();
        setActiveIndex((idx) => Math.min(idx + 1, total - 1));
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        pauseAutoPlay();
        setActiveIndex((idx) => Math.max(idx - 1, 0));
      } else if (event.key === "Home") {
        pauseAutoPlay();
        setActiveIndex(0);
      } else if (event.key === "End") {
        pauseAutoPlay();
        setActiveIndex(total - 1);
      }
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [payload]);

  // 章节切换时记录停留时间（去抖 + 批量发送）
  useEffect(() => {
    if (!payload) return;
    const section = payload.sections[activeIndex];
    if (!section) return;

    // 先发送上一个章节的最终停留时间
    const prevSection = lastTrackedSectionRef.current;
    if (prevSection && prevSection !== section.key) {
      const dwellMs = Date.now() - sectionStartTimeRef.current;
      const progress = payload.sections.findIndex((s) => s.key === prevSection) + 1;
      // 发送到队列，不直接发送
      statsQueueRef.current.push({
        sectionKey: prevSection,
        dwellMs,
        progress: progress / payload.sections.length,
      });
      // 去抖批量发送
      if (statsDebounceRef.current) clearTimeout(statsDebounceRef.current);
      statsDebounceRef.current = setTimeout(flushStatsQueue, 2000);
    }

    // 重置当前章节计时
    sectionStartTimeRef.current = Date.now();
    lastTrackedSectionRef.current = section.key;

    // 自动播放
    if (autoPlayOn && section.dwellSec && section.dwellSec > 0) {
      startAutoPlay(activeIndex, section.dwellSec);
    }

    return () => {
      if (statsDebounceRef.current) {
        clearTimeout(statsDebounceRef.current);
        flushStatsQueue();
      }
      clearAutoPlay();
    };
  }, [activeIndex, payload, autoPlayOn]);

  const activeSection = useMemo(() => (payload ? payload.sections[activeIndex] : null), [payload, activeIndex]);

  function gotoNext() {
    if (!payload) return;
    pauseAutoPlay();
    setActiveIndex((idx) => Math.min(idx + 1, payload.sections.length - 1));
  }
  function gotoPrev() {
    pauseAutoPlay();
    setActiveIndex((idx) => Math.max(idx - 1, 0));
  }
  function toggleFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      void document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  function openAssistant(assistant: AssistantKey) {
    if (!payload?.meta.enableAI) return;
    setActiveAssistant(assistant);
    setAiOpen(true);
    const welcome = payload.meta.welcomeByAssistant[assistant];
    setChat([
      {
        role: "assistant",
        content: welcome || "你好，我是 Link168 比赛 AI 助理，请选择推荐问题或直接输入。",
      },
    ]);
  }

  async function sendQuestion(question: string) {
    if (!payload?.meta.enableAI || !activeAssistant) return;
    const trimmed = question.trim();
    if (!trimmed) return;
    setSending(true);
    setInput("");
    setChat((c) => [...c, { role: "user", content: trimmed }]);
    try {
      const res = await fetch("/api/showcase/ai-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assistant: activeAssistant,
          question: trimmed,
          sourcePage: window.location.pathname,
        }),
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { response: string; latencyMs: number; modelName?: string };
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        setChat((c) => [
          ...c,
          {
            role: "assistant",
            content: "",
            error: json.error?.message || "AI 调用失败",
            latencyMs: undefined,
          },
        ]);
        return;
      }
      setChat((c) => [
        ...c,
        { role: "assistant", content: json.data?.response || "", latencyMs: json.data?.latencyMs },
      ]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: "", error: "网络异常，请稍后再试" }]);
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A1020] px-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/15 bg-white/5 p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9DBADD]">Link168 Showcase</p>
          <h1 className="mt-3 text-2xl font-black">展示内容暂不可用</h1>
          <p className="mt-3 text-sm text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload || !activeSection) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A1020] text-white">
        <p className="text-sm font-bold tracking-widest text-white/60">正在加载路演内容…</p>
      </div>
    );
  }

  const total = payload.sections.length;
  const progressPct = ((activeIndex + 1) / total) * 100;
  const assistantSuggestions: Record<AssistantKey, string[]> = {
    tax: payload.meta.suggestedQuestionsByAssistant.tax || [],
    legal: payload.meta.suggestedQuestionsByAssistant.legal || [],
    market: payload.meta.suggestedQuestionsByAssistant.market || [],
    design: payload.meta.suggestedQuestionsByAssistant.design || [],
    social: payload.meta.suggestedQuestionsByAssistant.social || [],
  };

  return (
    <div ref={containerRef} className={`relative min-h-dvh overflow-hidden ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* 顶栏 */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-3 text-white lg:px-6 lg:py-4">
        <div className="pointer-events-auto flex items-center gap-2 lg:gap-3">
          <span className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] lg:px-3 lg:py-1 lg:text-[10px]">{payload.meta.brand}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/80 lg:px-3 lg:py-1 lg:text-[10px]">{payload.meta.version}</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-1 lg:gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] lg:px-3 lg:py-1 lg:text-[10px]"
          >
            {soundOn ? "Sound On" : "Sound Off"}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] lg:px-3 lg:py-1 lg:text-[10px]"
          >
            {fullscreen ? "退出全屏" : "全屏演示"}
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="fixed left-0 right-0 top-10 z-30 h-[2px] bg-white/10 lg:top-14">
        <div className="h-full bg-gradient-to-r from-[#5DA9FF] to-[#C57BFF] transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* 章节 */}
      <main className="relative h-dvh w-screen overflow-hidden">
        {payload.sections.map((section, idx) => {
          const isActive = idx === activeIndex;
          const theme = themeClass(section.theme);
          return (
            <section
              key={section.key}
              className={`absolute inset-0 overflow-y-auto transition-all duration-700 ease-out ${theme} ${
                isActive ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              <div className={`mx-auto flex h-full flex-col justify-center px-4 pb-24 pt-16 lg:px-6 lg:pb-28 lg:pt-20 ${section.animation ? "motion-safe:animate-fadeIn" : ""}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7BB7FF] lg:text-[11px]">{section.eyebrow}</p>
                <h1 className="mt-3 text-2xl font-black leading-tight lg:mt-4 lg:text-3xl sm:lg:text-5xl md:lg:text-6xl">{section.title}</h1>
                {section.body ? (
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-current/80 lg:mt-5 lg:text-base lg:leading-8 sm:lg:text-lg">{section.body}</p>
                ) : null}

                {section.stats.length > 0 ? (
                  <div className="mt-6 grid grid-cols-2 gap-2 lg:mt-10 lg:grid-cols-3 lg:gap-3 xl:gap-4">
                    {section.stats.map((s, i) => (
                      <div key={i} className="rounded-2xl border border-white/15 bg-white/5 p-3 lg:p-4 backdrop-blur">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-current/60 lg:text-[10px]">{s.label}</p>
                        <p className="mt-1 text-xl font-black text-current lg:mt-2 lg:text-2xl xl:text-3xl">{s.value}</p>
                        {s.hint ? <p className="mt-0.5 text-[10px] text-current/60 lg:text-xs">{s.hint}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.bullets.length > 0 ? (
                  <div className="mt-6 grid gap-2 lg:mt-10 lg:grid-cols-2 lg:gap-3 xl:grid-cols-3 xl:gap-4">
                    {section.bullets.map((b, i) => (
                      <div key={i} className="rounded-2xl border border-current/15 bg-current/5 p-3 lg:p-4 backdrop-blur">
                        <div className="flex items-center gap-2 text-sm font-black lg:text-base">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-[#5DA9FF] to-[#C57BFF] text-[10px] text-white lg:size-7 lg:text-[12px]">
                            {b.icon || (i + 1)}
                          </span>
                          {b.title}
                        </div>
                        {b.description ? <p className="mt-1.5 text-xs leading-5 text-current/70 lg:mt-2 lg:text-sm lg:leading-6">{b.description}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* AI 助理章节交互 */}
                {section.key === "aiAssistants" && payload.meta.enableAI ? (
                  <div className="mt-6 grid gap-2 lg:mt-8 lg:grid-cols-3 xl:grid-cols-5">
                    {(Object.keys(ASSISTANT_LABEL) as AssistantKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openAssistant(key)}
                        className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/0 p-3 text-left transition hover:border-white/40 hover:bg-white/10 lg:p-4"
                      >
                        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white/20 text-sm font-black lg:size-9 lg:text-base">
                          {ASSISTANT_ICON[key]}
                        </span>
                        <p className="mt-2 text-xs font-black lg:mt-3 lg:text-sm">{ASSISTANT_LABEL[key]}</p>
                        <p className="mt-1 text-[10px] text-white/60 lg:text-[11px]">点击进入 AI 演示窗口</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {section.ctaText && section.ctaUrl ? (
                  <div className="mt-6 flex flex-wrap gap-2 lg:mt-10 lg:gap-3">
                    <a
                      href={section.ctaUrl}
                      onClick={(event) => {
                        if (section.ctaUrl?.startsWith("#")) {
                          event.preventDefault();
                          const idx = payload.sections.findIndex((s) => `#${s.key}` === section.ctaUrl);
                          if (idx >= 0) setActiveIndex(idx);
                        }
                      }}
                      className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#0A1020] shadow-lg shadow-white/20 lg:px-6 lg:py-3 lg:text-sm"
                    >
                      {section.ctaText}
                    </a>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </main>

      {/* 底部导航 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 px-3 py-2 text-white lg:gap-3 lg:px-5 lg:py-3">
        <div className="pointer-events-auto flex items-center gap-1 lg:gap-2">
          <button
            type="button"
            onClick={gotoPrev}
            disabled={activeIndex === 0}
            className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] disabled:opacity-30 lg:px-3 lg:py-1 lg:text-[10px]"
          >
            ← 上一章
          </button>
          <button
            type="button"
            onClick={gotoNext}
            disabled={activeIndex >= total - 1}
            className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] disabled:opacity-30 lg:px-3 lg:py-1 lg:text-[10px]"
          >
            下一章 →
          </button>
          {activeSection?.dwellSec ? (
            <button
              type="button"
              onClick={() => {
                isUserInteractingRef.current = false;
                setAutoPlayOn((v) => !v);
              }}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] lg:px-3 lg:py-1 lg:text-[10px] ${
                autoPlayOn ? "border-[#5DA9FF] bg-[#5DA9FF]/20 text-[#5DA9FF]" : "border-white/20 bg-black/40"
              }`}
              title="自动播放（可关闭）"
            >
              {autoPlayOn ? `自动播放 ${autoPlayRemaining}s` : "自动播放"}
            </button>
          ) : null}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-0.5 lg:gap-1">
          {payload.sections.map((section, idx) => (
            <button
              key={section.key}
              type="button"
              onClick={() => {
                pauseAutoPlay();
                setActiveIndex(idx);
              }}
              title={section.label}
              className={`h-1.5 w-4 rounded-full transition-all lg:h-2 lg:w-8 ${
                idx === activeIndex ? "bg-white" : "w-1.5 bg-white/30 hover:bg-white/60 lg:w-2"
              }`}
            />
          ))}
        </div>
        <div className="pointer-events-auto rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] lg:px-3 lg:py-1 lg:text-[10px]">
          {activeIndex + 1} / {total}
        </div>
      </div>

      {/* AI 演示窗口 */}
      {aiOpen && activeAssistant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur sm:p-4">
          <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/20 bg-[#0A1020] text-white shadow-2xl sm:h-[80vh] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 sm:px-5 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5DA9FF] to-[#C57BFF] text-sm font-black sm:size-9 sm:rounded-xl sm:text-base">
                  {ASSISTANT_ICON[activeAssistant]}
                </span>
                <div>
                  <p className="text-xs font-black sm:text-sm">{ASSISTANT_LABEL[activeAssistant]} 演示</p>
                  <p className="text-[9px] text-white/60 sm:text-[10px]">仅用于比赛路演</p>
                </div>
              </div>
              <button type="button" onClick={() => setAiOpen(false)} className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-black sm:px-3 sm:py-1 sm:text-[10px]">
                关闭
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:space-y-3 sm:px-5 sm:py-4">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-5 sm:text-sm sm:leading-6 ${
                    m.role === "user" ? "ml-auto bg-gradient-to-br from-[#5DA9FF] to-[#3F7BD3] text-white" : "bg-white/8 text-white/90"
                  }`}
                >
                  {m.error ? <span className="text-[#FF8E8E]">错误：{m.error}</span> : m.content}
                  {m.latencyMs !== undefined ? (
                    <p className="mt-1 text-[9px] text-white/50 sm:text-[10px]">耗时 {m.latencyMs} ms</p>
                  ) : null}
                </div>
              ))}
              {sending ? <p className="text-[10px] text-white/60 sm:text-xs">AI 正在思考…</p> : null}
            </div>
            <div className="border-t border-white/10 px-3 py-2 sm:px-5 sm:py-3">
              <div className="mb-2 flex flex-wrap gap-1 sm:gap-2">
                {(assistantSuggestions[activeAssistant] || []).map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void sendQuestion(q)}
                    disabled={sending}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/80 hover:border-white/40 disabled:opacity-50 sm:text-[11px]"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {payload.meta.allowFreeInput ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendQuestion(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="向 AI 助理提问…"
                    className="flex-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-white/40 sm:text-sm"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-full bg-gradient-to-br from-[#5DA9FF] to-[#C57BFF] px-3 py-1.5 text-xs font-black disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    发送
                  </button>
                </form>
              ) : (
                <p className="text-[10px] text-white/50 sm:text-xs">当前仅允许点击预设问题。</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
