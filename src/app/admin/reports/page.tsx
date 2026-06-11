"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";

type ReportRow = {
  id: string;
  reportUrl: string;
  reportType: string;
  reportReason: string;
  contact: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  reportCount: number;
  highRisk: boolean;
};

type ReportPayload = {
  success?: boolean;
  error?: string;
  summary?: {
    total: number;
    pending: number;
    processed: number;
  };
  reports?: ReportRow[];
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [summary, setSummary] = useState({ total: 0, pending: 0, processed: 0 });
  const [reports, setReports] = useState<ReportRow[]>([]);

  async function loadReports(showLoading = true) {
    if (showLoading) {
      setLoading(true);
      setError("");
    }
    const response = await fetch("/api/admin/reports", {
      cache: "no-store",
      headers: { "x-admin-secret": adminSecret },
    });
    const result = (await response.json()) as ReportPayload;
    setLoading(false);

    if (!response.ok || !result.success) {
      setError(result.error || "举报记录读取失败。");
      return;
    }

    setSummary(result.summary || { total: 0, pending: 0, processed: 0 });
    setReports(result.reports || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports(false);
  }, []);

  async function markProcessed(id: string) {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: {
        "x-admin-secret": adminSecret,
        "x-admin-action": "process-report",
      },
    });
    await loadReports();
  }

  async function deleteReport(id: string) {
    await fetch(`/api/admin/reports/${id}`, {
      method: "DELETE",
      headers: {
        "x-admin-secret": adminSecret,
        "x-admin-action": "delete-report",
      },
    });
    await loadReports();
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <LogoMark />
        <Link href="/" className="text-sm font-bold text-[#5B6FFF]">
          返回首页
        </Link>
      </header>

      <section className="mt-8">
        <p className="text-sm font-bold text-[#5B6FFF]">举报管理</p>
        <h1 className="mt-2 text-4xl font-black">举报管理</h1>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadReports();
        }}
        className="mt-6 flex flex-col gap-3 rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm sm:flex-row"
      >
        <input
          type="password"
          value={adminSecret}
          onChange={(event) => setAdminSecret(event.target.value)}
          placeholder="ADMIN_SECRET"
          className="min-h-11 flex-1 rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-3 text-sm outline-none focus:border-[#5B6FFF]"
        />
        <button type="submit" className="min-h-11 rounded-lg bg-[#5B6FFF] px-5 text-sm font-black text-white">
          Load reports
        </button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["总举报数", summary.total],
          ["待处理举报数", summary.pending],
          ["已处理举报数", summary.processed],
        ].map(([label, value]) => (
          <section key={label} className="rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[#8C8C8C]">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </section>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-sm font-bold text-[#4A4A4A] shadow-sm">
          <Loader2 aria-hidden className="size-5 animate-spin text-[#5B6FFF]" />
          正在读取举报记录...
        </div>
      ) : null}

      {error ? <p className="mt-6 rounded-lg bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{error}</p> : null}

      <div className="mt-6 grid gap-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#EEF0FF] px-2 py-1 text-xs font-black text-[#5B6FFF]">
                    {report.reportType}
                  </span>
                  <span className="rounded-md bg-[#F5F7FA] px-2 py-1 text-xs font-black text-[#8C8C8C]">
                    {report.status}
                  </span>
                  <span className="rounded-md bg-[#FFF7E6] px-2 py-1 text-xs font-black text-[#AD6800]">
                    举报次数：{report.reportCount}次
                  </span>
                  {report.highRisk ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF1F0] px-2 py-1 text-xs font-black text-[#FF4D4F]">
                      <ShieldAlert aria-hidden className="size-3" />
                      高风险用户
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 truncate text-sm font-black text-[#1A1A1A]">{report.reportUrl}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{report.reportReason}</p>
                {report.contact ? <p className="mt-2 text-xs font-bold text-[#8C8C8C]">联系方式：{report.contact}</p> : null}
                {report.imageUrl ? (
                  <a href={report.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#5B6FFF]">
                    <Eye aria-hidden className="size-4" />
                    查看举报截图
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  onClick={() => void markProcessed(report.id)}
                  className="min-h-10 rounded-lg bg-[#5B6FFF] px-4 text-sm font-black text-white"
                >
                  标记已处理
                </button>
                <button
                  onClick={() => void deleteReport(report.id)}
                  className="grid size-10 place-items-center rounded-lg bg-[#FFF1F0] text-[#FF4D4F]"
                >
                  <Trash2 aria-label="删除举报记录" className="size-4" />
                </button>
              </div>
            </div>
            {report.highRisk ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E0E0E0] pt-4">
                {["禁用主页", "下架链接", "封禁账号"].map((item) => (
                  <button key={item} className="min-h-9 rounded-lg border border-[#E0E0E0] px-3 text-xs font-black text-[#4A4A4A]">
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
