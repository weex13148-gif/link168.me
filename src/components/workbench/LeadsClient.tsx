"use client";

import { useState } from "react";
import { X, Package, MessageSquare, Mail, Phone, User, Clock, ChevronRight, Send, Inbox, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from "lucide-react";

type ProductInfo = {
  id: string;
  name: string;
  category: string | null;
  price_text: string | null;
  is_active: boolean;
};

type FollowUpItem = {
  id: string;
  content: string;
  previous_status: string | null;
  new_status: string | null;
  created_by_type: string;
  created_at: string;
};

type LeadItem = {
  id: string;
  profile_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source_component: string | null;
  source_page: string | null;
  status: string;
  status_is_legacy?: boolean;
  status_display?: string | null;
  handler_note: string | null;
  handled_at: string | null;
  wechat: string | null;
  interested_product_id: string | null;
  interested_product_name: string | null;
  interested_product_price: string | null;
  interested_product_category: string | null;
  product_snapshot_status?: "active" | "inactive" | "deleted" | "none";
  conversation_id: string | null;
  notes: string | null;
  is_legacy_note?: boolean;
  created_at: string;
  updated_at: string;
  interested_product: ProductInfo | null;
  follow_ups: FollowUpItem[];
  follow_ups_count?: number;
};

const VALID_STATUSES = ["new", "contacted", "following", "converted", "closed"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new: { label: "新线索", color: "text-[#B42318]", bg: "bg-[#FFE6E2]", dot: "bg-[#B42318]" },
  contacted: { label: "已联系", color: "text-[#2563EB]", bg: "bg-[#EAF3FF]", dot: "bg-[#2563EB]" },
  following: { label: "跟进中", color: "text-[#8C612E]", bg: "bg-[#F6E7C8]", dot: "bg-[#8C612E]" },
  converted: { label: "已成交", color: "text-[#3F5F31]", bg: "bg-[#DDE8CD]", dot: "bg-[#3F5F31]" },
  closed: { label: "已关闭", color: "text-[#7A6D5E]", bg: "bg-[#F7F1E7]", dot: "bg-[#7A6D5E]" },
};

const SOURCE_LABELS: Record<string, string> = {
  link: "链接组件",
  qr: "二维码",
  booking: "预约组件",
  shop: "商品组件",
  wechat: "微信组件",
  phone: "电话组件",
  direct: "直接访问",
  "ai-chat": "AI 对话",
  contact_form: "联系表单",
  product_card: "产品咨询",
};

function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function formatFullTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusDisplay(lead: LeadItem) {
  if (lead.status_is_legacy) {
    return {
      label: lead.status_display || "未知状态",
      color: "text-[#B42318]",
      bg: "bg-[#FFE6E2]",
      dot: "bg-[#B42318]",
    };
  }
  return STATUS_CONFIG[lead.status] ?? { label: "未知状态", color: "text-[#B42318]", bg: "bg-[#FFE6E2]", dot: "bg-[#B42318]" };
}

function getProductSnapshotStatus(lead: LeadItem) {
  const ps = lead.product_snapshot_status;
  if (ps === "active" || ps === "inactive") {
    return lead.interested_product
      ? {
          name: lead.interested_product.name,
          price: lead.interested_product.price_text,
          status: ps === "active" ? "上架中" : "已下架",
          isDeleted: false,
        }
      : null;
  }
  if (ps === "deleted") {
    return {
      name: lead.interested_product_name || "产品",
      price: lead.interested_product_price,
      status: "产品已删除",
      isDeleted: true,
    };
  }
  return null;
}

function parseLegacyNotes(notes: string | null): Array<{ time: string; content: string }> {
  if (!notes) return [];
  const lines = notes.split("\n").filter(Boolean);
  return lines
    .map((line) => {
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        return { time: match[1], content: match[2] };
      }
      return { time: "", content: line };
    })
    .reverse();
}

type Props = {
  initialLeads: LeadItem[];
  initialStats?: {
    total: number;
    new: number;
    contacted: number;
    following: number;
    converted: number;
    closed: number;
    legacyQualified?: number;
    legacyLost?: number;
  };
};

