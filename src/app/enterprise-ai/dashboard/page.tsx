"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, BriefcaseBusiness, FileText, Palette, Scale, Send, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const assistants = [
  { title: "财税 AI Agent", description: "收入、成本、税务、经营资料整理", icon: FileText, color: "bg-[#E6F0D8]", textColor: "text-[#3F5F31]" },
  { title: "法务 AI Agent", description: "合同风险初筛、条款解释、合规提醒", icon: Scale, color: "bg-[#E8ECFB]", textColor: "text-[#4A5FAA]" },
  { title: "市场调研 AI Agent", description: "行业分析、竞品分析、用户画像", icon: BriefcaseBusiness, color: "bg-[#FCE7D3]", textColor: "text-[#A0522D]" },
  { title: "设计 AI Agent", description: "首页视觉建议、海报文案、品牌风格", icon: Palette, color: "bg-[#FDE7F2]", textColor: "text-[#A02F6B]" },
  { title: "社媒运营 AI Agent", description: "小红书、抖音、朋友圈、公众号选题", icon: Sparkles, color: "bg-[#FFF3D6]", textColor: "text-[#8C612E]" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

type AccessInfo = {
  success?: boolean;
  aiEnabled: boolean;
  authenticated: boolean;
  isTester: boolean;
  userEmail?: string;
  aiDailyLimitPerUser: number;
  providerConfigured?: boolean;
  accessAllowed?: boolean;
  accessReason?: string | null;
  assistants?: { assistant: string; title?: string; used: number; limit: number; remaining: number }[];
};

export default function EnterpriseAiDashboardPage() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [accessError, setAccessError] = useState("");
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, ChatMessage[]>>({});
  const [sessionIds, setSessionIds] = useState<Record<string, string>>({});
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
    void loadAccess();
  }, [loadAccess]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeAssistant, history, sending]);

  const currentMessages = activeAssistant ? history[activeAssistant] || [] : [];
  const activeConfig = useMemo(() => assistants.find((a) => a.title === activeAssistant), [activeAssistant]);

  async function sendMessage() {
    if (!activeAssistant || !input.trim() || sending) return;

    const message = input.trim();
    const currentHistory = history[activeAssistant] || [];
    const currentSessionId = sessionIds[activeAssistant] || "";

    setInput("");
    setChatError("");
    setSending(true);
    setHistory((prev) => ({
      ...prev,
      [activeAssistant]: [...currentHistory, { role: "user", content: message }],
    }));

    try {
      const response = await fetch("/api/enterprise-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          assistant: activeAssistant,
          message,
          history: currentSessionId ? [] : currentHistory,
          sessionId: currentSessionId || undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        reply?: string;
        error?: string;
        sessionId?: string;
        usage?: { used: number; limit: number; remaining: number };
      };

      if (!response.ok || !data.success) {
        const errorReply = data.error || "AI 服务暂时不可用。";
        setChatError(errorReply);
        setHistory((prev) => ({
          ...prev,
          [activeAssistant]: [...(prev[activeAssistant] || []), { role: "assistant", content: `❌ ${errorReply}` }],
        }));
        return;
      }

      if (data.sessionId) {
        setSessionIds((prev) => ({ ...prev, [activeAssistant]: data.sessionId || "" }));
      }

      setHistory((prev) => ({
        ...prev,
        [activeAssistant]: [...(prev[activeAssistant] || []), { role: "assistant", content: data.reply || "（空回复）" }],
      }));
      if (data.usage) setUsage(data.usage);
    } catch {
      setChatError("网络错误，调用 AI 失败。");
      setHistory((prev) => ({
        ...prev,
        [activeAssistant]: [...(prev[activeAssistant] || []), { role: "assistant", content: "❌ 网络错误，请稍后重试。" }],
      }));
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

  const showClosedBeta = !access.aiEnabled || !access.authenticated || !access.accessAllowed;

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
            {access.authenticated ? `已登录：${access.userEmail}` : "企业 AI 预览"}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">企业 AI 工作台</h1>
          <p className="mt-2 text-sm text-[#7A6D5E]">
            百炼应用接口已接入。状态：{access.aiEnabled ? "已启用" : "未启用"}；配置：{access.providerConfigured ? "已配置" : "未配置"}。
          </p>
        </section>

        {showClosedBeta ? (
          <section className="mt-8 rounded-[32px] border border-[#FFB020]/30 bg-[#FFF7E0] p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#8C612E]">当前账号暂不可使用企业 AI</h2>
            <p className="mt-2 text-sm leading-6 text-[#8C612E]/90">
              {!access.authenticated ? "请先登录。" : access.accessReason || "当前账号没有百炼应用接口权限。"}
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {assistants.map((assistant) => {
                const usageInfo = access.assistants?.find((item) => item.assistant === assistant.title);
                const isActive = activeAssistant === assistant.title;
                return (
                  <button
                    key={assistant.title}
                    type="button"
                    onClick={() => {
                      setActiveAssistant(assistant.title);
                      setChatError("");
                      setUsage(usageInfo ?? null);
                    }}
                    className={`rounded-[28px] border bg-white p-5 text-left shadow-sm transition ${isActive ? "border-[#6F8F4E] ring-2 ring-[#6F8F4E]/20" : "border-[#E8DCCB] hover:-translate-y-0.5"}`}
                  >
                    <div className={`grid size-11 place-items-center rounded-2xl ${assistant.color} ${assistant.textColor}`}>
                      <assistant.icon aria-hidden className="size-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black">{assistant.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{assistant.description}</p>
                    <p className="mt-4 text-xs font-black text-[#3F5F31]">
                      今日：{usageInfo?.used ?? 0}/{usageInfo?.limit ?? access.aiDailyLimitPerUser}，剩余 {usageInfo?.remaining ?? access.aiDailyLimitPerUser}
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
                    <p className="py-10 text-center text-sm font-bold text-[#7A6D5E]">请输入问题，开始咨询 {activeAssistant}。</p>
                  ) : (
                    <div className="grid gap-3">
                      {currentMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${msg.role === "user" ? "bg-[#6F8F4E] text-white" : "border border-[#E8DCCB] bg-white text-[#1A1A1A] shadow-sm"}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
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
                  <p>当前对话只保留本页会话；刷新后会重新开始，避免复用其他用户的 sessionId。</p>
                  {usage ? (
                    <p className="font-bold text-[#3F5F31]">
                      今日用量：{usage.used}/{usage.limit}，剩余 {usage.remaining}
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
