"use client";

import { useEffect, useState } from "react";


type ReportRow = {
  id: string;
  reportUrl: string;
  reportType: string;
  reportReason: string;
  contact: string | null;
  imageUrl: string | null;
  status: string;
  handlerNote: string | null;
  processedAt: string | null;
  createdAt: string;
  reportCount?: number;
  highRisk?: boolean;
  _profileHidden?: boolean;
};

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type ReportSummary = {
  total?: number;
  pending?: number;
  processed?: number;
  rejected?: number;
};

type ReportsData = {
  summary?: ReportSummary | null;
  reports?: ReportRow[] | null;
};

type ActionState = {
  loading: boolean;
  message: string;
  isError: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminReportsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState<ReportSummary>({ total: 0, pending: 0, processed: 0, rejected: 0 });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [action, setAction] = useState<ActionState>({ loading: false, message: "", isError: false });

  async function loadReports() {
    setError("");
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const url = `/api/jeepwork/reports${params.toString() ? `?${params.toString()}` : ""}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      const result = (await response.json()) as AdminEnvelope<ReportsData>;
      if (!response.ok || result.success !== true || !result.data) {
        setError(result.error?.message || "加载举报记录失败");
        setLoading(false);
        return;
      }
      const summaryData = result.data.summary ?? null;
      setSummary({
        total: summaryData?.total ?? 0,
        pending: summaryData?.pending ?? 0,
        processed: summaryData?.processed ?? 0,
        rejected: summaryData?.rejected ?? 0,
      });
      setReports(
        (result.data.reports || []).map((item) => ({
          ...item,
          reportCount: item.reportCount ?? 0,
          highRisk: item.highRisk ?? false,
        }))
      );
      setLoading(false);
    } catch {
      setError("网络错误，无法加载举报记录。");
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadReports());
  }, [statusFilter]);

  async function patchReport(
    reportId: string,
    actionName: "process-report" | "reopen-report" | "mark-processing" | "reject-report" | "update-note",
    note?: string
  ) {
    const actionLabelMap: Record<string, string> = {
      "process-report": "标记已处理",
      "reopen-report": "恢复待处理",
      "mark-processing": "标记处理中",
      "reject-report": "标记已驳回",
      "update-note": "保存处理备注",
    };
    const actionLabel = actionLabelMap[actionName] || actionName;
    if (actionName !== "update-note") {
      const confirmed = window.confirm(`确定要对该举报执行「${actionLabel}」操作吗？`);
      if (!confirmed) return;
    }
    setAction({ loading: true, message: "", isError: false });
    try {
      const response = await fetch(`/api/jeepwork/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, note }),
      });
      const result = (await response.json()) as AdminEnvelope<{ message?: string }>;
      if (!response.ok || result.success !== true || !result.data) {
        setAction({ loading: false, message: result.error?.message || "操作失败", isError: true });
        return;
      }
      setAction({ loading: false, message: result.data.message || "操作成功", isError: false });
      await loadReports();
    } catch {
      setAction({ loading: false, message: "网络错误，操作失败", isError: true });
    }
  }

  async function patchProfile(username: string, actionName: "hide-profile" | "restore-profile") {
    const actionLabel = actionName === "hide-profile" ? "隐藏主页" : "恢复主页";
    const confirmed = window.confirm(`确定要对 @${username} 执行「${actionLabel}」操作吗？`);
    if (!confirmed) return;
    setAction({ loading: true, message: "", isError: false });
    try {
      const response = await fetch(`/api/jeepwork/profiles/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const result = (await response.json()) as AdminEnvelope<{ message?: string }>;
      if (!response.ok || result.success !== true || !result.data) {
        setAction({ loading: false, message: result.error?.message || "操作失败", isError: true });
        return;
      }
      setReports((prev) =>
        prev.map((r) => {
          const uname = extractUsername(r.reportUrl);
          if (uname && uname === username) {
            return { ...r, _profileHidden: actionName === "hide-profile" };
          }
          return r;
        })
      );
      setAction({ loading: false, message: result.data.message || "操作成功", isError: false });
    } catch {
      setAction({ loading: false, message: "网络错误，操作失败", isError: true });
    }
  }

  function extractUsername(url: string): string | null {
    try {
      const match = url.trim().replace(/\/$/, "").match(/\/([a-zA-Z0-9_-]+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  return (
    <div className="grid gap-6">
      {action.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            action.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"
          }`}
        >
          {action.loading ? "处理中…" : action.message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">状态筛选</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
          >
            <option value="">全部</option>
            <option value="待处理">待处理</option>
            <option value="处理中">处理中</option>
            <option value="已处理">已处理</option>
            <option value="已驳回">已驳回</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["总举报数", summary.total, "#2B241E"],
          ["待处理举报数", summary.pending ?? 0, "#B42318"],
          ["已处理举报数", summary.processed ?? 0, "#6F8F4E"],
          ["已驳回举报数", summary.rejected ?? 0, "#8C612E"],
        ].map(([label, value, color]) => (
          <section
            key={label as string}
            className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold" style={{ color: color as string }}>{label as string}</p>
            <p className="mt-2 text-3xl font-black text-[#2B241E]">{value as number}</p>
          </section>
        ))}
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载举报记录…
        </div>
      ) : null}

      {!loading && reports.length === 0 && !error ? (
        <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#2B241E]">暂无举报记录</p>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">请修改筛选条件或稍后刷新重试。</p>
        </div>
      ) : null}

      <section className="grid gap-4">
        {reports.map((report) => {
          const username = extractUsername(report.reportUrl);
          const statusStyle =
            report.status === "已处理"
              ? { bg: "#E6F0D8", color: "#355126" }
              : report.status === "已驳回"
              ? { bg: "#FFF7E8", color: "#8C612E" }
              : report.status === "处理中"
              ? { bg: "#EEF0FF", color: "#5B6FFF" }
              : { bg: "#FFF1F0", color: "#B42318" };
          const isProfileHidden = report._profileHidden === true;
          return (
            <article
              key={report.id}
              className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-2xl bg-[#EEF0FF] px-3 py-1 text-xs font-black text-[#5B6FFF]">
                      {report.reportType}
                    </span>
                    <span className="rounded-2xl px-3 py-1 text-xs font-black" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                      {report.status}
                    </span>
                    {typeof report.reportCount === "number" ? (
                      <span className="rounded-2xl bg-[#FFF7E8] px-3 py-1 text-xs font-black text-[#8C612E]">
                        举报次数：{report.reportCount}次
                      </span>
                    ) : null}
                    {report.highRisk ? (
                      <span className="inline-flex items-center gap-1 rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">
                        高风险用户
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 truncate text-base font-black text-[#2B241E]">{report.reportUrl}</p>
                  <p className="mt-2 text-sm leading-6 text-[#6B5D4F]">{report.reportReason}</p>
                  {report.imageUrl ? (
                    <a
                      href={report.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#6F8F4E]"
                    >
                      查看举报截图 →
                    </a>
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">
                    提交时间：{formatDate(report.createdAt)}
                    {report.processedAt ? ` · 处理时间：${formatDate(report.processedAt)}` : null}
                  </p>
                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-bold text-[#2B241E]">处理备注</span>
                    <textarea
                      value={notes[report.id] || ""}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [report.id]: event.target.value }))
                      }
                      rows={2}
                      className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-2 text-sm text-[#2B241E] outline-none"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void patchReport(report.id, "update-note", notes[report.id])}
                    disabled={action.loading}
                    className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                  >
                    保存备注
                  </button>
                  {report.status === "待处理" || report.status === "处理中" ? (
                    <>
                      {report.status === "待处理" ? (
                        <button
                          type="button"
                          onClick={() => void patchReport(report.id, "mark-processing", notes[report.id])}
                          disabled={action.loading}
                          className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                        >
                          标记处理中
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void patchReport(report.id, "process-report", notes[report.id])}
                        disabled={action.loading}
                        className="min-h-11 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-60"
                      >
                        标记已处理
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchReport(report.id, "reject-report", notes[report.id])}
                        disabled={action.loading}
                        className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                      >
                        标记已驳回
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchReport(report.id, "reopen-report", notes[report.id])}
                      disabled={action.loading}
                      className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                    >
                      恢复待处理
                    </button>
                  )}
                  {username ? (
                    !isProfileHidden ? (
                      <button
                        type="button"
                        onClick={() => void patchProfile(username, "hide-profile")}
                        disabled={action.loading}
                        className="min-h-11 rounded-2xl bg-[#B42318] px-4 text-sm font-black text-white disabled:opacity-60"
                      >
                        隐藏主页
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void patchProfile(username, "restore-profile")}
                        disabled={action.loading}
                        className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
                      >
                        恢复主页
                      </button>
                    )
                  ) : null}
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#F2F0EC] text-xs text-[#7A6D5E]">
                    删除停用
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
