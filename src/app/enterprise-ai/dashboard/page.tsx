"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, BriefcaseBusiness, FileText, Palette, Scale, Send, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const assistants = [
  { title: "财税 AI Agent", description: "收入、成本、税费、经营资料辅助整理和经营提醒", icon: FileText, color: "bg-[#E6F0D8]", textColor: "text-[#3F5F31]" },
  { title: "法务 AI Agent", description: "合同风险初筛、协议条款解释、合规提醒和审阅清单生成", icon: Scale, color: "bg-[#E8ECFB]", textColor: "text-[#4A5FAA]" },
  { title: "市场调研 AI Agent", description: "行业分析、竞品分析、城市市场判断、目标用户画像和推广建议", icon: BriefcaseBusiness, color: "bg-[#FCE7D3]", textColor: "text-[#A0522D]" },
  { title: "设计 AI Agent", description: "主页视觉建议、海报创意、商品宣传图、品牌风格和活动物料建议", icon: Palette, color: "bg-[#FDE7F2]", textColor: "text-[#A02F6B]" },
  { title: "社媒运营 AI Agent", description: "小红书、抖音、朋友圈、公众号内容选题、标题、脚本和发布计划", icon: Sparkles, color: "bg-[#FFF3D6]", textColor: "text-[#8C612E]" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

type AccessInfo = {
  success?: boolean;
  aiEnabled: boolean;
  authenticated: boolean;
  isTester: boolean;
  userEmail?: string;
  emailVerified?: boolean;
  aiDailyLimitPerUser: number;
  providerConfigured?: boolean;
  assistants?: { assistant: string; title?: string; used: number; limit: number; remaining: number }[];
};

export default function EnterpriseAiDashboardPage() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [accessError, setAccessError] = useState("");
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadAccess = useCallback(async () => {
    setAccessError("");
    try {
      const response = await fetch("/api/enterprise-ai/access", { cache: "no-store" });
      const data = (await response.json()) as AccessInfo;
      setAccess(data);
    } catch {
      setAccessError("无法加载 AI 服务状态。");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccess]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeAssistant, history]);

  const currentMessages = activeAssistant ? history[activeAssistant] || [] : [];
  const activeConfig = useMemo(() => assistants.find((a) => a.title === activeAssistant), [activeAssistant]);

  async function sendMessage() {
    if (!activeAssistant || !input.trim() || sending) return;
    const message = input.trim();
    setInput("");
    setChatError("");
    setSending(true);
    const currentHistory = history[activeAssistant] || [];
    const nextHistory: ChatMessage[] = [...currentHistory, { role: "user", content: message }];
    setHistory((h) => ({ ...h, [activeAssistant!]: nextHistory }));

    try {
      const response = await fetch("/api/enterprise-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: activeAssistant, message, history: currentHistory }),
        cache: "no-store",
      });
      const data = (await response.json()) as { success?: boolean; reply?: string; error?: string; usage?: { used: number; limit: number; remaining: number } };
      if (!response.ok || !data.success) {
        setChatError(data.error || "AI 服务暂时不可用。");
        const errorReply = data.error || "AI 服务暂时不可用。";
        setHistory((h) => ({ ...h, [activeAssistant!]: [...(h[activeAssistant!] || []), { role: "assistant" as const, content: `⚠️ ${errorReply}` }] }));
        return;
      }
      setHistory((h) => ({ ...h, [activeAssistant!]: [...(h[activeAssistant!] || []), { role: "assistant" as const, content: data.reply || "（空回复）" }] }));
      if (data.usage) setUsage(data.usage);
    } catch {
      setChatError("网络错误，调用 AI 失败。");
      setHistory((h) => ({ ...h, [activeAssistant!]: [...(h[activeAssistant!] || []), { role: "assistant" as const, content: "⚠️ 网络错误，请稍后重试。" }] }));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (!access) {
    return (
      <main className="min-h-dvh bg-[#F7F1E7] px-4 py-6 text-[#2B241E] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BrandLogo size="header" />
          <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#4A4A4A] shadow-sm">正在加载 AI 服务状态...</p>
          {accessError ? <p className="mt-3 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{accessError}</p> : null}
        </div>
      </main>
    );
  }

  const showClosedBeta = !access.aiEnabled || !access.authenticated || !access.isTester;

  return (
    <main className="min-h-dvh bg-[#F7F1E7] px-4 py-6 text-[#2B241E] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <BrandLogo size="header" />
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/enterprise-ai" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#3F5F31]">
              <ArrowLeft aria-hidden className="size-4" />
              返回企业 AI
            </Link>
            <Link href="/" className="inline-flex min-h-10 items-center rounded-full border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#3F5F31]">
              返回首页
            </Link>
            {!access.authenticated ? (
              <Link href="/login" className="inline-flex min-h-10 items-center rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white">
                登录
              </Link>
            ) : null}
          </div>
        </header>

        <section className="mt-8">
          <p className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[#DDE8CD] px-3 py-1.5 text-sm font-black text-[#3F5F31]">
            <Bot aria-hidden className="size-4" />
            {access.authenticated
              ? access.isTester
                ? `白名单测试：${access.userEmail} · 每账号每日上限 ${access.aiDailyLimitPerUser} 次`
                : `内测中：${access.userEmail}`
              : "AI 经营名片平台 · 内测工作台预览"}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">企业 AI 工作台</h1>
          <p className="mt-2 text-sm text-[#7A6D5E]">
            五大 AI Agent：财税、法务、市场调研、设计、社媒运营 · AI 能力：
            {access.aiEnabled ? "已开启（白名单测试）" : "未启用"} · provider 配置：
            {access.providerConfigured ? "已配置" : "未配置（缺少 API Key / Base URL / Model）"}
          </p>
        </section>

        {showClosedBeta ? (
          <section className="mt-8 rounded-[32px] border border-[#FFB020]/30 bg-[#FFF7E0] p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#8C612E]">内测中 · 五大 AI Agent 仅测试账号可用</h2>
            <p className="mt-2 text-sm leading-6 text-[#8C612E]/90">
              {!access.authenticated
                ? "请先登录以查看你的测试资格。"
                : access.isTester
                  ? "你已在 AI 测试白名单中，但 AI 服务当前未启用，请联系超级管理员开启。"
                  : "当前账号不在 AI 测试白名单中。如需开通，请联系超级管理员将你的邮箱加入白名单。"}
            </p>
            <p className="mt-2 text-xs font-bold text-[#8C612E]">
              超级管理员可以在 &ldquo;超级管理员 &rarr; API 配置中心&rdquo; 中管理五大 AI Agent 测试白名单、调用额度与开关。
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {assistants.map((a) => (
                <article key={a.title} className={`rounded-[28px] border border-[#FFB020]/40 bg-white/90 p-5 shadow-sm`}>
                  <div className={`grid size-11 place-items-center rounded-2xl ${a.color} ${a.textColor}`}>
                    <a.icon aria-hidden className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-black">{a.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{a.description}</p>
                  <p className="mt-4 rounded-xl bg-[#FFEAB6] px-3 py-2 text-xs font-black text-[#8C612E]">内测中 · 暂不可用</p>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {assistants.map((a) => {
                const usageInfo = access.assistants?.find((u) => u.assistant === a.title);
                const isActive = activeAssistant === a.title;
                return (
                  <button
                    key={a.title}
                    type="button"
                    onClick={() => {
                      setActiveAssistant(a.title);
                      setChatError("");
                      setUsage(usageInfo ?? null);
                    }}
                    className={`rounded-[28px] border bg-white p-5 text-left shadow-sm transition ${isActive ? "border-[#6F8F4E] ring-2 ring-[#6F8F4E]/20" : "border-[#E8DCCB] hover:-translate-y-0.5"}`}
                  >
                    <div className={`grid size-11 place-items-center rounded-2xl ${a.color} ${a.textColor}`}>
                      <a.icon aria-hidden className="size-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black">{a.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{a.description}</p>
                    <p className="mt-4 text-xs font-black text-[#3F5F31]">
                      今日：{usageInfo?.used ?? 0}/{usageInfo?.limit ?? access.aiDailyLimitPerUser}（剩余 {usageInfo?.remaining ?? access.aiDailyLimitPerUser}）
                    </p>
                  </button>
                );
              })}
            </section>

            {activeAssistant && activeConfig ? (
              <section className="mt-8 rounded-[32px] border border-[#E8DCCB] bg-white/95 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-11 place-items-center rounded-2xl ${activeConfig.color} ${activeConfig.textColor}`}>
                      <activeConfig.icon aria-hidden className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">{activeAssistant}</h2>
                      <p className="text-xs font-bold text-[#7A6D5E]">{activeConfig.description}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setActiveAssistant(null)} className="min-h-9 rounded-full border border-[#E8DCCB] px-3 text-xs font-black text-[#3F5F31]">
                    关闭对话
                  </button>
                </div>

                <div ref={scrollRef} className="mt-4 max-h-[480px] min-h-[320px] overflow-y-auto rounded-2xl bg-[#F7F1E7] p-4">
                  {currentMessages.length === 0 ? (
                    <p className="py-10 text-center text-sm font-bold text-[#7A6D5E]">请输入你的问题，开始咨询 {activeAssistant}。</p>
                  ) : (
                    <div className="grid gap-3">
                      {currentMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${msg.role === "user" ? "bg-[#6F8F4E] text-white" : "bg-white text-[#1A1A1A] shadow-sm border border-[#E8DCCB]"}`}>
                            {msg.content.split("\n").map((line, i) => (
                              <p key={i} className="whitespace-pre-wrap">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                      {sending ? (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm font-bold text-[#7A6D5E] shadow-sm">
                            正在生成回复...
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {chatError ? <p className="mt-3 rounded-xl bg-[#FFF1F0] px-3 py-2 text-sm font-bold text-[#FF4D4F]">{chatError}</p> : null}

                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={2}
                    placeholder={`向 ${activeAssistant} 提问...（Enter 发送，Shift+Enter 换行）`}
                    className="min-h-[64px] flex-1 rounded-2xl border border-[#E0E0E0] bg-white p-3 text-sm leading-6 outline-none focus:border-[#6F8F4E]"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#6F8F4E] text-white shadow-sm disabled:opacity-60"
                  >
                    <Send aria-hidden className="size-5" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A6D5E]">
                  <p>
                    当前对话仅展示本次会话记录；AI 回复仅作经营参考，不替代专业税务/法律意见，不保证商业结果。
                  </p>
                  {usage ? (
                    <p className="font-bold text-[#3F5F31]">
                      今日用量：{usage.used}/{usage.limit}（剩余 {usage.remaining}）
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
