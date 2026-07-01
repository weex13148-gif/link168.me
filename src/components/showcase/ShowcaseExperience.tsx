"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Menu, X } from "lucide-react";
import CompetitionMaterialsSection from "@/components/showcase/CompetitionMaterialsSection";
import type { ShowcaseV2PublicPayload, ShowcaseV2SectionKey } from "@/lib/showcase-v2-shared";

type AssistantKey = "tax" | "legal" | "market" | "design" | "social";
type ChatMessage = { role: "user" | "assistant"; text: string; error?: boolean; latencyMs?: number };

const NAV_KEYS: ShowcaseV2SectionKey[] = ["painPoints", "solution", "productDemo", "aiAssistants", "businessModel", "competition", "progress"];

const COPY: Partial<Record<ShowcaseV2SectionKey, { title: string; body: string }>> = {
  opening: {
    title: "Link168：面向中文创作者、小商家和一人公司的个人数字名片平台",
    body: "用一个公开主页集中展示内容、服务、联系方式和二维码。核心主页闭环已经完成，AI、会员和商业化能力按真实进度标注。",
  },
  painPoints: {
    title: "用户不是缺少链接，而是缺少一个可持续经营的统一入口",
    body: "内容、服务和联系方式散落在多个平台；传统名片无法持续更新；小团队又缺少设计、运营、法务和财税能力。",
  },
  solution: {
    title: "先完成展示与分享闭环，再逐步扩展经营与 AI 能力",
    body: "Link168 先完成注册、邮箱验证、主页编辑、真实链接、公开主页和二维码分享，再在同一产品结构中扩展数据、企业资料和 AI 助理。",
  },
  productDemo: {
    title: "评委可以直接打开真实产品页面",
    body: "这里不使用截图代替功能。每个入口都指向仓库中的真实页面，并明确标记是否需要登录、仍在内测或暂未开放。",
  },
  aiAssistants: {
    title: "五个比赛演示 Agent，加一个规划中的销售顾问",
    body: "财税、法务、市场调研、设计和社媒运营已具备比赛演示入口；销售顾问保留为下一阶段能力，不伪装成已完成。",
  },
  businessModel: {
    title: "免费主页获客，会员和企业服务变现",
    body: "免费版降低使用门槛；会员版提供高级主题、数据和二维码能力；企业版承载企业资料、AI 助理和团队服务。正式支付未开放时，页面只提供版本说明和咨询入口。",
  },
  competition: {
    title: "不是更复杂的链接页，而是中文经营入口的基础设施",
    body: "Link168 的差异不是堆叠概念，而是把中文场景、公开主页、二维码、邮箱验证、后台治理和可扩展 AI 架构放在同一产品中。",
  },
  progress: {
    title: "已完成、内测中和下一阶段严格分开",
    body: "评委看到的状态来自当前产品边界：能打开和操作的标记为已完成，需要配置或仍在验证的标记为内测，尚未完成的进入下一阶段。",
  },
};

const FIXED_LISTS: Partial<Record<ShowcaseV2SectionKey, Array<{ title: string; description: string }>>> = {
  painPoints: [
    { title: "入口分散", description: "内容、服务和联系方式散落在多个平台，客户需要反复寻找。" },
    { title: "传统名片只能展示", description: "无法持续更新内容，也不能承接二维码和线上传播。" },
    { title: "小团队缺少数字化能力", description: "创作者和小商家通常没有完整的产品、设计、运营和技术团队。" },
  ],
  solution: [
    { title: "创建公开主页", description: "设置真实用户名、头像、名称和简介。" },
    { title: "添加真实入口", description: "整理内容平台、服务、联系方式和外部网站。" },
    { title: "通过链接与二维码分享", description: "让客户从社交媒体、聊天和线下物料快速进入。" },
    { title: "后台持续管理", description: "修改资料、链接、主题，并进行平台治理。" },
    { title: "扩展 AI 能力", description: "付费和企业场景逐步接入资料库与专属 Agent。" },
  ],
  competition: [
    { title: "中文用户场景", description: "围绕公众号、小红书、抖音、微信和线下二维码设计。" },
    { title: "核心闭环可独立使用", description: "即使 AI 未开启，主页、链接和二维码仍可正常工作。" },
    { title: "后台治理与安全边界", description: "包含邮箱验证、举报、封禁、日志和系统配置管理。" },
    { title: "AI 架构可扩展", description: "共享资料库底座配合不同 Agent 的提示词、模板和权限。" },
  ],
};

