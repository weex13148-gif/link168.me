"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Loader2,
  AlertTriangle,
  Sparkles,
  Crown,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured?: {
    summary?: string;
    suggestions?: string[];
    content?: string;
    disclaimer?: string;
  };
  timestamp?: string;
  isError?: boolean;
  creditCost?: number;
};

type Conversation = {
  id: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    content: string;
    role: string;
    createdAt: string;
  }>;
};

type QuotaInfo = {
  access: "none" | "preview" | "full";
  planCode: string;
  isActiveMember: boolean;
  planUsage: { used: number; limit: number; remaining: number; percent: number | null };
  dailyUsage: { used: number; limit: number; remaining: number };
  creditBalance: number;
  canCall: boolean;
  reason?: string;
};

type AiChatClientProps = {
  assistant: string;
  assistantTitle: string;
  assistantColor: string;
  accessLevel: "none" | "preview" | "full";
  accessReason?: string;
  initialConversations?: Conversation[];
  quota?: QuotaInfo;
};

export default function AiChatClient({
  assistant,
  assistantTitle,
  assistantColor,
  accessLevel,
  accessReason,
  initialConversations = [],
  quota,
}: AiChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [showConversations, setShowConversations] = useState(false);
  const [isMobileConversationsOpen, setIsMobileConversationsOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleCopyMessage(messageId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // 复制失败时静默
    }
  }

  const suggestedQuestions = getSuggestedQuestions(assistant);

  // 加载指定会话的消息
  async function loadConversation(convId: string) {
    if (!convId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workbench/ai/conversations/${convId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.conversation) {
        setConversationId(convId);
        const loadedMessages: ChatMessage[] = data.conversation.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          creditCost: m.creditCost,
        }));
        setMessages(loadedMessages);
      } else {
        setError("加载会话失败");
      }
    } catch {
      setError("网络错误，无法加载会话");
    } finally {
      setIsLoading(false);
    }
  }

  // 创建新会话
  function startNewConversation() {
    setConversationId("");
    setMessages([]);
    setError(null);
    setShowConversations(false);
    setIsMobileConversationsOpen(false);
  }

  // 删除会话
  async function deleteConversation(convId: string) {
    if (!window.confirm("确定要删除这个会话吗？")) return;
    try {
      const res = await fetch(`/api/workbench/ai/conversations/${convId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (conversationId === convId) {
          startNewConversation();
        }
      } else {
        setError("删除失败");
      }
    } catch {
      setError("网络错误");
    }
  }

  // 刷新会话列表
  async function refreshConversations() {
    try {
      const res = await fetch(`/api/workbench/ai/conversations?assistant=${assistant}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
      }
    } catch {
      // ignore
    }
  }

  async function handleSend(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text || isLoading) return;
    if (accessLevel !== "full") return;

    setError(null);
    setInput("");
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/workbench/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant,
          message: text,
          conversationId: conversationId || undefined,
          history,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: data.error || "请求失败，请稍后重试。",
          isError: true,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setError(data.error || "请求失败");
        setIsLoading(false);
        return;
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        await refreshConversations();
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        structured: data.structured,
        timestamp: new Date().toISOString(),
        creditCost: data.creditCost,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 更新配额显示
      if (data.quota) {
        // 配额信息由服务端返回，前端仅展示，不修改 quota prop
      }
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "网络错误，请检查连接后重试。",
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError("网络错误");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
    }
  };

  const quotaDisplay = useMemo(() => {
    if (!quota) return null;
    return {
      planUsage: quota.planUsage,
      dailyUsage: quota.dailyUsage,
      creditBalance: quota.creditBalance,
      canCall: quota.canCall,
      reason: quota.reason,
    };
  }, [quota]);

  if (accessLevel === "none") {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center">
        <AlertTriangle className="mb-4 size-12 text-[#B42318]" />
        <h3 className="text-xl font-black text-[#2B241E]">AI 服务尚未配置</h3>
        <p className="mt-2 max-w-md text-sm text-[#7A6D5E]">
          {accessReason || "管理员尚未配置 AI 服务，请稍后再试或联系客服。"}
        </p>
      </div>
    );
  }

  if (accessLevel === "preview") {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#E8DCCB] bg-white p-8 text-center sm:p-12">
        <div className={`mb-4 grid size-16 place-items-center rounded-3xl ${assistantColor}`}>
          <Sparkles className="size-7 text-white" />
        </div>
        <h3 className="text-xl font-black text-[#2B241E]">{assistantTitle}</h3>
        <p className="mt-2 max-w-md text-sm text-[#7A6D5E]">
          {accessReason || "升级会员即可解锁全部 AI 助手能力。"}
        </p>
        <div className="mt-6 grid w-full max-w-sm gap-3 text-left">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm text-[#3F5F31]"
            >
              <span className="font-black">示例 {i + 1}：</span>
              {q}
            </div>
          ))}
        </div>
        <Link
          href="/workbench/membership"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#8C612E] px-6 text-sm font-black text-white hover:bg-[#6F4F24]"
        >
          <Crown className="size-4" />
          升级会员解锁 AI
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      {/* 主聊天区域 */}
      <div className="flex flex-col rounded-[28px] border border-[#E8DCCB] bg-white shadow-sm">
        {/* 顶部：会话切换（移动端） */}
        <div className="flex items-center justify-between border-b border-[#E8DCCB] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileConversationsOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-black text-[#2B241E]"
          >
            <MessageSquare className="size-4" />
            {conversationId ? "当前会话" : "新会话"}
            {isMobileConversationsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1.5 rounded-full border border-[#E8DCCB] px-3 py-1.5 text-xs font-black text-[#2B241E]"
          >
            <Plus className="size-3.5" />
            新会话
          </button>
        </div>

        {/* 移动端会话列表 */}
        {isMobileConversationsOpen && (
          <div className="border-b border-[#E8DCCB] bg-[#F7F1E7] p-3 lg:hidden">
            <div className="grid max-h-[40vh] gap-2 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-[#7A6D5E]">暂无历史会话</p>
              ) : (
                conversations.slice(0, 10).map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                      conv.id === conversationId ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-white text-[#2B241E]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        void loadConversation(conv.id);
                        setIsMobileConversationsOpen(false);
                      }}
                      className="flex-1 truncate text-left"
                    >
                      {conv.messages[0]?.content?.slice(0, 30) || "空会话"}
                    </button>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-[#7A6D5E]">{formatDate(conv.updatedAt)}</span>
                      <button
                        type="button"
                        onClick={() => void deleteConversation(conv.id)}
                        className="grid size-6 place-items-center rounded-full text-[#B42318] hover:bg-[#FFE6E2]"
                        aria-label="删除会话"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[300px] max-h-[calc(100dvh-300px)]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className={`mb-4 grid size-16 place-items-center rounded-3xl ${assistantColor}`}>
                <Sparkles className="size-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-[#2B241E]">你好，我是{assistantTitle}</h3>
              <p className="mt-2 max-w-md text-sm text-[#7A6D5E]">
                有什么可以帮你的？试试下面的问题，或直接输入你的问题。
              </p>
              <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void handleSend(q)}
                    className="rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-left text-sm text-[#3F5F31] transition hover:bg-white hover:shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-[#2B241E] text-white"
                        : msg.isError
                        ? "bg-[#FFE6E2] text-[#B42318]"
                        : "bg-[#F7F1E7] text-[#2B241E]"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed select-text">{msg.content}</div>
                    {msg.creditCost && msg.creditCost > 0 ? (
                      <p className="mt-2 text-[10px] text-[#7A6D5E]">消耗 {msg.creditCost} 额度</p>
                    ) : null}
                    {!msg.isError && msg.role === "assistant" && msg.content ? (
                      <button
                        type="button"
                        onClick={() => void handleCopyMessage(msg.id, msg.content)}
                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black text-[#7A6D5E] opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                        aria-label="复制内容"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="size-3 text-[#3F5F31]" />
                            <span className="text-[#3F5F31]">已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            复制
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm text-[#7A6D5E]">
                    <Loader2 className="size-4 animate-spin" />
                    正在生成回答...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-[#E8DCCB] p-3 sm:p-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {error && (
            <div className="mb-2 rounded-xl bg-[#FFE6E2] px-3 py-2 text-xs text-[#B42318]">
              {error}
            </div>
          )}
          {quotaDisplay && !quotaDisplay.canCall && (
            <div className="mb-2 rounded-xl bg-[#F6E7C8] px-3 py-2 text-xs text-[#8C612E]">
              {quotaDisplay.reason || "额度已用完。"}
              <Link href="/workbench/membership" className="ml-1 underline font-black">
                升级套餐
              </Link>
              或
              <Link href="/workbench/membership" className="underline font-black">
                购买加油包
              </Link>
              补充额度。
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              rows={1}
              maxLength={4000}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#2B241E] placeholder-[#7A6D5E] focus:outline-none"
              disabled={Boolean(isLoading || (quotaDisplay && !quotaDisplay.canCall))}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={Boolean(isLoading || !input.trim() || (quotaDisplay && !quotaDisplay.canCall))}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2B241E] text-white transition hover:bg-[#1a1612] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-[#7A6D5E]">
              AI 生成内容仅供参考，不构成专业意见。
            </p>
            <p className="text-[10px] text-[#7A6D5E]">
              Enter 发送 · Shift+Enter 换行
            </p>
          </div>
        </div>
      </div>

      {/* 右侧：历史会话列表（桌面端） */}
      <aside className="hidden lg:grid gap-3">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-[#3F5F31]">历史会话</p>
            <button
              type="button"
              onClick={startNewConversation}
              className="flex items-center gap-1.5 rounded-full border border-[#E8DCCB] px-2.5 py-1.5 text-xs font-black text-[#2B241E] hover:bg-[#F7F1E7]"
            >
              <Plus className="size-3.5" />
              新会话
            </button>
          </div>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-[#7A6D5E]">暂无历史会话</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${
                    conv.id === conversationId ? "bg-[#DDE8CD]" : "bg-[#F7F1E7] hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void loadConversation(conv.id)}
                    className="flex-1 truncate text-left text-xs font-bold text-[#2B241E]"
                  >
                    {conv.messages[0]?.content?.slice(0, 40) || "空会话"}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#7A6D5E]">{formatDate(conv.updatedAt)}</span>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(conv.id)}
                      className="grid size-6 place-items-center rounded-full text-[#B42318] hover:bg-[#FFE6E2]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 配额信息 */}
        {quotaDisplay && (
          <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-[#3F5F31]">当前配额</p>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6D5E]">套餐月度</span>
                <span className="font-black text-[#2B241E]">
                  {quotaDisplay.planUsage.limit === -1
                    ? "∞"
                    : `${quotaDisplay.planUsage.remaining}/${quotaDisplay.planUsage.limit}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6D5E]">今日已用</span>
                <span className="font-black text-[#2B241E]">
                  {quotaDisplay.dailyUsage.used}/{quotaDisplay.dailyUsage.limit === -1 ? "∞" : quotaDisplay.dailyUsage.limit}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A6D5E]">额外 Credit</span>
                <span className="font-black text-[#2B241E]">{quotaDisplay.creditBalance}</span>
              </div>
            </div>
            <Link
              href="/workbench/membership"
              className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#F7F1E7] px-3 text-xs font-black text-[#8C612E] hover:bg-[#EDE4D3]"
            >
              <CreditCard className="size-3" />
              查看套餐详情
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function getSuggestedQuestions(assistant: string): string[] {
  // assistant 可能是中文 title（如"财税助理"）或英文 key（如"tax"），兼容两种
  if (assistant === "tax" || assistant.includes("财税")) {
    return [
      "个体户季度开票30万，需要交哪些税？",
      "公司成本票不足怎么办？有哪些合规的成本项？",
      "小规模纳税人怎么开票最划算？",
      "年度汇算清缴需要准备哪些资料？",
    ];
  }
  if (assistant === "legal" || assistant.includes("法务")) {
    return [
      "签服务合同要注意哪些核心条款？",
      "保密协议应该包含哪些内容？",
      "用户隐私政策怎么写才合规？",
      "对方违约了怎么办？怎么保留证据？",
    ];
  }
  if (assistant === "market" || assistant.includes("市场")) {
    return [
      "开一家咖啡店怎么做市场调研？",
      "我的目标用户画像是什么？",
      "新产品怎么定价比较合理？",
      "线下门店怎么获客最有效？",
    ];
  }
  if (assistant === "design" || assistant.includes("设计")) {
    return [
      "个人品牌怎么选主色调？",
      "小红书封面图怎么设计更吸引人？",
      "海报排版有哪些基本技巧？",
      "Logo 设计要注意哪些版权问题？",
    ];
  }
  if (assistant === "social" || assistant.includes("社媒")) {
    return [
      "小红书爆款标题怎么写？给我10个例子",
      "新手做抖音前3条视频拍什么？",
      "公众号涨粉有哪些实用方法？",
      "朋友圈文案怎么写更有转化？",
    ];
  }
  if (assistant === "sales" || assistant.includes("销售")) {
    return [
      "客户说太贵了，怎么回应才能推进成交？",
      "新品上市怎么设计首发话术和跟进节奏？",
      "客户犹豫不决，用什么话术临门一脚？",
      "老客户怎么开口请他帮忙转介绍？",
    ];
  }
  return ["你能帮我做什么？", "介绍一下你的能力"];
}