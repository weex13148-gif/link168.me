"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, UserRound, X } from "lucide-react";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type AgentMode = "customer-service" | "sales-agent";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: { type?: string; label?: string; url?: string; productId?: string };
};

type AgentResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  data?: {
    reply?: string;
    conversationId?: string;
    visitorSessionId?: string;
    action?: { type?: string; label?: string; url?: string; productId?: string };
    leadCaptured?: boolean;
  };
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createVisitorSessionId(username: string) {
  const key = `link168_ai_visitor_${username}`;
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : makeId();
    window.sessionStorage.setItem(key, generated);
    return generated;
  } catch {
    return makeId();
  }
}

export function PublicAiAssistant({
  username,
  displayName,
  onOpenContact,
}: {
  username: string;
  displayName: string;
  onOpenContact: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AgentMode>("customer-service");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [visitorSessionId, setVisitorSessionId] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `你好，我是 ${displayName || `@${username}`} 的 AI 接待。你可以咨询业务、产品或合作方式。`,
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisitorSessionId(createVisitorSessionId(username));
    const timer = window.setTimeout(() => setShowHint(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const endpoint = useMemo(() => `/api/ai/${mode}`, [mode]);

  async function sendMessage(override?: string) {
    const message = (override ?? input).trim();
    if (!message || loading) return;

    setLoading(true);
    setInput("");
    setMessages((current) => [...current, { id: makeId(), role: "user", content: message }]);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          username,
          message,
          visitorSessionId,
          conversationId: conversationId || undefined,
        }),
      });
      const result = await response.json() as AgentResponse;
      if (!response.ok || !result.success || !result.data?.reply) {
        const fallback = result.code === "MEMBERSHIP_REQUIRED" || result.code === "AI_DISABLED"
          ? "该主页暂未开通 AI 接待，你可以直接留下联系方式。"
          : result.error || "AI 接待暂时不可用，请稍后再试。";
        setMessages((current) => [...current, { id: makeId(), role: "assistant", content: fallback }]);
        return;
      }

      if (result.data.conversationId) setConversationId(result.data.conversationId);
      if (result.data.visitorSessionId) setVisitorSessionId(result.data.visitorSessionId);
      setMessages((current) => [...current, {
        id: makeId(),
        role: "assistant",
        content: result.data?.reply || "",
        action: result.data?.action,
      }]);
    } catch {
      setMessages((current) => [...current, { id: makeId(), role: "assistant", content: "网络连接失败，请稍后再试。" }]);
    } finally {
      setLoading(false);
    }
  }

  function renderAction(action: ChatMessage["action"]) {
    if (!action?.label) return null;
    if (action.url) {
      const checked = sanitizePublicUrl(action.url);
      if (checked.safe) {
        return <a href={checked.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white">{action.label}</a>;
      }
    }
    return <button type="button" onClick={onOpenContact} className="mt-2 inline-flex min-h-9 items-center rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white">{action.label}</button>;
  }

  return (
    <>
      {!open && showHint ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setShowHint(false); }}
          className="fixed bottom-24 right-5 z-40 max-w-[230px] rounded-2xl border border-[#DCE7D1] bg-white px-4 py-3 text-left text-sm font-bold text-[#355126] shadow-lg"
        >
          有问题可以问 AI 接待，也可以直接留下联系方式。
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => { setOpen((current) => !current); setShowHint(false); }}
        className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-[#6F8F4E] text-white shadow-xl transition hover:bg-[#5E7F3F]"
        aria-label={open ? "关闭 AI 接待" : "打开 AI 接待"}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>

      {open ? (
        <section className="fixed bottom-24 right-4 z-50 flex h-[min(620px,72vh)] w-[calc(100vw-32px)] max-w-sm flex-col overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-[#FFFDF8] shadow-[0_24px_80px_rgba(43,36,30,0.24)]" aria-label="AI 接待窗口">
          <header className="border-b border-[#E8DCCB] bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#EEF4E7] text-[#4F6D37]"><Bot className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-black text-[#2B241E]">AI 接待 · {displayName}</p><p className="text-xs text-[#7A6D5E]">AI 生成内容仅供参考</p></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F5F0E8] p-1">
              <button type="button" onClick={() => setMode("customer-service")} className={`min-h-9 rounded-lg text-xs font-black ${mode === "customer-service" ? "bg-white text-[#355126] shadow-sm" : "text-[#7A6D5E]"}`}>业务客服</button>
              <button type="button" onClick={() => setMode("sales-agent")} className={`min-h-9 rounded-lg text-xs font-black ${mode === "sales-agent" ? "bg-white text-[#355126] shadow-sm" : "text-[#7A6D5E]"}`}>产品咨询</button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" ? <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF4E7] text-[#4F6D37]"><Bot className="size-4" /></span> : null}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-[#6F8F4E] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" ? renderAction(message.action) : null}
                </div>
                {message.role === "user" ? <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#F2E7D8] text-[#7A6D5E]"><UserRound className="size-4" /></span> : null}
              </div>
            ))}
            {loading ? <div className="flex items-center gap-2 text-xs font-bold text-[#7A6D5E]"><Loader2 className="size-4 animate-spin" />AI 正在整理回复…</div> : null}
          </div>

          <footer className="border-t border-[#E8DCCB] bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                maxLength={4000}
                placeholder={mode === "sales-agent" ? "咨询产品、价格或合作方式" : "请输入你想了解的问题"}
                className="min-w-0 flex-1 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2.5 text-sm outline-none focus:border-[#6F8F4E]"
              />
              <button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || loading} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#6F8F4E] text-white disabled:opacity-40" aria-label="发送"><Send className="size-4" /></button>
            </div>
            <button type="button" onClick={onOpenContact} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-black text-[#4F6D37]"><MessageCircle className="size-4" />转人工或留下联系方式</button>
          </footer>
        </section>
      ) : null}
    </>
  );
}