const PRODUCT_LINKS = [
  { name: "产品首页", note: "产品定位、注册入口、版本区别和手机预览", href: "/", status: "已完成" },
  { name: "注册与邮箱验证", note: "注册、六位验证码、登录和找回密码", href: "/register", status: "已完成" },
  { name: "主页编辑后台", note: "资料、链接、主题、二维码和实时预览", href: "/dashboard", status: "需登录" },
  { name: "企业 AI 工作台", note: "企业资料与 AI 助理入口", href: "/enterprise-ai", status: "内测中" },
];

const ASSISTANTS: Array<{ key: AssistantKey | "sales"; name: string; note: string; live: boolean }> = [
  { key: "tax", name: "财税 AI Agent", note: "税务提醒、发票与经营合规建议", live: true },
  { key: "legal", name: "法务 AI Agent", note: "合同要点、协议与风险清单", live: true },
  { key: "market", name: "市场调研 AI Agent", note: "竞品、用户画像和市场机会", live: true },
  { key: "design", name: "设计 AI Agent", note: "海报、封面、头像和视觉建议", live: true },
  { key: "social", name: "社媒运营 AI Agent", note: "选题、改写、脚本与发布计划", live: true },
  { key: "sales", name: "销售顾问 AI Agent", note: "客户沟通、需求判断和跟进建议", live: false },
];

const PLANS = [
  { name: "免费版", price: "0 元", note: "公开主页、基础链接和二维码分享" },
  { name: "会员版", price: "188 元 / 年", note: "高级主题、访问数据和高级二维码" },
  { name: "企业版", price: "联系开通", note: "企业资料库、AI 助理和团队服务" },
];

const PROGRESS = [
  { name: "已完成", note: "注册登录、邮箱验证、找回密码、主页编辑、公开主页、真实链接、二维码、举报与后台治理" },
  { name: "内测中", note: "企业 AI、五个比赛演示 Agent、访问分析和企业资料能力" },
  { name: "下一阶段", note: "销售顾问 Agent、正式会员支付、客户线索和经营自动化" },
];

function anchor(key: string) {
  return `competition-${key}`;
}

