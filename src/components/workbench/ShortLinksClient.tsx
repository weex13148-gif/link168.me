"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Link2,
  ExternalLink,
  Trash2,
  Edit2,
  BarChart3,
  X,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Clock,
  QrCode,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Power,
  PowerOff,
  Tag,
} from "lucide-react";

interface ShortLink {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
  isEnabled: boolean;
  expiresAt: string | null;
  channelLabel: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface ShortLinkStats {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  channelDistribution: Array<{ channel: string; label: string; count: number }>;
  deviceDistribution: Array<{ device: string; count: number }>;
  dailyTrend: Array<{ date: string; clicks: number }>;
}

interface ShortLinksClientProps {
  initialShortLinks?: ShortLink[];
}

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:"];

function isSafeUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) return false;
  }
  return true;
}

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

function truncateUrl(url: string, maxLen: number = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "...";
}

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  return Promise.resolve(false);
}

export default function ShortLinksClient({ initialShortLinks = [] }: ShortLinksClientProps) {
  const [shortLinks, setShortLinks] = useState<ShortLink[]>(initialShortLinks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [statsData, setStatsData] = useState<ShortLinkStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "90d">("7d");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [createForm, setCreateForm] = useState({
    targetUrl: "",
    customSlug: "",
    channelLabel: "",
    expiresAt: "",
    isEnabled: true,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editForm, setEditForm] = useState({
    targetUrl: "",
    channelLabel: "",
    expiresAt: "",
    isEnabled: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchShortLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/short-links");
      const data = await res.json();
      if (data.success) {
        setShortLinks(data.shortLinks || []);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialShortLinks.length === 0) {
      fetchShortLinks();
    }
  }, [fetchShortLinks, initialShortLinks.length]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return shortLinks;
    const q = searchQuery.toLowerCase();
    return shortLinks.filter(
      (link) =>
        link.slug.toLowerCase().includes(q) ||
        link.targetUrl.toLowerCase().includes(q) ||
        (link.channelLabel?.toLowerCase().includes(q) ?? false)
    );
  }, [shortLinks, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    const targetUrl = createForm.targetUrl.trim();
    if (!isSafeUrl(targetUrl)) {
      setCreateError("不支持的链接协议");
      setCreateLoading(false);
      return;
    }

    const body: Record<string, unknown> = {
      targetUrl,
    };
    if (createForm.customSlug) body.customSlug = createForm.customSlug;
    if (createForm.channelLabel) body.channelLabel = createForm.channelLabel;
    if (createForm.expiresAt) body.expiresAt = new Date(createForm.expiresAt).toISOString();

    try {
      const res = await fetch("/api/dashboard/short-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShortLinks([data.shortLink, ...shortLinks]);
        setShowCreateModal(false);
        setCreateForm({ targetUrl: "", customSlug: "", channelLabel: "", expiresAt: "", isEnabled: true });
      } else {
        setCreateError(data.error || "创建失败");
      }
    } catch {
      setCreateError("网络错误，请重试");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLink) return;
    setEditLoading(true);
    setEditError("");

    const targetUrl = editForm.targetUrl.trim();
    if (!isSafeUrl(targetUrl)) {
      setEditError("不支持的链接协议");
      setEditLoading(false);
      return;
    }

    const body: Record<string, unknown> = {
      targetUrl,
      channelLabel: editForm.channelLabel || null,
      expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
    };

    try {
      const res = await fetch(`/api/dashboard/short-links/${selectedLink.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShortLinks((prev) =>
          prev.map((l) => (l.id === selectedLink.id ? { ...l, ...data.shortLink } : l))
        );
        setShowEditModal(false);
      } else {
        setEditError(data.error || "更新失败");
      }
    } catch {
      setEditError("网络错误，请重试");
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (link: ShortLink) => {
    setSelectedLink(link);
    setEditForm({
      targetUrl: link.targetUrl,
      channelLabel: link.channelLabel || "",
      expiresAt: link.expiresAt ? link.expiresAt.slice(0, 16) : "",
      isEnabled: link.isEnabled,
    });
    setEditError("");
    setShowEditModal(true);
  };

  const toggleEnabled = async (link: ShortLink) => {
    try {
      const res = await fetch(`/api/dashboard/short-links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !link.isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setShortLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, ...data.shortLink } : l))
        );
      }
    } catch {
      // 静默失败
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboard/short-links/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setShortLinks(shortLinks.filter((sl) => sl.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络错误，请重试");
    }
  };

  const fetchStats = async (shortLinkId: string) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/analytics?shortLinks=true&range=${range}`);
      const data = await res.json();
      if (data.success && data.shortLinks) {
        const linkStat = data.shortLinks.find((s: ShortLinkStats) => s.id === shortLinkId);
        setStatsData(linkStat || null);
      } else {
        setStatsData(null);
      }
    } catch {
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const openStats = async (link: ShortLink) => {
    setSelectedLink(link);
    setShowStatsModal(true);
    await fetchStats(link.id);
  };

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const formatDevice = (device: string): string => {
    const map: Record<string, string> = {
      mobile: "手机",
      desktop: "电脑",
      tablet: "平板",
      unknown: "未知设备",
    };
    return map[device] ?? device;
  };

  const channelLabels: Record<string, string> = {
    xiaohongshu: "小红书",
    douyin: "抖音",
    wechat_official: "微信公众号",
    wechat_friend: "微信好友",
    wechat_group: "微信群",
    wechat_moments: "朋友圈",
    search: "搜索引擎",
    direct: "直接访问",
    offline_qr: "线下二维码",
    custom: "自定义渠道",
    other: "其他",
  };

  return (
    <div className="space-y-6">
      <section className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7A6D5E]">短链接总数</p>
            <span className="grid size-8 place-items-center rounded-xl bg-[#DDE8CD] text-[#3F5F31]">
              <Link2 aria-hidden className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {shortLinks.length}
          </p>
          <p className="mt-2 text-xs font-bold text-[#6F8F4E]">共创建</p>
        </div>
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7A6D5E]">总点击量</p>
            <span className="grid size-8 place-items-center rounded-xl bg-[#EAF3FF] text-[#2563EB]">
              <BarChart3 aria-hidden className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {shortLinks.reduce((sum, l) => sum + l.totalClicks, 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs font-bold text-[#2563EB]">累计访问</p>
        </div>
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7A6D5E]">启用中</p>
            <span className="grid size-8 place-items-center rounded-xl bg-[#DDE8CD] text-[#3F5F31]">
              <Power aria-hidden className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {shortLinks.filter((l) => l.isEnabled).length}
          </p>
          <p className="mt-2 text-xs font-bold text-[#6F8F4E]">正常跳转</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#3F5F31]">短链接列表</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">创建、管理短链接，追踪流量来源和点击数据。</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#6F8F4E] px-4 py-2 text-sm font-bold text-white hover:bg-[#5E7F3F] transition-colors"
            >
              <Plus aria-hidden className="size-4" />
              创建短链接
            </button>
          </div>

          <div className="relative">
            <Search aria-hidden className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7A6D5E]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="搜索短码、目标地址..."
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

        {error && (
          <div className="mx-5 my-4 flex items-center justify-between rounded-2xl bg-[#FFE6E2] px-4 py-3 sm:mx-6">
            <div className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-4 text-[#B42318]" />
              <span className="text-sm font-bold text-[#B42318]">{error}</span>
            </div>
            <button
              onClick={fetchShortLinks}
              className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#B42318] hover:bg-[#FFF8F6]"
            >
              <RefreshCw aria-hidden className="size-3" />
              重试
            </button>
          </div>
        )}

        {loading && shortLinks.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center sm:px-6">
            <div className="size-8 animate-spin rounded-full border-2 border-[#6F8F4E] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-[#7A6D5E]">加载中...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="grid place-items-center px-5 py-16 text-center sm:px-6">
            <div className="grid size-20 place-items-center rounded-full bg-[#F7F1E7]">
              <Link2 aria-hidden className="size-10 text-[#7A6D5E]" />
            </div>
            <p className="mt-4 text-base font-black text-[#2B241E]">
              {searchQuery ? "没有匹配的短链接" : "暂无短链接"}
            </p>
            <p className="mt-1 text-sm text-[#7A6D5E]">
              {searchQuery
                ? "试试调整搜索关键词"
                : "创建你的第一个短链接，开始追踪流量来源和转化数据。"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 rounded-full bg-[#6F8F4E] px-5 py-2 text-sm font-bold text-white hover:bg-[#5E7F3F] transition-colors"
              >
                创建短链接
              </button>
            )}
            {!searchQuery && (
              <div className="mt-4 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-left">
                <p className="text-xs font-bold text-[#3F5F31]">短链接能做什么</p>
                <ul className="mt-2 grid gap-1 text-xs text-[#7A6D5E]">
                  <li>• 缩短长链接，方便分享和传播</li>
                  <li>• 追踪每个链接的点击量和来源渠道</li>
                  <li>• 随时修改目标地址，短码保持不变</li>
                  <li>• 标记不同渠道，分析推广效果</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#E8DCCB]">
            {filteredLinks.map((link) => {
              const shortUrl = `${window.location.origin}/s/${link.slug}`;
              const copyId = `copy-${link.id}`;
              const isDeleting = deleteConfirmId === link.id;

              return (
                <li
                  key={link.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:px-6 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#F7F1E7] text-sm font-black text-[#3F5F31] ring-1 ring-[#E8DCCB] hidden sm:grid">
                      <Link2 aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-black ${link.isEnabled ? "text-[#2B241E]" : "text-[#B8ADA3] line-through"}`}>
                          /s/{link.slug}
                        </p>
                        {link.channelLabel && (
                          <span className="shrink-0 rounded-full bg-[#EAF3FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
                            {link.channelLabel}
                          </span>
                        )}
                        {!link.isEnabled && (
                          <span className="shrink-0 rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[11px] font-bold text-[#7A6D5E]">
                            已停用
                          </span>
                        )}
                        {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                          <span className="shrink-0 rounded-full bg-[#FFE6E2] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">
                            已过期
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="truncate text-xs text-[#7A6D5E] flex-1" title={link.targetUrl}>
                          {truncateUrl(link.targetUrl, 80)}
                        </p>
                        <button
                          onClick={() => handleCopy(copyId, shortUrl)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#6F8F4E] bg-[#DDE8CD]/40 hover:bg-[#DDE8CD] transition-colors"
                        >
                          {copiedId === copyId ? (
                            <>
                              <Check aria-hidden className="size-3" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy aria-hidden className="size-3" />
                              复制链接
                            </>
                          )}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A6D5E]">
                        <span className="inline-flex items-center gap-1">
                          <BarChart3 aria-hidden className="size-3" />
                          {link.totalClicks.toLocaleString()} 次点击
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar aria-hidden className="size-3" />
                          创建于 {formatTime(link.createdAt)}
                        </span>
                        {link.expiresAt && (
                          <span className="inline-flex items-center gap-1">
                            <Clock aria-hidden className="size-3" />
                            {new Date(link.expiresAt) < new Date()
                              ? "已过期"
                              : `有效期至 ${new Date(link.expiresAt).toLocaleDateString("zh-CN")}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openStats(link)}
                        className="rounded-xl p-2 text-[#7A6D5E] hover:bg-[#F7F1E7] transition-colors"
                        title="查看统计"
                      >
                        <BarChart3 aria-hidden className="size-5" />
                      </button>
                      <button
                        onClick={() => toggleEnabled(link)}
                        className={`rounded-xl p-2 transition-colors ${
                          link.isEnabled
                            ? "text-[#3F5F31] hover:bg-[#DDE8CD]"
                            : "text-[#B8ADA3] hover:bg-[#F7F1E7]"
                        }`}
                        title={link.isEnabled ? "停用" : "启用"}
                      >
                        {link.isEnabled ? (
                          <Power aria-hidden className="size-5" />
                        ) : (
                          <PowerOff aria-hidden className="size-5" />
                        )}
                      </button>
                      <a
                        href={`/s/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded-xl p-2 transition-colors ${
                          link.isEnabled
                            ? "text-[#7A6D5E] hover:bg-[#F7F1E7]"
                            : "text-[#B8ADA3] opacity-50 pointer-events-none"
                        }`}
                        title="访问链接"
                      >
                        <ExternalLink aria-hidden className="size-5" />
                      </a>
                      <button
                        onClick={() => openEditModal(link)}
                        className="rounded-xl p-2 text-[#7A6D5E] hover:bg-[#F7F1E7] transition-colors"
                        title="编辑"
                      >
                        <Edit2 aria-hidden className="size-5" />
                      </button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="rounded-xl px-2 py-1.5 text-[11px] font-bold text-white bg-[#B42318] hover:bg-[#A31F15] transition-colors"
                          >
                            确认删除
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-xl px-2 py-1.5 text-[11px] font-bold text-[#7A6D5E] bg-[#F7F1E7] hover:bg-[#F2E7D8] transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(link.id)}
                          className="rounded-xl p-2 text-[#B42318] hover:bg-[#FFE6E2] transition-colors"
                          title="删除"
                        >
                          <Trash2 aria-hidden className="size-5" />
                        </button>
                      )}
                    </div>
                    <ChevronRight aria-hidden className="size-4 text-[#B8ADA3] hidden sm:block" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B241E]/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-[30px] border border-[#E8DCCB] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(86,68,46,0.12)] sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">创建短链接</p>
                <p className="mt-0.5 text-xs text-[#7A6D5E]">输入目标地址，生成可追踪的短链接</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="grid size-9 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E] hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  目标链接 <span className="text-[#B42318]">*</span>
                </label>
                <input
                  type="url"
                  value={createForm.targetUrl}
                  onChange={(e) => setCreateForm({ ...createForm, targetUrl: e.target.value })}
                  placeholder="https://example.com/your-long-url"
                  required
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  仅支持 http:// 和 https:// 协议
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">自定义后缀（可选）</label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l-2xl border border-r-0 border-[#E8DCCB] bg-[#F7F1E7] px-3 py-3 text-sm text-[#7A6D5E]">
                    /s/
                  </span>
                  <input
                    type="text"
                    value={createForm.customSlug}
                    onChange={(e) => setCreateForm({ ...createForm, customSlug: e.target.value })}
                    placeholder="my-link"
                    pattern="[a-z0-9-_]{3,32}"
                    className="flex-1 rounded-r-2xl border border-[#E8DCCB] px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  3-32个字符，仅限小写字母、数字、- 和 _
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  渠道标签（可选）
                </label>
                <input
                  type="text"
                  value={createForm.channelLabel}
                  onChange={(e) => setCreateForm({ ...createForm, channelLabel: e.target.value })}
                  placeholder="如：小红书、抖音、线下活动"
                  maxLength={50}
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  标记推广渠道，便于后续分析来源
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  过期时间（可选）
                </label>
                <input
                  type="datetime-local"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  过期后短链接将无法跳转
                </p>
              </div>

              {createError && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#FFE6E2] px-4 py-3">
                  <AlertTriangle aria-hidden className="size-4 text-[#B42318] shrink-0" />
                  <p className="text-sm font-bold text-[#B42318]">{createError}</p>
                </div>
              )}
            </form>

            <div className="border-t border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError("");
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-[#7A6D5E] bg-[#F7F1E7] hover:bg-[#F2E7D8] transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  onClick={handleCreate}
                  disabled={createLoading || !createForm.targetUrl.trim()}
                  className="flex-1 rounded-2xl bg-[#6F8F4E] px-4 py-3 text-sm font-bold text-white hover:bg-[#5E7F3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? "创建中..." : "创建"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedLink && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B241E]/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-[30px] border border-[#E8DCCB] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(86,68,46,0.12)] sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">编辑短链接</p>
                <p className="mt-0.5 text-xs text-[#7A6D5E]">/{selectedLink.slug}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditError("");
                }}
                className="grid size-9 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E] hover:bg-[#E8DCCB]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  目标链接 <span className="text-[#B42318]">*</span>
                </label>
                <input
                  type="url"
                  value={editForm.targetUrl}
                  onChange={(e) => setEditForm({ ...editForm, targetUrl: e.target.value })}
                  required
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  修改目标地址后，短码保持不变
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  渠道标签（可选）
                </label>
                <input
                  type="text"
                  value={editForm.channelLabel}
                  onChange={(e) => setEditForm({ ...editForm, channelLabel: e.target.value })}
                  placeholder="如：小红书、抖音、线下活动"
                  maxLength={50}
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  标记推广渠道，便于后续分析来源
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6D5E]">
                  过期时间（可选）
                </label>
                <input
                  type="datetime-local"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
                <p className="mt-1 text-[11px] text-[#B8ADA3]">
                  过期后短链接将无法跳转，留空表示永不过期
                </p>
              </div>

              {editError && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#FFE6E2] px-4 py-3">
                  <AlertTriangle aria-hidden className="size-4 text-[#B42318] shrink-0" />
                  <p className="text-sm font-bold text-[#B42318]">{editError}</p>
                </div>
              )}
            </form>

            <div className="border-t border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditError("");
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-[#7A6D5E] bg-[#F7F1E7] hover:bg-[#F2E7D8] transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  onClick={handleEdit}
                  disabled={editLoading || !editForm.targetUrl.trim()}
                  className="flex-1 rounded-2xl bg-[#6F8F4E] px-4 py-3 text-sm font-bold text-white hover:bg-[#5E7F3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatsModal && selectedLink && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B241E]/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-[30px] border border-[#E8DCCB] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(86,68,46,0.12)] sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">/{selectedLink.slug} 数据统计</p>
                <p className="mt-0.5 text-xs text-[#7A6D5E]">点击量、来源渠道和设备分布</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={range}
                  onChange={(e) => {
                    setRange(e.target.value as "today" | "7d" | "30d" | "90d");
                    fetchStats(selectedLink.id);
                  }}
                  className="rounded-xl border border-[#E8DCCB] bg-white px-3 py-1.5 text-xs font-bold text-[#7A6D5E] focus:border-[#6F8F4E] focus:outline-none"
                >
                  <option value="today">今日</option>
                  <option value="7d">近 7 天</option>
                  <option value="30d">近 30 天</option>
                  <option value="90d">近 90 天</option>
                </select>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="grid size-9 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E] hover:bg-[#E8DCCB]"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {statsLoading ? (
                <div className="grid place-items-center py-12">
                  <div className="size-8 animate-spin rounded-full border-2 border-[#6F8F4E] border-t-transparent" />
                  <p className="mt-4 text-sm font-bold text-[#7A6D5E]">加载中...</p>
                </div>
              ) : statsData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#F7F1E7] p-4">
                      <p className="text-xs font-bold text-[#7A6D5E]">总点击</p>
                      <p className="mt-1.5 text-2xl font-black text-[#2B241E]">
                        {statsData.totalClicks.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F7F1E7] p-4">
                      <p className="text-xs font-bold text-[#7A6D5E]">独立访客</p>
                      <p className="mt-1.5 text-2xl font-black text-[#2B241E]">
                        {statsData.uniqueVisitors.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {statsData.dailyTrend.length > 0 && (
                    <div>
                      <p className="text-sm font-black text-[#3F5F31]">每日点击趋势</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">最近 {range === "7d" ? "7" : range === "30d" ? "30" : "90"} 天的点击量变化</p>
                      <div className="mt-4 flex h-40 items-end gap-1">
                        {statsData.dailyTrend.map((day) => {
                          const max = Math.max(...statsData.dailyTrend.map((d) => d.clicks), 1);
                          return (
                            <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                              <span className="text-[10px] font-black text-[#7A6D5E]">{day.clicks}</span>
                              <div
                                className="w-full min-w-[16px] rounded-t-xl bg-gradient-to-b from-[#6F8F4E] to-[#DDE8CD]"
                                style={{ height: `${Math.max((day.clicks / max) * 100, 4)}%` }}
                              />
                              <span className="text-[10px] text-[#B8ADA3]">
                                {day.date.slice(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {statsData.channelDistribution.length > 0 && (
                    <div>
                      <p className="text-sm font-black text-[#3F5F31]">来源渠道</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">访客通过哪些渠道访问短链接</p>
                      <ul className="mt-3 space-y-2">
                        {statsData.channelDistribution.map((ch) => (
                          <li key={ch.channel} className="rounded-2xl bg-[#F7F1E7] px-4 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#2B241E]">
                                {channelLabels[ch.channel] || ch.label || ch.channel}
                              </span>
                              <span className="text-xs font-black text-[#6F8F4E]">
                                {ch.count} 次
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {statsData.deviceDistribution.length > 0 && (
                    <div>
                      <p className="text-sm font-black text-[#3F5F31]">设备分布</p>
                      <p className="mt-1 text-xs text-[#7A6D5E]">访客使用的设备类型</p>
                      <ul className="mt-3 space-y-2">
                        {statsData.deviceDistribution.map((dev) => {
                          const max = Math.max(...statsData.deviceDistribution.map((d) => d.count), 1);
                          return (
                            <li key={dev.device} className="grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#2B241E]">{formatDevice(dev.device)}</span>
                                <span className="text-xs font-black text-[#7A6D5E]">
                                  {dev.count} 次
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#F7F1E7]">
                                <div
                                  className="h-full bg-[#6F8F4E]"
                                  style={{ width: `${(dev.count / max) * 100}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid place-items-center py-12 text-center">
                  <BarChart3 aria-hidden className="size-12 text-[#E8DCCB]" />
                  <p className="mt-4 text-sm font-bold text-[#7A6D5E]">暂无统计数据</p>
                  <p className="mt-1 text-xs text-[#B8ADA3]">
                    分享短链接后，被点击数据将显示在这里
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
