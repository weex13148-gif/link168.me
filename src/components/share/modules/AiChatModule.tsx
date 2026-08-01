"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bot, Copy, ExternalLink, Flag, Loader2, Phone, Send, ShieldAlert, UserRound, X } from "lucide-react";
import type { AiReceptionQuickAction, PublicAiReceptionConfig } from "@/lib/ai/reception-config";
import { PUBLIC_MODULE_SURFACE_STYLE } from "@/components/share/PublicModuleList";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  source?: "preset" | "ai";
};

type Props = {
  username: string;
  mode?: "customer-service" | "sales-agent";
  handoffContactEntryId?: string;
  onAvailabilityChange?: (available: boolean) => void;
  onOpenContact?: () => void;
  onOpenContactEntry?: (contactEntryId?: string) => void;
};

type ChatApiResult = {
  success?: boolean;
  code?: string;
  data?: {
    reply?: string;
    replyKind?: "ai" | "preset";
    action?: { type?: string; contactEntryId?: string };
  };
};

function publicErrorMessage(code?: string) {
  if (code === "AI_DISABLED" || code === "MEMBERSHIP_REQUIRED") {
    return "当前主页暂未开通 AI 接待。";
  }
  if (code === "AI_CREDITS_EXHAUSTED" || code === "AI_QUOTA_EXHAUSTED") {
    return "当前主页的 AI 服务额度已用完。";
  }
  if (code === "PROMPT_INJECTION" || code === "SENSITIVE_CONTENT") {
    return "问题包含平台限制内容，请修改后重试。";
  }
  return "AI 接待暂时不可用，请稍后再试。";
}

function actionIcon(action: AiReceptionQuickAction) {
  if (action.type === "open_url") return <ExternalLink className="size-3.5" />;
  if (action.type === "copy_text") return <Copy className="size-3.5" />;
  if (action.type === "call_phone") return <Phone className="size-3.5" />;
  return <Send className="size-3.5" />;
}

