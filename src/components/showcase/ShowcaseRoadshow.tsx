"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ExternalLink, Menu, Sparkles, X } from "lucide-react";
import type { ShowcaseV2PublicPayload } from "@/lib/showcase-v2-shared";

type AssistantKey = "tax" | "legal" | "market" | "design" | "social";
type ChatMessage = { role: "user" | "assistant"; content: string; error?: string; latencyMs?: number };

const NAV_KEYS = ["painPoints", "solution", "productDemo", "aiAssistants", "businessModel", "competition", "progress"] as const;

const PRODUCT_ENTRIES = [
  { label: "产品首页", description: "真实产品定位、注册入口与手机预览", href: "/", status: "已上线" },
  { label: "注册与邮箱验证", description: "邮箱注册、六位验证码与登录闭环", href: "/register", status: "已上线" },
  { label: "主页编辑后台", description: "资料、链接、主题、二维码与实时预览", href: "/dashboard", status: "需登录" },
  { label: "企业 AI 工作台", description: "企业资料与 AI 助理工作入口", href: "/enterprise-ai", status: "内测中" },
];

const ASSISTANTS: Array<{ key: AssistantKey | "sales"; label: string; description: string; live: boolean }> = [
  { key: "tax", label: "财税 AI Agent", description: "税务提醒、发票与经营合规建议", live: true },
  { key: "legal", label: "法务 AI Agent", description: "合同要点、协议与风险清单", live: true },
  { key: "market", label: "市场调研 AI Agent", description: "竞品、用户画像和市场机会", live: true },
  { key: "design", label: "设计 AI Agent", description: "海报、封面、头像和视觉建议", live: true },
  { key: "social", label: "社媒运营 AI Agent", description: "选题、改写、脚本与发布计划", live: true },
  { key: "sales", label: "销售顾问 AI Agent", description: "客户沟通、需求判断和跟进建议", live: false },
];

const PLANS = [
  { name: "免费版", price: "0 元", description: "公开主页、基础链接与二维码分享" },
  { name: "会员版", price: "188 元 / 年", description: "高级主题、访问数据和高级二维码" },
  { name: "企业版", price: "联系开通", description: "企业资料库、AI 助理与团队服务" },
];

const PROGRESS = [
  { label: "已完成", value: "注册登录、邮箱验证、主页编辑、公开主页、链接、二维码、后台治理" },
  { label: "内测中", value: "企业 AI、五个可演示 AI Agent、访问分析与企业资料能力" },
  { label: "下一阶段", value: "销售顾问 Agent、会员支付、客户线索与经营自动化" },
];

function sectionId(key: string) {
  return `showcase-${key}`;
}

