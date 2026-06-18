"use client";

import { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

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
  reportCount: number;
  highRisk: boolean;
};

type ReportPayload = {
  success?: boolean;
  error?: string;
  summary?: { total: number; pending: number; processed: number };
  reports?: ReportRow[];
};

function extractUsername(url: string): string | null {
  try {
    const normalized = url.trim().replace(/\/$/, "");
    const match = normalized.match(/\/([a-zA-Z0-9_-]+)$/);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState({ total: 0, pending: 0, processed: 0 });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  async function loadReports() {
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const response = await fetch(`/api/admin/reports${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
    const result = (await response.json()) as ReportPayload;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      setNotAdmin(true);
      setLoading(false);
      return;
    }
    if (!response.ok || !result.success) {
      setError(result.error || "加载举报记录失败");
      setLoading(false);
      return;
    }

    setSummary(result.summary || { total: 0, pending: 0, processed: 0 });
    const incoming = result.reports || [];
    setReports(incoming);
    setNotes((previous) => {
      const next: Record<string, string> = { ...previous };
      for (const report of incoming) {
        if (report.handlerNote && !next[report.id]) {
          next[report.id] = report.handlerNote;
        }
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadReports());
  }, [statusFilter, router]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }

  async function patchReport(reportId: string, action: "process-report" | "reopen-report" | "update-note", note?: string) {
    const response = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
    if (!response.ok || !result.success) {
      showToast(result.error || "操作失败");
      return;
    }
    showToast(result.message || "操作成功");
    await loadReports();
  }

  async function deleteReport(reportId: string) {
    const confirmed = window.confirm("确定要删除这条举报记录吗？此操作不可恢复。");
    if (!confirmed) return;
    const response = await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
    const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
    if (!response.ok || !result.success) {
      showToast(result.error || "删除记录失败");
      return;
    }
    showToast(result.message || "举报记录已删除");
    await loadReports();
  }

  async function patchProfile(username: string, action: "hide-profile" | "restore-profile") {
    const response = await fetch(`/api/admin/profiles/${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
    if (!response.ok || !result.success) {
      showToast(result.error || "操作失败");
      return;
    }
    showToast(result.message || "操作成功");
    await loadReports();
  }

  if (notAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="header" />
        </header>
        <div className="mt-8 rounded-[28px] border border-[#F2C078] bg-[#FFF7E8] p-6 shadow-sm">
          <h1 className="text-2xl font-black text-[#8C612E]">超级管理员权限不足</h1>
          <p className="mt-3 text-sm leading-6 text-[#8C612E]">只有 role=super_admin 的账号可以访问举报管理页面。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <BrandLogo size="header" />
      </header>

      <section className="mt-8 rounded-[32px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-7 shadow-[0_24px_80px_rgba(86,68,46,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6F8F4E]">Report Administration</p>
        <h1 className="mt-3 text-4xl font-black text-[#2B241E]">举报管理</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">
          查看用户举报记录，可标记处理状态、记录处理备注、隐藏违规主页或恢复公开主页。内测阶段不做 IP 封禁。
        </p>
      </section>

      {toast ? (
        <div className="mt-6 rounded-2xl bg-[#E6F0D8] px-4 py-3 text-sm font-bold text-[#35512E]">{toast}</div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">状态筛选</span>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 flex-1 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            >
              <option value="">全部</option>
              <option value="待处理">待处理</option>
              <option value="已处理">已处理</option>
            </select>
            <button type="button" onClick={() => void loadReports()} className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white">刷新</button>
          </div>
        </label>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["总举报数", summary.total],
          ["待处理举报数", summary.pending],
          ["已处理举报数", summary.processed],
        ].map(([label, value]) => (
          <section key={label as string} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#8C612E]">{label as string}</p>
            <p className="mt-2 text-3xl font-black text-[#2B241E]">{value as number}</p>
          </section>
        ))}
      </section>

      {loading ? (
        <div className="mt-8 rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#2B241E] shadow-sm">
          正在加载举报记录…
        </div>
      ) : null}

      <section className="mt-6 grid gap-4">
        {reports.map((report) => {
          const username = extractUsername(report.reportUrl);
          return (
            <article key={report.id} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-2xl bg-[#EEF0FF] px-3 py-1 text-xs font-black text-[#5B6FFF]">{report.reportType}</span>
                    <span className="rounded-2xl bg-[#F5F7FA] px-3 py-1 text-xs font-black text-[#8C8C8C]">{report.status}</span>
                    <span className="rounded-2xl bg-[#FFF7E8] px-3 py-1 text-xs font-black text-[#8C612E]">举报次数：{report.reportCount}次</span>
                    {report.highRisk ? (
                      <span className="inline-flex items-center gap-1 rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">高风险用户</span>
                    ) : null}
                  </div>
                  <p className="mt-3 truncate text-base font-black text-[#2B241E]">{report.reportUrl}</p>
                  <p className="mt-2 text-sm leading-6 text-[#6B5D4F]">{report.reportReason}</p>
                  {report.contact ? <p className="mt-2 text-xs font-bold text-[#8C8C8C]">联系方式：{report.contact}</p> : null}
                  {report.imageUrl ? (
                    <a href={report.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#6F8F4E]">
                      <Eye aria-hidden className="size-4" /> 查看举报截图
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
                      onChange={(event) => setNotes((previous) => ({ ...previous, [report.id]: event.target.value }))}
                      placeholder="可输入处理备注，保存后会写入数据库。"
                      rows={2}
                      className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <button type="button" onClick={() => void patchReport(report.id, "update-note", notes[report.id])} className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]">保存备注</button>
                  {report.status === "待处理" ? (
                    <button type="button" onClick={() => void patchReport(report.id, "process-report", notes[report.id])} className="min-h-11 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-bold text-white">标记已处理</button>
                  ) : (
                    <button type="button" onClick={() => void patchReport(report.id, "reopen-report", notes[report.id])} className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]">恢复待处理</button>
                  )}
                  {username ? (
                    <>
                      <button type="button" onClick={() => void patchProfile(username, "hide-profile")} className="min-h-11 rounded-2xl bg-[#B42318] px-4 text-sm font-bold text-white">隐藏主页</button>
                      <button type="button" onClick={() => void patchProfile(username, "restore-profile")} className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]">恢复主页</button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => void deleteReport(report.id)} className="grid size-11 place-items-center rounded-2xl border border-[#E8DCCB] bg-[#FFF1F0] text-[#B42318] disabled:opacity-60">
                    <Trash2 aria-label="删除举报记录" className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!loading && reports.length === 0 && !error ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">暂无举报记录。</div>
      ) : null}
    </main>
  );
}
