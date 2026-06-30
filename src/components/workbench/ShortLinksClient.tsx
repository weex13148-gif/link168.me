"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Link2, MoreHorizontal, ExternalLink, QrCode, Trash2, Edit2, BarChart3 } from "lucide-react";

interface ShortLink {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
  isEnabled: boolean;
  expiresAt: string | null;
  channelLabel: string | null;
  createdAt: string;
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

export default function ShortLinksClient({ initialShortLinks = [] }: ShortLinksClientProps) {
  const [shortLinks, setShortLinks] = useState<ShortLink[]>(initialShortLinks);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsData, setStatsData] = useState<ShortLinkStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");

  // 创建表单状态
  const [createForm, setCreateForm] = useState({
    targetUrl: "",
    customSlug: "",
    channelLabel: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchShortLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/short-links");
      const data = await res.json();
      if (data.success) {
        setShortLinks(data.shortLinks || []);
      }
    } catch (err) {
      console.error("获取短链接失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialShortLinks.length === 0) {
      fetchShortLinks();
    }
  }, [fetchShortLinks, initialShortLinks.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    try {
      const res = await fetch("/api/dashboard/short-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: createForm.targetUrl,
          customSlug: createForm.customSlug || undefined,
          channelLabel: createForm.channelLabel || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShortLinks([data.shortLink, ...shortLinks]);
        setShowCreateModal(false);
        setCreateForm({ targetUrl: "", customSlug: "", channelLabel: "" });
      } else {
        setCreateError(data.error || "创建失败");
      }
    } catch (err) {
      setCreateError("网络错误，请重试");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个短链接吗？")) return;

    try {
      const res = await fetch(`/api/dashboard/short-links/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setShortLinks(shortLinks.filter(sl => sl.id !== id));
      } else {
        alert(data.error || "删除失败");
      }
    } catch (err) {
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
      }
    } catch (err) {
      console.error("获取统计失败:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const openStats = async (link: ShortLink) => {
    setSelectedLink(link);
    setShowStatsModal(true);
    await fetchStats(link.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7A6D5E]" />
            <input
              type="text"
              placeholder="搜索短链接..."
              className="h-10 rounded-xl border border-[#E8DCCB] bg-white pl-10 pr-4 text-sm focus:border-[#6F8F4E] focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#6F8F4E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#5A7A3E]"
        >
          <Plus className="size-4" />
          创建短链接
        </button>
      </div>

      {/* 短链接列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-[#6F8F4E] border-t-transparent" />
        </div>
      ) : shortLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E8DCCB] bg-white py-16 text-center">
          <Link2 className="size-12 text-[#E8DCCB]" />
          <p className="mt-3 text-sm font-bold text-[#7A6D5E]">暂无短链接</p>
          <p className="mt-1 text-xs text-[#B8ADA3]">创建你的第一个短链接，开始追踪流量</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 rounded-xl bg-[#6F8F4E] px-4 py-2 text-sm font-bold text-white"
          >
            创建短链接
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {shortLinks.map(link => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-2xl border border-[#E8DCCB] bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#2B241E]">/{link.slug}</span>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/s/${link.slug}`)}
                    className="text-xs text-[#6F8F4E] hover:underline"
                  >
                    复制
                  </button>
                </div>
                <p className="mt-1 truncate text-xs text-[#7A6D5E]">{link.targetUrl}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-[#B8ADA3]">
                  <span>{link.totalClicks} 次点击</span>
                  <span>{new Date(link.createdAt).toLocaleDateString("zh-CN")}</span>
                  {link.channelLabel && (
                    <span className="rounded-full bg-[#F7F1E7] px-2 py-0.5">
                      {link.channelLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openStats(link)}
                  className="rounded-xl p-2 text-[#7A6D5E] hover:bg-[#F7F1E7]"
                  title="查看统计"
                >
                  <BarChart3 className="size-5" />
                </button>
                <a
                  href={`/s/${link.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-2 text-[#7A6D5E] hover:bg-[#F7F1E7]"
                  title="预览"
                >
                  <ExternalLink className="size-5" />
                </a>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="rounded-xl p-2 text-[#B42318] hover:bg-[#FFE6E2]"
                  title="删除"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold text-[#2B241E]">创建短链接</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#7A6D5E]">目标链接 *</label>
                <input
                  type="url"
                  value={createForm.targetUrl}
                  onChange={e => setCreateForm({ ...createForm, targetUrl: e.target.value })}
                  placeholder="https://example.com"
                  required
                  className="mt-1 w-full rounded-xl border border-[#E8DCCB] px-4 py-2 text-sm focus:border-[#6F8F4E] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#7A6D5E]">自定义后缀（可选）</label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l-xl border border-r-0 border-[#E8DCCB] bg-[#F7F1E7] px-3 py-2 text-sm text-[#7A6D5E]">
                    /s/
                  </span>
                  <input
                    type="text"
                    value={createForm.customSlug}
                    onChange={e => setCreateForm({ ...createForm, customSlug: e.target.value })}
                    placeholder="my-link"
                    pattern="[a-z0-9-_]{3,32}"
                    className="flex-1 rounded-r-xl border border-[#E8DCCB] px-4 py-2 text-sm focus:border-[#6F8F4E] focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-[#B8ADA3]">3-32个字符，仅限小写字母、数字、- 和 _</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#7A6D5E]">渠道标签（可选）</label>
                <input
                  type="text"
                  value={createForm.channelLabel}
                  onChange={e => setCreateForm({ ...createForm, channelLabel: e.target.value })}
                  placeholder="如：小红书、抖音、线下活动"
                  maxLength={50}
                  className="mt-1 w-full rounded-xl border border-[#E8DCCB] px-4 py-2 text-sm focus:border-[#6F8F4E] focus:outline-none"
                />
              </div>
              {createError && (
                <p className="text-sm text-[#B42318]">{createError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError("");
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-[#7A6D5E]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-xl bg-[#6F8F4E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {createLoading ? "创建中..." : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 统计弹窗 */}
      {showStatsModal && selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#2B241E]">/{selectedLink.slug} 统计</h3>
              <div className="flex items-center gap-2">
                <select
                  value={range}
                  onChange={e => {
                    setRange(e.target.value as "7d" | "30d" | "90d");
                    fetchStats(selectedLink.id);
                  }}
                  className="rounded-xl border border-[#E8DCCB] px-3 py-1 text-sm"
                >
                  <option value="7d">近7天</option>
                  <option value="30d">近30天</option>
                  <option value="90d">近90天</option>
                </select>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="rounded-xl p-2 text-[#7A6D5E] hover:bg-[#F7F1E7]"
                >
                  ✕
                </button>
              </div>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-8 animate-spin rounded-full border-2 border-[#6F8F4E] border-t-transparent" />
              </div>
            ) : statsData ? (
              <div className="mt-4 space-y-6">
                {/* 概览 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-[#F7F1E7] p-4">
                    <p className="text-sm text-[#7A6D5E]">总点击</p>
                    <p className="mt-1 text-2xl font-black text-[#2B241E]">{statsData.totalClicks}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F1E7] p-4">
                    <p className="text-sm text-[#7A6D5E]">独立访客</p>
                    <p className="mt-1 text-2xl font-black text-[#2B241E]">{statsData.uniqueVisitors}</p>
                  </div>
                </div>

                {/* 每日趋势 */}
                <div>
                  <p className="text-sm font-bold text-[#3F5F31]">每日趋势</p>
                  <div className="mt-2 flex h-32 items-end gap-1">
                    {statsData.dailyTrend.map(day => {
                      const max = Math.max(...statsData.dailyTrend.map(d => d.clicks), 1);
                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center justify-end">
                          <div
                            className="w-full min-w-[16px] rounded-t bg-[#6F8F4E]"
                            style={{ height: `${Math.max((day.clicks / max) * 100, 4)}%` }}
                          />
                          <span className="mt-1 text-xs text-[#B8ADA3]">
                            {day.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 渠道分布 */}
                {statsData.channelDistribution.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-[#3F5F31]">来源渠道</p>
                    <ul className="mt-2 space-y-2">
                      {statsData.channelDistribution.map(ch => (
                        <li key={ch.channel} className="flex items-center justify-between text-sm">
                          <span className="text-[#2B241E]">{ch.label || ch.channel}</span>
                          <span className="text-[#7A6D5E]">{ch.count} 次</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 设备分布 */}
                {statsData.deviceDistribution.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-[#3F5F31]">设备分布</p>
                    <ul className="mt-2 space-y-2">
                      {statsData.deviceDistribution.map(dev => (
                        <li key={dev.device} className="flex items-center justify-between text-sm">
                          <span className="text-[#2B241E]">{dev.device}</span>
                          <span className="text-[#7A6D5E]">{dev.count} 次</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#7A6D5E]">暂无真实数据</p>
                <p className="mt-1 text-xs text-[#B8ADA3]">
                  分享短链接后，被点击数据将显示在这里
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