export default function ShowcaseRoadshow() {
  const [payload, setPayload] = useState<ShowcaseV2PublicPayload | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState<AssistantKey | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/showcase/content", { cache: "no-store" });
        const result = await response.json() as { success?: boolean; data?: ShowcaseV2PublicPayload; error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok || !result.success || !result.data) {
          setError(result.error?.message || "比赛展示内容暂不可用。");
          return;
        }
        setPayload(result.data);
      } catch {
        if (!cancelled) setError("网络连接失败，无法加载比赛展示内容。");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(() => payload?.sections || [], [payload]);
  const byKey = useMemo(() => new Map(sections.map((section) => [section.key, section])), [sections]);

  function openAssistant(key: AssistantKey) {
    if (!payload?.meta.enableAI) return;
    const welcome = payload.meta.welcomeByAssistant[key] || "请选择推荐问题，查看真实 AI 演示结果。";
    setActiveAssistant(key);
    setChat([{ role: "assistant", content: welcome }]);
  }

  async function sendQuestion(question: string) {
    const text = question.trim();
    if (!activeAssistant || !text || sending) return;
    setSending(true);
    setInput("");
    setChat((items) => [...items, { role: "user", content: text }]);
    try {
      const response = await fetch("/api/showcase/ai-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assistant: activeAssistant, question: text, sourcePage: "/showcase" }),
      });
      const result = await response.json() as { success?: boolean; data?: { response?: string; latencyMs?: number }; error?: { message?: string } };
      if (!response.ok || !result.success) {
        setChat((items) => [...items, { role: "assistant", content: "", error: result.error?.message || "AI 演示调用失败。" }]);
        return;
      }
      setChat((items) => [...items, { role: "assistant", content: result.data?.response || "", latencyMs: result.data?.latencyMs }]);
    } catch {
      setChat((items) => [...items, { role: "assistant", content: "", error: "网络异常，请稍后再试。" }]);
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <main className="ui-page flex min-h-dvh items-center py-10">
        <section className="ui-container ui-surface max-w-xl p-7 text-center">
          <p className="ui-eyebrow">比赛展示中心</p>
          <h1 className="ui-title mt-3 text-3xl">展示内容暂不可用</h1>
          <p className="ui-muted mt-3 leading-7">{error}</p>
        </section>
      </main>
    );
  }

  if (!payload) {
    return <main className="ui-page grid min-h-dvh place-items-center text-sm font-bold text-[var(--ui-muted)]">正在加载比赛展示内容…</main>;
  }

  const opening = byKey.get("opening");
  const ending = byKey.get("ending");

  return (
    <div className="ui-page">
      <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[color:var(--ui-surface)]/95 backdrop-blur">
        <div className="ui-container flex min-h-16 items-center justify-between gap-4">
          <a href="#showcase-top" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] font-black text-white">L</span>
            <span>
              <strong className="block text-sm text-[var(--ui-ink)]">Link168 比赛展示</strong>
              <span className="text-xs text-[var(--ui-muted)]">评委专用 · 真实产品与进展</span>
            </span>
          </a>

          <nav className="hidden items-center gap-5 text-sm font-bold text-[var(--ui-muted)] xl:flex" aria-label="比赛展示导航">
            {NAV_KEYS.map((key) => {
              const section = byKey.get(key);
              if (!section) return null;
              return <a key={key} href={`#${sectionId(key)}`} className="transition hover:text-[var(--ui-brand)]">{section.label}</a>;
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="ui-button-secondary hidden sm:inline-flex">查看真实产品 <ExternalLink className="size-4" /></Link>
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="ui-button-secondary px-3 xl:hidden" aria-label="打开导航">
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="ui-container grid gap-1 border-t border-[var(--ui-line)] py-3 xl:hidden">
            {NAV_KEYS.map((key) => {
              const section = byKey.get(key);
              if (!section) return null;
              return <a key={key} href={`#${sectionId(key)}`} onClick={() => setMenuOpen(false)} className="rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]">{section.label}</a>;
            })}
          </nav>
        ) : null}
      </header>

      <main id="showcase-top">
        <section className="border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
          <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="ui-eyebrow">{opening?.eyebrow || "Link168 比赛展示"}</p>
              <h1 className="ui-title mt-4 text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{opening?.title || payload.meta.tagline}</h1>
              <p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">{opening?.body || payload.meta.tagline}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={`#${sectionId("productDemo")}`} className="ui-button-primary min-h-12 px-6 text-base">查看真实产品 <ArrowRight className="size-4" /></a>
                <a href={`#${sectionId("progress")}`} className="ui-button-secondary min-h-12 px-6 text-base">查看真实进展</a>
              </div>
            </div>

            <aside className="ui-surface overflow-hidden">
              <div className="border-b border-[var(--ui-line)] px-5 py-4">
                <p className="text-xs font-black text-[var(--ui-muted)]">当前展示状态</p>
              </div>
              <dl className="divide-y divide-[var(--ui-line)]">
                <div className="flex items-center justify-between gap-4 px-5 py-4"><dt className="text-sm font-bold">核心主页闭环</dt><dd className="rounded-full bg-[var(--ui-success-soft)] px-3 py-1 text-xs font-black text-[var(--ui-success)]">已完成</dd></div>
                <div className="flex items-center justify-between gap-4 px-5 py-4"><dt className="text-sm font-bold">邮箱验证与找回密码</dt><dd className="rounded-full bg-[var(--ui-success-soft)] px-3 py-1 text-xs font-black text-[var(--ui-success)]">已完成</dd></div>
                <div className="flex items-center justify-between gap-4 px-5 py-4"><dt className="text-sm font-bold">AI 助理</dt><dd className="rounded-full bg-[var(--ui-accent-soft)] px-3 py-1 text-xs font-black text-[#7D5B24]">内测中</dd></div>
                <div className="flex items-center justify-between gap-4 px-5 py-4"><dt className="text-sm font-bold">正式支付</dt><dd className="rounded-full bg-[var(--ui-surface-muted)] px-3 py-1 text-xs font-black text-[var(--ui-muted)]">暂未开放</dd></div>
              </dl>
            </aside>
          </div>
        </section>

        {sections.filter((section) => !["opening", "ending"].includes(section.key)).map((section, index) => (
          <section key={section.key} id={sectionId(section.key)} className={`scroll-mt-20 border-b border-[var(--ui-line)] py-14 sm:py-18 ${index % 2 === 0 ? "bg-[var(--ui-page)]" : "bg-[var(--ui-surface)]"}`}>
            <div className="ui-container">
              <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
                <div>
                  <p className="ui-eyebrow">{section.eyebrow}</p>
                  <h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">{section.title}</h2>
                  <p className="ui-muted mt-4 leading-7">{section.body}</p>
                </div>

                <div>
                  {section.key === "productDemo" ? (
                    <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
                      {PRODUCT_ENTRIES.map((item) => (
                        <Link key={item.href} href={item.href} target="_blank" className="flex items-center justify-between gap-4 p-5 transition hover:bg-[var(--ui-surface-muted)]">
                          <span><strong className="block text-sm text-[var(--ui-ink)]">{item.label}</strong><span className="ui-muted mt-1 block text-sm leading-6">{item.description}</span></span>
                          <span className="shrink-0 rounded-full bg-[var(--ui-brand-soft)] px-3 py-1 text-xs font-black text-[var(--ui-success)]">{item.status}</span>
                        </Link>
                      ))}
                    </div>
                  ) : section.key === "aiAssistants" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ASSISTANTS.map((assistant) => (
                        <button key={assistant.key} type="button" disabled={!assistant.live || !payload.meta.enableAI} onClick={() => assistant.live && openAssistant(assistant.key as AssistantKey)} className="ui-surface-plain p-5 text-left transition enabled:hover:border-[var(--ui-brand)] disabled:cursor-default">
                          <div className="flex items-start justify-between gap-3"><strong className="text-sm text-[var(--ui-ink)]">{assistant.label}</strong><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${assistant.live && payload.meta.enableAI ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{assistant.live ? (payload.meta.enableAI ? "可演示" : "未开启") : "规划中"}</span></div>
                          <p className="ui-muted mt-2 text-sm leading-6">{assistant.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : section.key === "businessModel" ? (
                    <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
                      {PLANS.map((plan) => <div key={plan.name} className="grid gap-2 p-5 sm:grid-cols-[140px_150px_1fr] sm:items-center"><strong>{plan.name}</strong><span className="font-black text-[var(--ui-brand-hover)]">{plan.price}</span><span className="ui-muted text-sm">{plan.description}</span></div>)}
                    </div>
                  ) : section.key === "progress" ? (
                    <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
                      {PROGRESS.map((item) => <div key={item.label} className="grid gap-2 p-5 sm:grid-cols-[130px_1fr]"><strong className="text-[var(--ui-ink)]">{item.label}</strong><span className="ui-muted text-sm leading-6">{item.value}</span></div>)}
                    </div>
                  ) : (
                    <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <div key={`${section.key}-${bulletIndex}`} className="grid gap-3 p-5 sm:grid-cols-[36px_1fr]">
                          <span className="grid size-8 place-items-center rounded-full bg-[var(--ui-brand-soft)] text-xs font-black text-[var(--ui-brand)]">{bulletIndex + 1}</span>
                          <div><strong className="text-sm text-[var(--ui-ink)]">{bullet.title}</strong>{bullet.description ? <p className="ui-muted mt-1 text-sm leading-6">{bullet.description}</p> : null}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="bg-[var(--ui-ink)] py-14 text-white sm:py-18">
          <div className="ui-container flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black tracking-[0.12em] text-white/60">{ending?.eyebrow || "感谢评委"}</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">{ending?.title || "Link168：把名片变成经营入口"}</h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/70">{ending?.body || "欢迎进入真实产品继续查看。"}</p>
            </div>
            <Link href="/" target="_blank" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] bg-white px-6 font-black text-[var(--ui-ink)]">进入真实产品 <ExternalLink className="size-4" /></Link>
          </div>
        </section>
      </main>

      {activeAssistant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--ui-radius-lg)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-lg)]">
            <header className="flex items-center justify-between border-b border-[var(--ui-line)] px-5 py-4">
              <div><p className="text-xs font-black text-[var(--ui-brand)]">真实 AI 演示</p><h3 className="mt-1 font-black text-[var(--ui-ink)]">{ASSISTANTS.find((item) => item.key === activeAssistant)?.label}</h3></div>
              <button type="button" onClick={() => setActiveAssistant(null)} className="ui-button-secondary px-3"><X className="size-4" /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {chat.map((message, index) => <div key={index} className={`max-w-[88%] rounded-[var(--ui-radius-sm)] px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[var(--ui-brand)] text-white" : "bg-[var(--ui-surface-muted)] text-[var(--ui-ink)]"}`}>{message.error || message.content}{message.latencyMs ? <span className="mt-1 block text-[10px] opacity-60">响应耗时 {message.latencyMs}ms</span> : null}</div>)}
              {sending ? <p className="text-sm font-bold text-[var(--ui-muted)]">AI 正在生成回答…</p> : null}
            </div>
            <div className="border-t border-[var(--ui-line)] p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {(payload.meta.suggestedQuestionsByAssistant[activeAssistant] || []).slice(0, 3).map((question) => <button key={question} type="button" onClick={() => void sendQuestion(question)} className="rounded-full border border-[var(--ui-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ui-muted)] hover:border-[var(--ui-brand)]">{question}</button>)}
              </div>
              {payload.meta.allowFreeInput ? <form onSubmit={(event) => { event.preventDefault(); void sendQuestion(input); }} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} className="ui-input" placeholder="输入演示问题" maxLength={600} /><button type="submit" disabled={sending || !input.trim()} className="ui-button-primary shrink-0">发送</button></form> : <p className="text-xs text-[var(--ui-muted)]">当前演示仅允许点击预设问题。</p>}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