export default function LeadsClient({ initialLeads, initialStats }: Props) {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<LeadItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const stats = initialStats ?? {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    following: leads.filter((l) => l.status === "following").length,
    converted: leads.filter((l) => l.status === "converted").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const filterTabs = [
    { key: "all", label: "全部", count: stats.total },
    { key: "new", label: "新线索", count: stats.new },
    { key: "contacted", label: "已联系", count: stats.contacted },
    { key: "following", label: "跟进中", count: stats.following },
    { key: "converted", label: "已成交", count: stats.converted },
    { key: "closed", label: "已关闭", count: stats.closed },
  ];

  async function updateStatus(id: string, newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/workbench/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...data.lead, status: newStatus } : l))
        );
        if (detail && detail.id === id) {
          setDetail({ ...detail, ...data.lead, status: newStatus });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function addNote(id: string) {
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/workbench/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...data.lead } : l))
        );
        if (detail && detail.id === id) {
          setDetail({ ...detail, ...data.lead });
        }
        setNoteInput("");
      }
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <>
      <section className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {filterTabs.map((tab) => {
          const cfg = tab.key === "all"
            ? { color: "text-[#2B241E]", bg: "bg-[#F7F1E7]" }
            : STATUS_CONFIG[tab.key] ?? STATUS_CONFIG.new;
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-[20px] border p-4 text-left transition-all ${
                active
                  ? "border-[#6F8F4E] bg-white shadow-md ring-2 ring-[#6F8F4E]/20"
                  : "border-[#E8DCCB] bg-white hover:border-[#D8CCBB]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${active ? "bg-[#6F8F4E]" : (cfg as { dot?: string }).dot ?? "bg-[#7A6D5E]"}`} />
                <span className="text-xs font-bold text-[#7A6D5E]">{tab.label}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-[#2B241E]">{tab.count}</p>
            </button>
          );
        })}
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">线索列表</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">点击线索查看详情，添加跟进记录或更新状态。</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {["全部", "新线索", "跟进中", "已成交"].map((label) => {
              const key = label === "全部" ? "all"
                : label === "新线索" ? "new"
                : label === "跟进中" ? "following"
                : "converted";
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1.5 font-black transition-colors ${
                    filter === key
                      ? "bg-[#2B241E] text-white"
                      : "bg-[#F7F1E7] text-[#3F5F31] hover:bg-[#F2E7D8]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center sm:px-6">
            <div className="grid size-20 place-items-center rounded-full bg-[#F7F1E7]">
              <Inbox aria-hidden className="size-10 text-[#7A6D5E]" />
            </div>
            <p className="mt-4 text-base font-black text-[#2B241E]">
              {filter === "all" ? "暂无客户线索" : "该状态下暂无线索"}
            </p>
            <p className="mt-1 text-sm text-[#7A6D5E]">
              {filter === "all"
                ? "访客在你的公开主页提交联系信息后，线索会出现在这里。"
                : "切换其他状态查看更多线索。"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E8DCCB]">
            {filteredLeads.map((lead) => {
              const cfg = getStatusDisplay(lead);
              const sourceLabel = lead.source_component
                ? SOURCE_LABELS[lead.source_component] ?? lead.source_component
                : "主页";
              const productInfo = getProductSnapshotStatus(lead);
              const followUpsCount = lead.follow_ups?.length ?? 0;

              return (
                <li
                  key={lead.id}
                  onClick={() => setDetail(lead)}
                  className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#FAF7F2] sm:px-6 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#F7F1E7] text-sm font-black text-[#3F5F31] ring-1 ring-[#E8DCCB]">
                      <User aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[#2B241E]">
                          {lead.name ?? "匿名访客"}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {lead.status_is_legacy && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#B42318] bg-[#FFE6E2] flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            需处理
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7A6D5E]">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail aria-hidden className="size-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone aria-hidden className="size-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.wechat && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare aria-hidden className="size-3" />
                            微信: {lead.wechat}
                          </span>
                        )}
                      </div>
                      {lead.message && (
                        <p className="mt-2 truncate text-xs text-[#2B241E]">
                          "{lead.message}"
                        </p>
                      )}
                      {productInfo && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#DDE8CD] px-2.5 py-1 text-[11px] font-bold text-[#3F5F31]">
                          <Package aria-hidden className="size-3" />
                          {productInfo.name}
                          {productInfo.price && ` · ${productInfo.price}`}
                          <span className={`ml-1 ${productInfo.isDeleted ? "text-[#B42318]" : productInfo.status === "已下架" ? "text-[#8C612E]" : "text-[#3F5F31]"}`}>
                            ({productInfo.status})
                          </span>
                        </div>
                      )}
                      {followUpsCount > 0 && (
                        <div className="mt-1 text-[10px] text-[#7A6D5E]">
                          {followUpsCount} 条跟进记录
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2 text-xs text-[#7A6D5E]">
                      <Clock aria-hidden className="size-3" />
                      {formatTime(lead.created_at)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#7A6D5E]">
                      <span>来源: {sourceLabel}</span>
                      <ChevronRight aria-hidden className="size-4" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B241E]/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-[30px] border border-[#E8DCCB] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(86,68,46,0.12)] sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">线索详情</p>
                <p className="mt-0.5 text-xs text-[#7A6D5E]">
                  {formatFullTime(detail.created_at)}
                </p>
              </div>
              <button
                onClick={() => { setDetail(null); setNoteInput(""); }}
                className="grid size-9 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E] hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#F7F1E7] text-xl font-black text-[#3F5F31] ring-1 ring-[#E8DCCB]">
                  {(detail.name ?? "访").charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#2B241E]">
                      {detail.name ?? "匿名访客"}
                    </h3>
                    {(() => {
                      const cfg = getStatusDisplay(detail);
                      return (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                  {detail.status_is_legacy && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#B42318]">
                      <AlertTriangle className="size-3" />
                      未知状态值: {detail.status}，请更新状态
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7A6D5E]">
                    {detail.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail aria-hidden className="size-4" />
                        {detail.email}
                      </span>
                    )}
                    {detail.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone aria-hidden className="size-4" />
                        {detail.phone}
                      </span>
                    )}
                    {detail.wechat && (
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare aria-hidden className="size-4" />
                        {detail.wechat}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F7F1E7] p-4">
                  <p className="text-xs font-bold text-[#7A6D5E]">来源</p>
                  <p className="mt-1.5 text-sm font-bold text-[#2B241E]">
                    {detail.source_component
                      ? SOURCE_LABELS[detail.source_component] ?? detail.source_component
                      : "主页访问"}
                  </p>
                  {detail.source_page && (
                    <p className="mt-1 text-xs text-[#7A6D5E] truncate">{detail.source_page}</p>
                  )}
                </div>
                <div className="rounded-2xl bg-[#F7F1E7] p-4">
                  <p className="text-xs font-bold text-[#7A6D5E]">咨询产品</p>
                  {(() => {
                    const productInfo = getProductSnapshotStatus(detail);
                    if (productInfo) {
                      return (
                        <div>
                          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-[#2B241E]">
                            <Package aria-hidden className="size-4 text-[#6F8F4E]" />
                            {productInfo.name}
                          </p>
                          {productInfo.price && (
                            <p className="mt-1 text-xs text-[#6F8F4E] font-bold">
                              {productInfo.price}
                            </p>
                          )}
                          <p className={`mt-1 text-xs ${productInfo.isDeleted ? "text-[#B42318]" : "text-[#7A6D5E]"}`}>
                            ({productInfo.status})
                          </p>
                        </div>
                      );
                    }
                    if (detail.interested_product_id) {
                      return <p className="mt-1.5 text-sm text-[#7A6D5E]">产品已删除</p>;
                    }
                    return <p className="mt-1.5 text-sm text-[#7A6D5E]">未关联产品</p>;
                  })()}
                </div>
              </div>

              {detail.message && (
                <div className="mt-4 rounded-2xl bg-[#FFFDF8] p-4 ring-1 ring-[#E8DCCB]">
                  <p className="text-xs font-bold text-[#7A6D5E]">访客留言</p>
                  <p className="mt-2 text-sm text-[#2B241E] whitespace-pre-wrap leading-relaxed">
                    {detail.message}
                  </p>
                </div>
              )}

              {/* 独立跟进记录时间线 */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#3F5F31]">跟进记录</p>
                  <span className="text-xs text-[#7A6D5E]">
                    共 {detail.follow_ups?.length ?? 0} 条
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {(!detail.follow_ups || detail.follow_ups.length === 0) && !detail.notes ? (
                    <div className="rounded-2xl border border-dashed border-[#E8DCCB] py-8 text-center">
                      <p className="text-sm text-[#7A6D5E]">暂无跟进记录</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">在下方添加第一条跟进记录</p>
                    </div>
                  ) : (
                    <>
                      {/* 独立跟进记录（新结构） */}
                      {detail.follow_ups?.map((fu, idx) => {
                        const isStatusChange = fu.previous_status || fu.new_status;
                        return (
                          <div key={fu.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className={`size-2.5 shrink-0 rounded-full ${isStatusChange ? "bg-[#2563EB]" : "bg-[#6F8F4E]"} ring-4 ${isStatusChange ? "ring-[#EAF3FF]" : "ring-[#DDE8CD]"}`} />
                              {idx < (detail.follow_ups?.length ?? 0) - 1 && (
                                <span className="mt-1 w-px flex-1 bg-[#E8DCCB]" />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <p className="text-xs text-[#7A6D5E]">
                                {formatFullTime(fu.created_at)}
                                {isStatusChange && fu.previous_status && fu.new_status && (
                                  <span className="ml-2 text-[#2563EB]">
                                    状态: {STATUS_CONFIG[fu.previous_status]?.label ?? fu.previous_status} → {STATUS_CONFIG[fu.new_status]?.label ?? fu.new_status}
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 text-sm text-[#2B241E] whitespace-pre-wrap leading-relaxed">
                                {fu.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* 旧版历史备注（标记为历史，不继续写入） */}
                      {detail.notes && (
                        <div className="mt-4 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#8C612E]">⚠️ 历史备注</p>
                            <span className="text-[10px] text-[#7A6D5E]">（旧版数据，仅展示）</span>
                          </div>
                          <div className="mt-3 space-y-2">
                            {parseLegacyNotes(detail.notes).map((note, idx) => (
                              <div key={idx} className="text-xs text-[#7A6D5E]">
                                <span className="font-bold">{note.time ? formatFullTime(note.time) : "历史"}:</span>{" "}
                                {note.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="添加跟进记录..."
                  className="flex-1 rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addNote(detail.id);
                    }
                  }}
                />
                <button
                  onClick={() => addNote(detail.id)}
                  disabled={savingNote || !noteInput.trim()}
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#6F8F4E] text-white hover:bg-[#5E7F3F] disabled:opacity-50"
                >
                  <Send aria-hidden className="size-5" />
                </button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-bold text-[#7A6D5E]">更新状态</p>
                <div className="grid grid-cols-5 gap-2">
                  {(["new", "contacted", "following", "converted", "closed"] as const).map((key) => {
                    const cfg = STATUS_CONFIG[key];
                    const active = detail.status === key;
                    return (
                      <button
                        key={key}
                        onClick={() => updateStatus(detail.id, key)}
                        disabled={loading}
                        className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-black transition-all ${
                          active
                            ? `${cfg.bg} ${cfg.color} ring-2 ring-current ring-offset-2`
                            : "bg-[#F7F1E7] text-[#7A6D5E] hover:bg-[#F2E7D8]"
                        }`}
                      >
                        {key === "converted" ? (
                          <CheckCircle2 aria-hidden className="size-5" />
                        ) : key === "closed" ? (
                          <XCircle aria-hidden className="size-5" />
                        ) : (
                          <ArrowRight aria-hidden className="size-5" />
                        )}
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
