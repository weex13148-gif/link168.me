"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Package,
  MessageSquare,
  Mail,
  Phone,
  User,
  Clock,
  ChevronRight,
  Send,
  Inbox,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Copy,
  Check,
  RefreshCw,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";

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
  is_historical_status?: boolean;
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

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// 统一新状态
const VALID_STATUSES = ["new", "viewed", "following_up", "won", "closed"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

// 历史状态兼容显示
const HISTORICAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  contacted: { label: "待联系", color: "text-[#2563EB]", bg: "bg-[#EAF3FF]", dot: "bg-[#2563EB]" },
  following: { label: "跟进中", color: "text-[#8C612E]", bg: "bg-[#F6E7C8]", dot: "bg-[#8C612E]" },
  converted: { label: "已成交", color: "text-[#3F5F31]", bg: "bg-[#DDE8CD]", dot: "bg-[#3F5F31]" },
  qualified: { label: "已确认", color: "text-[#8C612E]", bg: "bg-[#F6E7C8]", dot: "bg-[#8C612E]" },
  lost: { label: "已流失", color: "text-[#7A6D5E]", bg: "bg-[#F7F1E7]", dot: "bg-[#7A6D5E]" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new: { label: "新线索", color: "text-[#B42318]", bg: "bg-[#FFE6E2]", dot: "bg-[#B42318]" },
  viewed: { label: "已查看", color: "text-[#2563EB]", bg: "bg-[#EAF3FF]", dot: "bg-[#2563EB]" },
  following_up: { label: "跟进中", color: "text-[#8C612E]", bg: "bg-[#F6E7C8]", dot: "bg-[#8C612E]" },
  won: { label: "已成交", color: "text-[#3F5F31]", bg: "bg-[#DDE8CD]", dot: "bg-[#3F5F31]" },
  closed: { label: "已关闭", color: "text-[#7A6D5E]", bg: "bg-[#F7F1E7]", dot: "bg-[#7A6D5E]" },
};

const SOURCE_LABELS: Record<string, string> = {
  link: "链接组件",
  qr: "二维码",
  booking: "预约申请",
  shop: "商品组件",
  wechat: "微信组件",
  phone: "电话组件",
  direct: "直接访问",
  "ai-chat": "AI 接待",
  contact_form: "联系表单",
  product_card: "产品咨询",
  service_card: "服务咨询",
  offer: "优惠活动",
  quote: "报价咨询",
  unknown: "未知来源",
};

const SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: "ai-chat", label: "AI 对话" },
  { value: "contact_form", label: "联系表单" },
  { value: "product_card", label: "产品咨询" },
  { value: "service_card", label: "服务咨询" },
  { value: "offer", label: "优惠活动" },
  { value: "booking", label: "预约申请" },
  { value: "quote", label: "报价咨询" },
  { value: "link", label: "链接组件" },
  { value: "qr", label: "二维码" },
  { value: "phone", label: "电话组件" },
  { value: "wechat", label: "微信组件" },
  { value: "direct", label: "直接访问" },
  { value: "unknown", label: "未知来源" },
];

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "custom", label: "自定义" },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

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

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getStatusDisplay(lead: LeadItem) {
  if (lead.is_historical_status) {
    return HISTORICAL_STATUS_CONFIG[lead.status] ?? {
      label: lead.status,
      color: "text-[#7A6D5E]",
      bg: "bg-[#F7F1E7]",
      dot: "bg-[#7A6D5E]",
    };
  }
  return STATUS_CONFIG[lead.status] ?? {
    label: lead.status,
    color: "text-[#7A6D5E]",
    bg: "bg-[#F7F1E7]",
    dot: "bg-[#7A6D5E]",
  };
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

function getLastFollowUpTime(lead: LeadItem): string | null {
  if (lead.follow_ups && lead.follow_ups.length > 0) {
    return lead.follow_ups[0].created_at;
  }
  if (lead.handled_at) {
    return lead.handled_at;
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

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  return Promise.resolve(false);
}

type Props = {
  initialLeads: LeadItem[];
  initialStats?: {
    total: number;
    new: number;
    viewed: number;
    following_up: number;
    won: number;
    closed: number;
    historical?: {
      contacted: number;
      following: number;
      converted: number;
      qualified: number;
      lost: number;
    };
  };
};

export default function LeadsClient({ initialLeads, initialStats }: Props) {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<LeadItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasSearched = searchQuery.length > 0 || sourceFilter !== "" || timeRange !== "all";

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (sourceFilter) params.set("source", sourceFilter);
      if (filter !== "all") params.set("status", filter);
      if (timeRange === "today") {
        const today = formatDate(new Date());
        params.set("dateFrom", today);
        params.set("dateTo", today);
      } else if (timeRange === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        params.set("dateFrom", formatDate(d));
      } else if (timeRange === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        params.set("dateFrom", formatDate(d));
      } else if (timeRange === "custom") {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/workbench/leads?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(data.leads || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.stats) setStats(data.stats);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sourceFilter, filter, timeRange, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    if (hasSearched || page > 1 || pageSize !== 50) {
      fetchLeads();
    }
  }, [hasSearched, page, pageSize, fetchLeads]);

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const displayStats = stats ?? {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    viewed: leads.filter((l) => l.status === "viewed").length,
    following_up: leads.filter((l) => l.status === "following_up").length,
    won: leads.filter((l) => l.status === "won").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  const filterTabs = [
    { key: "all", label: "全部", count: displayStats.total },
    { key: "new", label: "新线索", count: displayStats.new },
    { key: "viewed", label: "已查看", count: displayStats.viewed },
    { key: "following_up", label: "跟进中", count: displayStats.following_up },
    { key: "won", label: "已成交", count: displayStats.won },
    { key: "closed", label: "已关闭", count: displayStats.closed },
  ];

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    setPage(1);
  };

  const handleStatusTabClick = (status: string) => {
    setFilter(status);
    setPage(1);
    if (hasSearched) {
      fetchLeads();
    }
  };

  const handleCopyContact = async (field: string, value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

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
          prev.map((l) => (l.id === id ? { ...l, ...data.lead, status: newStatus } : l)),
        );
        if (detail && detail.id === id) {
          setDetail({ ...detail, ...data.lead, status: newStatus });
        }
        if (hasSearched) {
          fetchLeads();
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

  const totalPages = pagination?.totalPages ?? 1;
  const showPagination = pagination && pagination.total > pageSize;

  return (
    <>
      <section className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {filterTabs.map((tab) => {
          const cfg = tab.key === "all"
            ? { color: "text-[#2B241E]", bg: "bg-[#F7F1E7]", dot: "bg-[#6F8F4E]" }
            : STATUS_CONFIG[tab.key] ?? STATUS_CONFIG.new;
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusTabClick(tab.key)}
              className={`rounded-[20px] border p-4 text-left transition-all ${
                active
                  ? "border-[#6F8F4E] bg-white shadow-md ring-2 ring-[#6F8F4E]/20"
                  : "border-[#E8DCCB] bg-white hover:border-[#D8CCBB]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${active ? "bg-[#6F8F4E]" : cfg.dot ?? "bg-[#7A6D5E]"}`} />
                <span className="text-xs font-bold text-[#7A6D5E]">{tab.label}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-[#2B241E]">{tab.count}</p>
            </button>
          );
        })}
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#3F5F31]">线索列表</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">点击线索查看详情，添加跟进记录或更新状态。</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#3F5F31] bg-[#F7F1E7] hover:bg-[#F2E7D8] transition-colors"
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              筛选
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search aria-hidden className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7A6D5E]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="搜索姓名、邮箱、电话、微信..."
                className="w-full rounded-2xl border border-[#E8DCCB] bg-white pl-10 pr-24 py-2.5 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#6F8F4E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#5E7F3F] transition-colors"
              >
                搜索
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid gap-3 pt-2 border-t border-[#F2E7D8] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A6D5E]">
                  <Tag aria-hidden className="inline size-3 mr-1" />
                  来源渠道
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A6D5E]">
                  <Calendar aria-hidden className="inline size-3 mr-1" />
                  时间范围
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                >
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {timeRange === "custom" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#7A6D5E]">开始日期</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#7A6D5E]">结束日期</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 my-4 flex items-center justify-between rounded-2xl bg-[#FFE6E2] px-4 py-3 sm:mx-6">
            <div className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-4 text-[#B42318]" />
              <span className="text-sm font-bold text-[#B42318]">{error}</span>
            </div>
            <button
              onClick={fetchLeads}
              className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] hover:bg-[#FFF8F6]"
            >
              <RefreshCw aria-hidden className="size-3" />
              重试
            </button>
          </div>
        )}

        {loading && leads.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center sm:px-6">
            <div className="size-8 animate-spin rounded-full border-2 border-[#6F8F4E] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-[#7A6D5E]">加载中...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center sm:px-6">
            <div className="grid size-20 place-items-center rounded-full bg-[#F7F1E7]">
              <Inbox aria-hidden className="size-10 text-[#7A6D5E]" />
            </div>
            <p className="mt-4 text-base font-black text-[#2B241E]">
              {hasSearched ? "没有匹配的线索" : filter === "all" ? "暂无客户线索" : "该状态下暂无线索"}
            </p>
            <p className="mt-1 text-sm text-[#7A6D5E]">
              {hasSearched
                ? "试试调整搜索条件或筛选范围"
                : filter === "all"
                ? "访客在你的公开主页提交联系信息后，线索会出现在这里。"
                : "切换其他状态查看更多线索。"}
            </p>
            {!hasSearched && filter === "all" && (
              <div className="mt-4 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-left">
                <p className="text-xs font-bold text-[#3F5F31]">如何获得第一条线索</p>
                <ul className="mt-2 grid gap-1 text-xs text-[#7A6D5E]">
                  <li>• 分享你的公开主页链接给朋友</li>
                  <li>• 将二维码印在名片、海报或产品上</li>
                  <li>• 开启 AI 接待助手，自动收集访客意向</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#E8DCCB]">
              {filteredLeads.map((lead) => {
                const cfg = getStatusDisplay(lead);
                const sourceLabel = lead.source_component
                  ? SOURCE_LABELS[lead.source_component] ?? lead.source_component
                  : "主页";
                const productInfo = getProductSnapshotStatus(lead);
                const followUpsCount = lead.follow_ups?.length ?? 0;
                const lastFollowUp = getLastFollowUpTime(lead);

                return (
                  <li
                    key={lead.id}
                    onClick={() => setDetail(lead)}
                    className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#FAF7F2] sm:px-6 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#F7F1E7] text-sm font-black text-[#3F5F31] ring-1 ring-[#E8DCCB] hidden sm:grid">
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
                          {lead.is_historical_status && (
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#B42318] bg-[#FFE6E2] flex items-center gap-1">
                              <AlertTriangle className="size-3" />
                              历史
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7A6D5E]">
                          {lead.email && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyContact(`email-${lead.id}`, lead.email!); }}
                              className="inline-flex items-center gap-1 hover:text-[#6F8F4E]"
                            >
                              <Mail aria-hidden className="size-3" />
                              <span className="truncate max-w-[120px]">{lead.email}</span>
                              {copiedField === `email-${lead.id}` ? (
                                <Check aria-hidden className="size-3 text-[#6F8F4E]" />
                              ) : (
                                <Copy aria-hidden className="size-3 opacity-0 group-hover:opacity-100" />
                              )}
                            </button>
                          )}
                          {lead.phone && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyContact(`phone-${lead.id}`, lead.phone!); }}
                              className="inline-flex items-center gap-1 hover:text-[#6F8F4E]"
                            >
                              <Phone aria-hidden className="size-3" />
                              <span className="truncate max-w-[120px]">{lead.phone}</span>
                              {copiedField === `phone-${lead.id}` ? (
                                <Check aria-hidden className="size-3 text-[#6F8F4E]" />
                              ) : null}
                            </button>
                          )}
                          {lead.wechat && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyContact(`wechat-${lead.id}`, lead.wechat!); }}
                              className="inline-flex items-center gap-1 hover:text-[#6F8F4E]"
                            >
                              <MessageSquare aria-hidden className="size-3" />
                              <span className="truncate max-w-[100px]">微信: {lead.wechat}</span>
                              {copiedField === `wechat-${lead.id}` ? (
                                <Check aria-hidden className="size-3 text-[#6F8F4E]" />
                              ) : null}
                            </button>
                          )}
                        </div>
                        {lead.message && (
                          <p className="mt-2 line-clamp-2 text-xs text-[#2B241E]">
                            "{lead.message}"
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {productInfo && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DDE8CD] px-2.5 py-1 text-[11px] font-bold text-[#3F5F31]">
                              <Package aria-hidden className="size-3" />
                              <span className="truncate max-w-[120px]">{productInfo.name}</span>
                              {productInfo.price && ` · ${productInfo.price}`}
                            </div>
                          )}
                          {followUpsCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A6D5E]">
                              <MessageSquare aria-hidden className="size-3" />
                              {followUpsCount} 条跟进
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                      <div className="flex items-center gap-2 text-xs text-[#7A6D5E]">
                        <Clock aria-hidden className="size-3" />
                        <span>{formatTime(lead.created_at)}</span>
                      </div>
                      {lastFollowUp && (
                        <div className="flex items-center gap-1 text-[11px] text-[#B8ADA3]">
                          <Clock aria-hidden className="size-3" />
                          <span>最近跟进: {formatTime(lastFollowUp)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-[#7A6D5E]">
                        <span className="truncate max-w-[80px]">来源: {sourceLabel}</span>
                        <ChevronRight aria-hidden className="size-4 hidden sm:block" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {showPagination && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E8DCCB] px-5 py-4 sm:flex-row sm:px-6">
                <div className="flex items-center gap-2 text-xs text-[#7A6D5E]">
                  <span>每页显示</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="rounded-lg border border-[#E8DCCB] bg-white px-2 py-1 text-xs focus:border-[#6F8F4E] focus:outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n} 条</option>
                    ))}
                  </select>
                  <span>共 {pagination.total} 条</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#7A6D5E] bg-[#F7F1E7] hover:bg-[#F2E7D8] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-2 text-xs font-bold text-[#2B241E]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#7A6D5E] bg-[#F7F1E7] hover:bg-[#F2E7D8] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
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
                  {detail.is_historical_status && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#B42318]">
                      <AlertTriangle className="size-3" />
                      历史状态值: {detail.status}，建议更新为新状态
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7A6D5E]">
                    {detail.email && (
                      <button
                        onClick={() => handleCopyContact("detail-email", detail.email!)}
                        className="inline-flex items-center gap-1.5 hover:text-[#6F8F4E]"
                      >
                        <Mail aria-hidden className="size-4" />
                        <span className="truncate max-w-[160px]">{detail.email}</span>
                        {copiedField === "detail-email" && <Check aria-hidden className="size-4 text-[#6F8F4E]" />}
                      </button>
                    )}
                    {detail.phone && (
                      <button
                        onClick={() => handleCopyContact("detail-phone", detail.phone!)}
                        className="inline-flex items-center gap-1.5 hover:text-[#6F8F4E]"
                      >
                        <Phone aria-hidden className="size-4" />
                        <span className="truncate max-w-[140px]">{detail.phone}</span>
                        {copiedField === "detail-phone" && <Check aria-hidden className="size-4 text-[#6F8F4E]" />}
                      </button>
                    )}
                    {detail.wechat && (
                      <button
                        onClick={() => handleCopyContact("detail-wechat", detail.wechat!)}
                        className="inline-flex items-center gap-1.5 hover:text-[#6F8F4E]"
                      >
                        <MessageSquare aria-hidden className="size-4" />
                        <span className="truncate max-w-[140px]">微信: {detail.wechat}</span>
                        {copiedField === "detail-wechat" && <Check aria-hidden className="size-4 text-[#6F8F4E]" />}
                      </button>
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
                                    状态: {(STATUS_CONFIG[fu.previous_status] || HISTORICAL_STATUS_CONFIG[fu.previous_status])?.label ?? fu.previous_status} → {(STATUS_CONFIG[fu.new_status] || HISTORICAL_STATUS_CONFIG[fu.new_status])?.label ?? fu.new_status}
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
                  {(["new", "viewed", "following_up", "won", "closed"] as const).map((key) => {
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
                        {key === "won" ? (
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