export function AiChatModule({ username, mode = "customer-service", handoffContactEntryId, onAvailabilityChange, onOpenContact, onOpenContactEntry }: Props) {
  const [config, setConfig] = useState<PublicAiReceptionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configUnavailable, setConfigUnavailable] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    setConfigUnavailable(false);
    onAvailabilityChange?.(false);

    fetch(`/api/public/${encodeURIComponent(username)}/ai-reception-config`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { success?: boolean; config?: PublicAiReceptionConfig };
        if (!response.ok || !result.success || !result.config?.enabled) throw new Error("unavailable");
        if (cancelled) return;
        setConfig(result.config);
        onAvailabilityChange?.(true);
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: result.config.welcomeMessage,
          source: "preset",
        }]);
      })
      .catch(() => {
        if (!cancelled) {
          setConfigUnavailable(true);
          onAvailabilityChange?.(false);
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });

    return () => {
      cancelled = true;
      onAvailabilityChange?.(false);
    };
  }, [username, onAvailabilityChange]);

  function scrollToBottom() {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  function appendMessage(
    role: ChatMessage["role"],
    content: string,
    source?: ChatMessage["source"],
  ) {
    setMessages((current) => [...current, { id: makeId(), role, content, source }]);
    window.setTimeout(scrollToBottom, 0);
  }

  async function sendMessage(override?: string) {
    const message = (override ?? input).trim();
    if (!message || loading || !config) return;

    setLoading(true);
    setInput("");
    appendMessage("user", message);

    const requestId = crypto.randomUUID();
    try {
      const response = await fetch(`/api/ai/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ username, message, requestId, handoffContactEntryId }),
      });
      const result = await response.json() as ChatApiResult;
      if (response.ok && result.success && result.data?.reply) {
        const reply = result.data.reply;
        appendMessage("assistant", reply, result.data.replyKind === "preset" ? "preset" : "ai");
        if (result.data.action?.type === "contact") {
          window.setTimeout(() => onOpenContactEntry?.(result.data?.action?.contactEntryId), 0);
        }
      } else {
        appendMessage("system", publicErrorMessage(result.code));
      }
    } catch {
      appendMessage("system", "网络连接失败，请稍后再试。");
    } finally {
      setLoading(false);
      window.setTimeout(scrollToBottom, 0);
    }
  }

  async function handleQuickAction(action: AiReceptionQuickAction) {
    if (action.type === "auto_reply") {
      appendMessage("assistant", action.value, "preset");
      return;
    }
    if (action.type === "send_message") {
      void sendMessage(action.value);
      return;
    }
    if (action.type === "open_url") {
      window.open(action.value, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.type === "copy_text") {
      try {
        await navigator.clipboard.writeText(action.value);
        appendMessage("system", "内容已复制。");
      } catch {
        appendMessage("system", "复制失败，请稍后重试。");
      }
      return;
    }
    if (action.type === "call_phone") {
      window.location.href = `tel:${action.value}`;
    }
  }

  if (configLoading) {
    return (
      <div data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className="flex min-h-28 items-center justify-center rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] text-sm font-bold text-[#7A6D5E]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        正在加载 AI 接待…
      </div>
    );
  }

  if (configUnavailable || !config) {
    return (
      <div data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className="rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] px-4 py-6 text-center">
        <Bot className="mx-auto size-6 text-[#7A6D5E]" />
        <p className="mt-2 text-sm font-black text-[#2B241E]">AI 接待暂未开启</p>
        <p className="mt-1 text-xs text-[#7A6D5E]">你仍可以使用主页上的其他联系方式。</p>
        <button type="button" onClick={() => onOpenContact?.()} className="mt-4 min-h-10 rounded-xl px-4 text-sm font-black text-[#4F6D37] hover:bg-[#F5F0E8]">
          联系本人
        </button>
      </div>
    );
  }

  return (
    <div data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className="w-full overflow-hidden rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E8DCCB] bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EEF4E7] text-[#4F6D37]">
            <Bot aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#2B241E]">{config.assistantName}</p>
            <p className="text-[11px] font-bold text-[#7A6D5E]">AI 生成内容 · 仅供参考</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowPrivacy((value) => !value)} className="grid size-8 place-items-center rounded-lg text-[#7A6D5E] hover:bg-[#F5F0E8]" aria-label="隐私提示">
            <ShieldAlert aria-hidden className="size-4" />
          </button>
          {config.allowReport ? (
            <button type="button" onClick={() => setShowReport((value) => !value)} className="grid size-8 place-items-center rounded-lg text-[#7A6D5E] hover:bg-[#F5F0E8]" aria-label="举报">
              <Flag aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {showPrivacy ? (
        <NoticePanel title="隐私提示" onClose={() => setShowPrivacy(false)}>
          {config.privacyNoticeText || "本对话由 AI 自动回复。请勿发送身份证号、银行卡号、密码等敏感信息。"}
        </NoticePanel>
      ) : null}

      {showReport && config.allowReport ? (
        <NoticePanel title="举报此内容" onClose={() => setShowReport(false)} danger>
          如发现 AI 回复有违规内容，请发送邮件至 report@link168.me，并说明主页和问题内容。
        </NoticePanel>
      ) : null}

      <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"} ${message.role === "system" ? "justify-center" : ""}`}>
            {message.role === "assistant" ? <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF4E7] text-[#4F6D37]"><Bot className="size-4" /></span> : null}
            {message.role === "system" ? (
              <div className="max-w-[90%] rounded-xl border border-dashed border-[#DDE8CD] bg-[#EEF4E7]/60 px-3 py-2 text-xs leading-5 text-[#3F5F31]">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-[#6F8F4E] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"}`}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {message.role === "assistant" ? (
                  <p className="mt-1 text-[10px] font-bold text-[#B0A090]">
                    {message.source === "preset" ? "— 预设回复" : "— AI 生成内容"}
                  </p>
                ) : null}
              </div>
            )}
            {message.role === "user" ? <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#F2E7D8] text-[#7A6D5E]"><UserRound className="size-4" /></span> : null}
          </div>
        ))}
        {loading ? <div className="flex items-center gap-2 text-xs font-bold text-[#7A6D5E]"><Loader2 className="size-4 animate-spin" />AI 正在整理回复…</div> : null}
      </div>

      {config.quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-[#E8DCCB] bg-[#FFFDF8] px-3 py-3">
          {config.quickActions.map((action) => (
            <button key={action.id} type="button" onClick={() => void handleQuickAction(action)} disabled={loading} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DDE8CD] bg-white px-3 text-xs font-black text-[#3F5F31] transition hover:bg-[#EEF4E7] disabled:opacity-40">
              {actionIcon(action)}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-[#E8DCCB] bg-white p-3">
        <div className="flex gap-2">
          <input
            aria-label="AI 咨询问题"
            data-ai-reception-input={username}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            maxLength={1000}
            placeholder="请输入你想了解的问题"
            className="min-w-0 flex-1 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2.5 text-sm outline-none focus:border-[#6F8F4E]"
          />
          <button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || loading} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#6F8F4E] text-white disabled:opacity-40" aria-label="发送">
            <Send className="size-4" />
          </button>
        </div>
        <button type="button" onClick={() => onOpenContact?.()} className="mt-2 flex w-full items-center justify-center rounded-xl py-2 text-xs font-black text-[#4F6D37]">
          联系本人
        </button>
        <p className="mt-2 text-[10px] font-bold text-[#B0A090]">AI 生成内容 · 请自行核实重要信息</p>
      </div>
    </div>
  );
}

function NoticePanel({ title, onClose, danger = false, children }: {
  title: string;
  onClose: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`border-b px-4 py-3 text-xs leading-5 ${danger ? "border-[#F0C7C2] bg-[#FFF1F0] text-[#B42318]" : "border-[#DDE8CD] bg-[#EEF4E7] text-[#3F5F31]"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold">{title}</p>
        <button type="button" onClick={onClose} className="grid size-5 shrink-0 place-items-center rounded" aria-label="关闭"><X aria-hidden className="size-3.5" /></button>
      </div>
      <p className="mt-1">{children}</p>
    </div>
  );
}
