"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Suspense } from "react";
import { Loader2, Send } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { SiteFooter } from "@/components/SiteFooter";

const reportTypes = ["诈骗", "赌博", "色情", "侵权", "黑灰产", "违法违规", "其他"];

function ReportForm() {
  const searchParams = useSearchParams();
  const [reportUrl, setReportUrl] = useState(searchParams.get("url") || "");
  const [reportType, setReportType] = useState("诈骗");
  const [reportReason, setReportReason] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("reportUrl", reportUrl);
    formData.append("reportType", reportType);
    formData.append("reportReason", reportReason);
    formData.append("contact", contact);
    if (image) formData.append("image", image);

    setLoading(true);
    const response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as { success?: boolean; message?: string; error?: string };
    setLoading(false);

    if (!response.ok || !result.success) {
      setError(result.error || "举报提交失败，请稍后重试。");
      return;
    }

    setMessage(result.message || "举报已提交，管理员将在审核后处理。");
    setReportReason("");
    setContact("");
    setImage(null);
    event.currentTarget.reset();
  }

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <LogoMark />
          <Link href="/" className="text-sm font-bold text-[#5B6FFF]">
            返回首页
          </Link>
        </div>

        <section className="mt-8 rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-3xl font-black">举报中心</h1>
          <p className="mt-3 text-sm leading-7 text-[#4A4A4A]">
            如发现 link168.me 用户主页存在违法违规、诈骗、赌博、色情、侵权、黑灰产等内容，请通过以下表单举报。
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">被举报链接</span>
              <input
                required
                value={reportUrl}
                onChange={(event) => setReportUrl(event.target.value)}
                placeholder="https://link168.me/username"
                className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none focus:border-[#5B6FFF]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">举报类型</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
                className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none focus:border-[#5B6FFF]"
              >
                {reportTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">举报说明</span>
              <textarea
                required
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="请说明举报原因和相关情况"
                className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 outline-none focus:border-[#5B6FFF]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">联系方式</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="选填，便于补充核实"
                className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none focus:border-[#5B6FFF]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">上传截图</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                className="mt-2 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm"
              />
            </label>

            {error ? <p className="rounded-lg bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{error}</p> : null}
            {message ? <p className="rounded-lg bg-[#F6FFED] px-4 py-3 text-sm font-bold text-[#237804]">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#5B6FFF] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5" />}
              提交举报
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8 sm:px-6">
          <LogoMark />
        </main>
      }
    >
      <ReportForm />
    </Suspense>
  );
}