export default function ShowcaseExperience() {
  const [payload, setPayload] = useState<ShowcaseV2PublicPayload | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistant, setAssistant] = useState<AssistantKey | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/showcase/content", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { success?: boolean; data?: ShowcaseV2PublicPayload; error?: { message?: string } } }))
      .then(({ response, result }) => {
        if (cancelled) return;
        if (!response.ok || !result.success || !result.data) setError(result.error?.message || "比赛展示内容暂不可用。");
        else setPayload(result.data);
      })
      .catch(() => { if (!cancelled) setError("网络连接失败，无法加载比赛展示内容。"); });
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(() => payload?.sections || [], [payload]);
  const map = useMemo(() => new Map(sections.map((section) => [section.key, section])), [sections]);

  function openAssistant(key: AssistantKey) {
    if (!payload?.meta.enableAI) return;
    setAssistant(key);
    setChat([{ role: "assistant", text: payload.meta.welcomeByAssistant[key] || "请选择推荐问题，查看真实 AI 演示结果。" }]);
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!assistant || !text || sending) return;
    setSending(true);
    setInput("");
    setChat((items) => [...items, { role: "user", text }]);
    try {
      const response = await fetch("/api/showcase/ai-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assistant, question: text, sourcePage: "/showcase" }),
      });
      const result = await response.json() as { success?: boolean; data?: { response?: string; latencyMs?: number }; error?: { message?: string } };
      if (!response.ok || !result.success) setChat((items) => [...items, { role: "assistant", text: result.error?.message || "AI 演示调用失败。", error: true }]);
      else setChat((items) => [...items, { role: "assistant", text: result.data?.response || "", latencyMs: result.data?.latencyMs }]);
    } catch {
      setChat((items) => [...items, { role: "assistant", text: "网络异常，请稍后再试。", error: true }]);
    } finally {
      setSending(false);
    }
  }

  if (error) return <main className="ui-page grid min-h-dvh place-items-center p-6"><section className="ui-surface max-w-lg p-7 text-center"><p className="ui-eyebrow">比赛展示中心</p><h1 className="ui-title mt-3 text-3xl">展示内容暂不可用</h1><p className="ui-muted mt-3">{error}</p></section></main>;
  if (!payload) return <main className="ui-page grid min-h-dvh place-items-center text-sm font-bold text-[var(--ui-muted)]">正在加载比赛展示内容…</main>;

  const opening = map.get("opening");
  const ending = map.get("ending");

  return (
    <div className="ui-page">
      <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] backdrop-blur">
        <div className="ui-container flex min-h-16 items-center justify-between gap-4">
          <a href="#competition-top" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] font-black text-white">L</span><span><strong className="block text-sm">Link168 比赛展示</strong><small className="text-[var(--ui-muted)]">评委专用 · 真实产品与资料</small></span></a>
          <nav className="hidden items-center gap-5 text-sm font-bold text-[var(--ui-muted)] xl:flex">
            {NAV_KEYS.map((key) => map.has(key) ? <a key={key} href={`#${anchor(key)}`} className="hover:text-[var(--ui-brand)]">{map.get(key)?.label}</a> : null)}
            <a href="#competition-materials" className="hover:text-[var(--ui-brand)]">比赛资料</a>
          </nav>
          <div className="flex items-center gap-2"><Link href="/" target="_blank" className="ui-button-secondary hidden sm:inline-flex">查看真实产品 <ExternalLink className="size-4" /></Link><button type="button" onClick={() => setMenuOpen((value) => !value)} className="ui-button-secondary px-3 xl:hidden" aria-label="打开导航">{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button></div>
        </div>
        {menuOpen ? <nav className="ui-container grid border-t border-[var(--ui-line)] py-3 xl:hidden">{NAV_KEYS.map((key) => map.has(key) ? <a key={key} href={`#${anchor(key)}`} onClick={() => setMenuOpen(false)} className="rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]">{map.get(key)?.label}</a> : null)}<a href="#competition-materials" onClick={() => setMenuOpen(false)} className="rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]">比赛资料</a></nav> : null}
      </header>

      <main id="competition-top">
        <section className="border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
          <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div><p className="ui-eyebrow">{opening?.eyebrow || "Link168 比赛展示"}</p><h1 className="ui-title mt-4 max-w-4xl text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{COPY.opening?.title}</h1><p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">{COPY.opening?.body}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href={`#${anchor("productDemo")}`} className="ui-button-primary min-h-12 px-6 text-base">查看真实产品 <ArrowRight className="size-4" /></a><a href="#competition-materials" className="ui-button-secondary min-h-12 px-6 text-base">查看比赛资料</a></div></div>
            <aside className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden"><div className="px-5 py-4 text-xs font-black text-[var(--ui-muted)]">当前展示状态</div>{[["核心主页闭环","已完成","success"],["邮箱验证与找回密码","已完成","success"],["比赛资料下载","已接通","success"],["AI 助理","内测中","warning"],["正式支付","暂未开放","muted"]].map(([name,status,tone]) => <div key={name} className="flex items-center justify-between gap-4 px-5 py-4"><span className="text-sm font-bold">{name}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${tone === "success" ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : tone === "warning" ? "bg-[var(--ui-accent-soft)] text-[#7D5B24]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{status}</span></div>)}</aside>
          </div>
        </section>

        {sections.filter((section) => !["opening", "ending"].includes(section.key)).map((section, index) => {
          const copy = COPY[section.key];
          const fixed = FIXED_LISTS[section.key];
          return <section key={section.key} id={anchor(section.key)} className={`scroll-mt-20 border-b border-[var(--ui-line)] py-14 sm:py-16 ${index % 2 ? "bg-[var(--ui-surface)]" : "bg-[var(--ui-page)]"}`}><div className="ui-container grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12"><div><p className="ui-eyebrow">{section.eyebrow}</p><h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">{copy?.title || section.title}</h2><p className="ui-muted mt-4 leading-7">{copy?.body || section.body}</p></div><div>
            {section.key === "productDemo" ? <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">{PRODUCT_LINKS.map((item) => <Link key={item.href} href={item.href} target="_blank" className="flex items-center justify-between gap-4 p-5 hover:bg-[var(--ui-surface-muted)]"><span><strong className="block text-sm">{item.name}</strong><small className="ui-muted mt-1 block text-sm leading-6">{item.note}</small></span><span className="shrink-0 rounded-full bg-[var(--ui-brand-soft)] px-3 py-1 text-xs font-black text-[var(--ui-success)]">{item.status}</span></Link>)}</div>
            : section.key === "aiAssistants" ? <div className="grid gap-3 sm:grid-cols-2">{ASSISTANTS.map((item) => <button key={item.key} type="button" disabled={!item.live || !payload.meta.enableAI} onClick={() => item.live && openAssistant(item.key as AssistantKey)} className="ui-surface-plain p-5 text-left enabled:hover:border-[var(--ui-brand)] disabled:cursor-default"><div className="flex justify-between gap-3"><strong className="text-sm">{item.name}</strong><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.live && payload.meta.enableAI ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{item.live ? (payload.meta.enableAI ? "可演示" : "未开启") : "规划中"}</span></div><p className="ui-muted mt-2 text-sm leading-6">{item.note}</p></button>)}</div>
            : section.key === "businessModel" ? <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">{PLANS.map((item) => <div key={item.name} className="grid gap-2 p-5 sm:grid-cols-[130px_150px_1fr]"><strong>{item.name}</strong><span className="font-black text-[var(--ui-brand-hover)]">{item.price}</span><span className="ui-muted text-sm">{item.note}</span></div>)}</div>
            : section.key === "progress" ? <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">{PROGRESS.map((item) => <div key={item.name} className="grid gap-2 p-5 sm:grid-cols-[120px_1fr]"><strong>{item.name}</strong><span className="ui-muted text-sm leading-6">{item.note}</span></div>)}</div>
            : <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">{(fixed || section.bullets).map((item, itemIndex) => <div key={itemIndex} className="grid gap-3 p-5 sm:grid-cols-[36px_1fr]"><span className="grid size-8 place-items-center rounded-full bg-[var(--ui-brand-soft)] text-xs font-black text-[var(--ui-brand)]">{itemIndex + 1}</span><div><strong className="text-sm">{item.title}</strong>{item.description ? <p className="ui-muted mt-1 text-sm leading-6">{item.description}</p> : null}</div></div>)}</div>}
          </div></div></section>;
        })}

        <CompetitionMaterialsSection />

        <section className="bg-[var(--ui-ink)] py-14 text-white sm:py-16"><div className="ui-container flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black tracking-[0.12em] text-white/60">{ending?.eyebrow || "感谢评委"}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Link168：把名片变成经营入口</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">欢迎继续查看真实产品、比赛资料和当前可操作功能。</p></div><div className="flex flex-col gap-3 sm:flex-row"><a href="#competition-materials" className="inline-flex min-h-12 items-center justify-center rounded-[var(--ui-radius-sm)] border border-white/25 px-6 font-black">查看资料清单</a><Link href="/" target="_blank" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] bg-white px-6 font-black text-[var(--ui-ink)]">进入真实产品 <ExternalLink className="size-4" /></Link></div></div></section>
      </main>

      {assistant ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"><section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--ui-radius-lg)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-lg)]"><header className="flex items-center justify-between border-b border-[var(--ui-line)] px-5 py-4"><div><p className="text-xs font-black text-[var(--ui-brand)]">真实 AI 演示</p><h3 className="mt-1 font-black">{ASSISTANTS.find((item) => item.key === assistant)?.name}</h3></div><button type="button" onClick={() => setAssistant(null)} className="ui-button-secondary px-3"><X className="size-4" /></button></header><div className="flex-1 space-y-3 overflow-y-auto p-5">{chat.map((message, index) => <div key={index} className={`max-w-[88%] rounded-[var(--ui-radius-sm)] px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[var(--ui-brand)] text-white" : message.error ? "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]" : "bg-[var(--ui-surface-muted)]"}`}>{message.text}{message.latencyMs ? <small className="mt-1 block opacity-60">响应耗时 {message.latencyMs}ms</small> : null}</div>)}{sending ? <p className="text-sm font-bold text-[var(--ui-muted)]">AI 正在生成回答…</p> : null}</div><div className="border-t border-[var(--ui-line)] p-5"><div className="mb-3 flex flex-wrap gap-2">{(payload.meta.suggestedQuestionsByAssistant[assistant] || []).slice(0, 3).map((question) => <button key={question} type="button" onClick={() => void ask(question)} className="rounded-full border border-[var(--ui-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ui-muted)] hover:border-[var(--ui-brand)]">{question}</button>)}</div>{payload.meta.allowFreeInput ? <form onSubmit={(event) => { event.preventDefault(); void ask(input); }} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} className="ui-input" maxLength={600} placeholder="输入演示问题" /><button type="submit" disabled={!input.trim() || sending} className="ui-button-primary shrink-0">发送</button></form> : <p className="text-xs text-[var(--ui-muted)]">当前演示仅允许点击预设问题。</p>}</div></section></div> : null}
    </div>
  );
}
