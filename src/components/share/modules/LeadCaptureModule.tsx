"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, ReceiptText } from "lucide-react";
import type { LeadFormPayload } from "@/features/profile-modules";
import { PUBLIC_MODULE_SURFACE_STYLE } from "@/components/share/PublicModuleList";

type LeadCaptureModuleProps = {
  payload: LeadFormPayload;
  profileId?: string;
  username: string;
  sourceComponent: "quote" | "contact_form";
};

export function LeadCaptureModule({
  payload,
  profileId,
  username,
  sourceComponent,
}: LeadCaptureModuleProps) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    wechat: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState("");
  const isQuote = sourceComponent === "quote";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || leadId) return;
    if (!form.name.trim()) {
      setError("请填写姓名。");
      return;
    }
    if (!form.phone.trim() && !form.email.trim() && !form.wechat.trim()) {
      setError("请至少填写电话、邮箱或微信号。");
      return;
    }
    if (!profileId) {
      setError("当前为不可提交的预览状态。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          username,
          sourceComponent,
          sourcePage: "/" + username,
          componentTitle: payload.title,
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          wechat: form.wechat.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        leadId?: string;
        error?: string;
      };
      if (!response.ok || !result.success || !result.leadId) {
        setError(result.error || "提交失败，请稍后重试。");
        return;
      }
      setLeadId(result.leadId);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  const Icon = isQuote ? ReceiptText : MessageSquareText;
  if (leadId) {
    return (
      <section data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className="w-full rounded-lg border border-[#DDE8CD] bg-[#EEF4E7] p-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#4F6D37]" />
        <h3 className="mt-3 font-black text-[#2B241E]">提交成功</h3>
        <p className="mt-1 text-xs text-[#4F633F]">主页所有者已收到这条线索。</p>
      </section>
    );
  }

  return (
    <section data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className="w-full rounded-lg border border-[#E8DCCB] bg-[#FFFDF8] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#DDE8CD] text-[#3F5F31]">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="font-black text-[#2B241E]">{payload.title}</h3>
          {payload.description ? <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">{payload.description}</p> : null}
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-xs font-bold text-[#2B241E]">
          姓名
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={50} className="min-h-11 rounded-lg border border-[#E8DCCB] bg-white px-3 text-sm" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-[#2B241E]">
            电话
            <input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} maxLength={32} className="min-h-11 rounded-lg border border-[#E8DCCB] bg-white px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#2B241E]">
            邮箱
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} maxLength={100} className="min-h-11 rounded-lg border border-[#E8DCCB] bg-white px-3 text-sm" />
          </label>
        </div>
        <label className="grid gap-1 text-xs font-bold text-[#2B241E]">
          微信号
          <input value={form.wechat} onChange={(event) => setForm((current) => ({ ...current, wechat: event.target.value }))} maxLength={100} className="min-h-11 rounded-lg border border-[#E8DCCB] bg-white px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-[#2B241E]">
          {isQuote ? "需求说明" : "留言"}
          <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} maxLength={500} rows={3} placeholder={payload.messagePlaceholder} className="resize-y rounded-lg border border-[#E8DCCB] bg-white px-3 py-2 text-sm" />
        </label>
        {error ? <p className="rounded-lg bg-[#FFF1F0] px-3 py-2 text-xs font-bold text-[#B42318]">{error}</p> : null}
        <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
          {loading ? "提交中..." : payload.buttonText || (isQuote ? "提交报价需求" : "提交联系信息")}
        </button>
      </form>
    </section>
  );
}
