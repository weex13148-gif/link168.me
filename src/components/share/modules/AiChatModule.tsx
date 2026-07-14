"use client";

import { useRef, useState } from "react";
import { Bot, Send, UserRound, Loader2, MessageCircle, Flag, ShieldAlert, X, UserCheck } from "lucide-react";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
};

type Props = {
  assistantName?: string;
  welcomeText?: string;
  username: string;
  mode?: "customer-service" | "sales-agent";
};

export function AiChatModule({
  assistantName = "AI 接待",
  welcomeText = "你好，有什么可以帮你的？",
  username,
  mode = "customer-service",
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [transferredToHuman, setTransferredToHuman] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: welcomeText },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }

  async function sendMessage(override?: string) {
    const message = (override ?? input).trim();
    if (!message || loading) return;

    setLoading(true);
    setInput("");
    const userMsg: ChatMessage = { id: makeId(), role: "user", content: message };
    setMessages((current) => [...current, userMsg]);

    setTimeout(scrollToBottom, 0);

    // 生成稳定的 requestId 用于幂等
    const requestId = crypto.randomUUID();

    try {
      const response = await fetch(`/api/ai/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          username,
          message,
          requestId,
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string; code?: string; data?: { reply?: string } };

      let reply = "AI 接待暂时不可用，请稍后再试。";
      if (response.ok && result.success && result.data?.reply) {
        reply = result.data.reply;
      } else if (result.code === "MEMBERSHIP_REQUIRED" || result.code === "AI_DISABLED") {
        reply = "该主页当前关闭 AI 接待，你可以直接留下联系方式。";
      } else if (result.error) {
        reply = result.error;
      }

      const aiMsg: ChatMessage = { id: makeId(), role: "assistant", content: reply };
      setMessages((current) => [...current, aiMsg]);
    } catch {
      setMessages((current) => [...current, {
        id: makeId(),
        role: "assistant",
        content: "网络连接失败，请稍后再试。",
      }]);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 0);
    }
  }

  function handleTransferToHuman() {
    if (transferredToHuman) return;
    setTransferredToHuman(true);
    setMessages((current) => [...current, {
      id: makeId(),
      role: "system",
      content: "已切换至留资模式。请留下你的问题或联系方式，主页主人查看后会尽快通过你留下的方式回复。",
    }]);
    setTimeout(scrollToBottom, 0);
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E8DCCB] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EEF4E7] text-[#4F6D37]">
            {transferredToHuman ? <UserCheck aria-hidden className="size-5" /> : <Bot aria-hidden className="size-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#2B241E]">
              {transferredToHuman ? "留资模式" : assistantName}
            </p>
            <p className="text-[11px] font-bold text-[#7A6D5E]">
              {transferredToHuman ? "留言后由主页主人查看" : "AI 生成内容 · 仅供参考"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowPrivacy((v) => !v)}
            className="grid size-8 place-items-center rounded-lg text-[#7A6D5E] hover:bg-[#F5F0E8]"
            aria-label="隐私提示"
          >
            <ShieldAlert aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            className="grid size-8 place-items-center rounded-lg text-[#7A6D5E] hover:bg-[#F5F0E8]"
            aria-label="举报"
          >
            <Flag aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {showPrivacy ? (
        <div className="border-b border-[#E8DCCB] bg-[#EEF4E7] px-4 py-3 text-xs leading-5 text-[#3F5F31]">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">隐私提示</p>
            <button
              type="button"
              onClick={() => setShowPrivacy(false)}
              className="grid size-5 shrink-0 place-items-center rounded"
              aria-label="关闭"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
          <p className="mt-1">
            为了提供 AI 接待服务，你的对话内容会被记录用于服务改进。
            我们会依法保护你的个人信息，不会用于其他目的。
            如需人工服务，请点击下方「转人工」按钮。
          </p>
        </div>
      ) : null}

      {showReport ? (
        <div className="border-b border-[#E8DCCB] bg-[#FFF1F0] px-4 py-3 text-xs leading-5 text-[#B42318]">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">举报此内容</p>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="grid size-5 shrink-0 place-items-center rounded"
              aria-label="关闭"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
          <p className="mt-1">
            如发现 AI 回复有违规内容，请发送邮件至 report@link168.me 举报，
            我们会在 24 小时内处理。
          </p>
        </div>
      ) : null}

      <div
        ref={listRef}
        className="max-h-80 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"} ${message.role === "system" ? "justify-center" : ""}`}
          >
            {message.role === "assistant" ? (
              <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF4E7] text-[#4F6D37]">
                <Bot className="size-4" />
              </span>
            ) : null}
            {message.role === "system" ? (
              <div className="max-w-[90%] rounded-xl border border-dashed border-[#DDE8CD] bg-[#EEF4E7]/60 px-3 py-2 text-xs leading-5 text-[#3F5F31]">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[#6F8F4E] text-white"
                    : "border border-[#E8DCCB] bg-white text-[#2B241E]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {message.role === "assistant" ? (
                  <p className="mt-1 text-[10px] font-bold text-[#B0A090]">— AI 生成内容</p>
                ) : null}
              </div>
            )}
            {message.role === "user" ? (
              <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-[#F2E7D8] text-[#7A6D5E]">
                <UserRound className="size-4" />
              </span>
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 text-xs font-bold text-[#7A6D5E]">
            <Loader2 className="size-4 animate-spin" />
            AI 正在整理回复…
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#E8DCCB] bg-white p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            maxLength={1000}
            placeholder={transferredToHuman ? "请留下你的问题或联系方式…" : "请输入你想了解的问题"}
            className="min-w-0 flex-1 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2.5 text-sm outline-none focus:border-[#6F8F4E]"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || loading}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#6F8F4E] text-white disabled:opacity-40"
            aria-label="发送"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#B0A090]">
            {transferredToHuman ? "留资模式 · 留言后等待主人查看" : "AI 生成内容 · 请自行核实重要信息"}
          </p>
          <button
            type="button"
            onClick={handleTransferToHuman}
            disabled={transferredToHuman}
            className={`flex items-center gap-1 text-[11px] font-black ${transferredToHuman ? "cursor-not-allowed text-[#B0A090]" : "text-[#4F6D37] hover:underline"}`}
            aria-label={transferredToHuman ? "已切换到留资模式" : "切换到留资模式"}
          >
            <MessageCircle className="size-3.5" />
            {transferredToHuman ? "留资模式" : "转人工"}
          </button>
        </div>
      </div>
    </div>
  );
}
