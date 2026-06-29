"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  Link2,
  LoaderCircle,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  success?: boolean;
  reply?: string;
  error?: string;
  usage?: { used: number; limit: number; remaining: number };
};

const starterQuestions = [
  "帮我设计一个适合个人创业者的获客主页",
  "我是一家本地门店，怎么用二维码承接客户？",
  "帮我把一个产品介绍整理成清晰的成交路径",
];

const productSteps = [
  {
    title: "创建数字主页",
    text: "把内容、商品、服务和联系方式集中到一个专属地址。",
    icon: UserRound,
  },
  {
    title: "生成链接与二维码",
    text: "线上可以分享链接，线下可以打印二维码，统一承接流量。",
    icon: QrCode,
  },
  {
    title: "用 AI 辅助经营",
    text: "让 AI 帮你梳理内容、客户路径和下一步行动。",
    icon: Sparkles,
  },
  {
    title: "持续查看数据",
    text: "通过访问与点击数据，逐步优化主页和转化路径。",
    icon: BarChart3,
  },
];

const capabilityCards = [
  {
    title: "一个入口",
    text: "解决内容、商品、联系方式分散的问题。",
    icon: Link2,
  },
  {
    title: "一个对话",
    text: "让复杂的经营问题变成可以执行的下一步。",
    icon: MessageCircle,
  },
  {
    title: "一条路径",
    text: "从被看见、被了解，到被联系与持续经营。",
    icon: Target,
  },
];

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "rounded-br-md bg-[#182016] text-white"
            : "rounded-bl-md border border-[#DDE4D8] bg-white text-[#273025]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是 Link168 AI 经营助手。你可以告诉我你的行业、产品或当前遇到的问题，我会帮你整理成清楚的行动方案。",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    const history = messages.slice(-12);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await fetch("/api/showcase/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        cache: "no-store",
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.success) {
        const messageText = data.error || "聊天服务暂时不可用，请稍后重试。";
        setError(messageText);
        setMessages((current) => [...current, { role: "assistant", content: messageText }]);
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply || "我已经收到你的问题，请再补充一些细节。" },
      ]);
      if (data.usage) setUsage(data.usage);
    } catch {
      const messageText = "网络连接失败，请检查服务器状态后重试。";
      setError(messageText);
      setMessages((current) => [...current, { role: "assistant", content: messageText }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#F4F6F1] text-[#182016]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(187,208,174,0.50),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(233,238,226,0.95),transparent_30%)]" />

      <header className="sticky top-0 z-40 border-b border-[#DDE4D8]/80 bg-[#F8FAF6]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" aria-label="返回首页">
            <BrandLogo size="header" className="!w-[132px] sm:!w-[150px]" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#C9D7C1] bg-white px-4 py-2 text-xs font-black text-[#4E6942] sm:inline-flex">
              TRAE 创业比赛 · 审核演示
            </span>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#D6DED1] bg-white px-4 text-sm font-black text-[#33412F] transition hover:-translate-y-0.5"
            >
              <ArrowLeft className="size-4" />
              返回首页
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9D7C1] bg-white/90 px-4 py-2 text-sm font-black text-[#4E6942] shadow-sm">
              <Sparkles className="size-4" />
              聚焦公域与私域之间的最后 500 米
            </div>
            <h1 className="mt-6 max-w-4xl text-[42px] font-black leading-[1.03] tracking-[-0.05em] sm:text-[64px] lg:text-[76px]">
              一个链接承接客户，
              <span className="text-[#587744]">一个 AI 帮你继续经营</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#63705F] sm:text-lg">
              Link168 面向内容创作者、小商家、自由职业者和一人公司，把数字主页、二维码、数据与 AI 经营助手组合成一条更短、更清楚的客户转化路径。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#live-chat"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-[#182016] px-7 font-black text-white shadow-[0_18px_45px_rgba(24,32,22,0.20)] transition hover:-translate-y-0.5"
              >
                体验 AI 对话
                <ArrowRight className="size-5" />
              </a>
              <a
                href="#product-path"
                className="inline-flex min-h-14 items-center gap-2 rounded-full border border-[#C9D7C1] bg-white px-7 font-black text-[#33412F] transition hover:-translate-y-0.5"
              >
                查看产品路径
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["无需代码即可创建", "链接与二维码统一承接", "手机端随时使用"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-[#DDE4D8] bg-white/80 px-4 py-3 text-sm font-bold text-[#4C5849]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#E1EBDD] text-[#4E6942]">
                    <Check className="size-4" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="live-chat" className="relative scroll-mt-24">
            <div className="absolute inset-x-8 top-10 -z-10 h-[76%] rounded-full bg-[#D6E5CE] blur-3xl" />
            <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[36px] border-[8px] border-[#182016] bg-[#182016] shadow-[0_32px_90px_rgba(24,32,22,0.25)]">
              <div className="flex h-[690px] flex-col overflow-hidden rounded-[28px] bg-[#F7F9F5] sm:h-[720px]">
                <div className="flex items-center justify-between border-b border-[#E1E7DD] bg-white px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#DCE9D5] text-[#4E6942]">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black">Link168 AI 经营助手</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-[#7B8678]">
                        <span className="size-2 rounded-full bg-[#6F9A59]" />
                        在线 · 中文对话
                      </p>
                    </div>
                  </div>
                  <ShieldCheck className="size-5 text-[#6B7D65]" />
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
                  {messages.map((message, index) => (
                    <ChatBubble key={`${message.role}-${index}`} message={message} />
                  ))}
                  {sending ? (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-[20px] rounded-bl-md border border-[#DDE4D8] bg-white px-4 py-3 text-sm font-bold text-[#677164] shadow-sm">
                        <LoaderCircle className="size-4 animate-spin" />
                        正在思考你的问题…
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-[#E1E7DD] bg-white p-3">
                  {messages.length <= 2 ? (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {starterQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => void sendMessage(question)}
                          className="shrink-0 rounded-full border border-[#D6DED1] bg-[#F7F9F5] px-3 py-2 text-left text-xs font-bold text-[#536050]"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2 rounded-[22px] border border-[#D6DED1] bg-[#F7F9F5] p-2">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      maxLength={3000}
                      placeholder="输入你的经营问题…"
                      className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-[#9AA397]"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!input.trim() || sending}
                      aria-label="发送消息"
                      className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#182016] text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {sending ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-semibold text-[#91998E]">
                    <span>{error ? "连接状态异常" : "内容仅供经营参考"}</span>
                    {usage ? <span>今日剩余 {usage.remaining} 次</span> : <span>Enter 发送 · Shift+Enter 换行</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product-path" className="scroll-mt-24 border-y border-[#DDE4D8] bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black tracking-[0.16em] text-[#587744]">产品闭环</p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              从第一次被看见，到持续经营客户
            </h2>
            <p className="mt-4 text-base leading-8 text-[#687365]">
              Link168 不是单纯的链接工具，而是一套从展示、传播、沟通到优化的轻量经营基础设施。
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {productSteps.map(({ title, text, icon: Icon }, index) => (
              <article key={title} className="group rounded-[28px] border border-[#DDE4D8] bg-[#F7F9F5] p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#96A091]">0{index + 1}</span>
                  <span className="grid size-12 place-items-center rounded-2xl bg-white text-[#587744] shadow-sm">
                    <Icon className="size-6" />
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#687365]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-3">
            {capabilityCards.map(({ title, text, icon: Icon }) => (
              <article key={title} className="rounded-[30px] border border-[#DDE4D8] bg-white p-7 shadow-[0_20px_60px_rgba(24,32,22,0.06)]">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#E3ECDf] text-[#4E6942]">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-8 text-2xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#687365]">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[34px] bg-[#182016] px-7 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-14">
            <div>
              <p className="text-sm font-black text-[#BBD0AE]">Link168 的核心判断</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">
                AI 不应该只是聊天框，而应该嵌入真实经营路径
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                先把客户入口整理清楚，再让 AI 帮用户完成内容、沟通和决策辅助，最终回到真实的数据与客户关系中。
              </p>
            </div>
            <a
              href="#live-chat"
              className="mt-8 inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full bg-[#BBD0AE] px-7 font-black text-[#182016] transition hover:-translate-y-0.5 lg:mt-0"
            >
              返回聊天体验
              <ArrowUp className="size-5" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DDE4D8] bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#697466] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandLogo size="footer" />
            <p className="mt-2 text-xs">合肥造梦哈勃文化传媒有限公司 · 2026</p>
          </div>
          <div className="flex flex-wrap gap-5 font-bold">
            <Link href="/terms">用户协议</Link>
            <Link href="/privacy">隐私政策</Link>
            <Link href="/report">举报中心</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
