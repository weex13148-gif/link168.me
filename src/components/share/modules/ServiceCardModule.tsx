"use client";

import { useState } from "react";
import { CalendarClock, Check, ConciergeBell, Loader, MessageCircle, X } from "lucide-react";

export type ServiceCardPayload = {
  serviceId?: string;
  name: string;
  category?: string;
  description?: string;
  priceText?: string;
  coverImageUrl?: string;
  availability?: string;
  duration?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  allowBooking?: boolean;
};

interface ServiceCardModuleProps {
  payload: ServiceCardPayload | null;
  username: string;
}

function ServiceCardModule({ payload, username }: ServiceCardModuleProps) {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"consult" | "booking">("consult");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    wechat: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  if (!payload) return null;

  const name = payload.name || "服务";
  const category = payload.category;
  const description = payload.description;
  const priceText = payload.priceText;
  const coverImageUrl = payload.coverImageUrl;
  const availability = payload.availability;
  const duration = payload.duration;
  const ctaLabel = payload.ctaLabel;
  const ctaUrl = payload.ctaUrl;
  const allowBooking = payload.allowBooking !== false;
  const serviceId = payload.serviceId;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitted) return;

    if (!form.name.trim() && !form.phone.trim() && !form.email.trim() && !form.wechat.trim()) {
      setError("请填写姓名或联系方式。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          name: form.name.trim(),
          contact: form.phone.trim() || form.email.trim() || form.wechat.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          wechat: form.wechat.trim() || undefined,
          preferredDate: form.preferredDate || undefined,
          preferredTime: form.preferredTime || undefined,
          serviceName: name,
          message: form.message.trim(),
          sourceComponent: formType === "booking" ? "booking" : "quote",
          sourcePage: `/${username}`,
          interestedProductId: serviceId || undefined,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error ?? "提交失败，请稍后重试。");
        return;
      }

      setSubmitted(true);
      setSuccess(true);
      window.setTimeout(() => setShowForm(false), 2000);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  function openForm(type: "consult" | "booking") {
    setFormType(type);
    setShowForm(true);
  }

  return (
    <section className="w-full">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white shadow-sm">
        {coverImageUrl ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-[#F7F1E7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt={name} className="size-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#DDE8CD] to-[#F7F1E7]">
            <ConciergeBell className="size-12 text-[#6F8F4E]" />
          </div>
        )}

        <div className="flex flex-1 flex-col p-4">
          {category ? <span className="mb-1 inline-block w-fit rounded-full bg-[#DDE8CD] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#3F5F31]">{category}</span> : null}
          <h3 className="line-clamp-2 text-sm font-black text-[#2B241E]">{name}</h3>
          {description ? <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-[#7A6D5E]">{description}</p> : null}
          {availability ? <p className="mt-2 text-xs text-[#3F5F31]">可预约时间：{availability}</p> : null}
          {duration ? <p className="mt-1 text-xs text-[#7A6D5E]">服务时长：{duration}</p> : null}
          {priceText ? <p className="mt-2 text-base font-black text-[#B03A2E]">{priceText}</p> : <p className="mt-2 text-sm text-[#7A6D5E]">联系咨询</p>}
        </div>

        <div className="flex gap-2 border-t border-[#E8DCCB] p-3">
          {ctaUrl ? <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-center text-xs font-black text-[#2B241E] transition hover:bg-[#F7F1E7]">{ctaLabel || "查看详情"}</a> : null}
          {allowBooking ? <button type="button" onClick={() => openForm("booking")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#6F8F4E] bg-white px-3 py-2 text-xs font-black text-[#6F8F4E] transition hover:bg-[#DDE8CD]"><CalendarClock className="size-4" />预约</button> : null}
          <button type="button" onClick={() => openForm("consult")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6F8F4E] px-3 py-2 text-xs font-black text-white transition hover:bg-[#5E7F3F]"><MessageCircle className="size-4" />咨询</button>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4">
          {success ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
              <Check className="size-14 text-[#6F8F4E]" />
              <p className="text-center text-lg font-black text-[#2B241E]">提交成功</p>
              <p className="text-center text-sm text-[#7A6D5E]">主页所有者可以在客户线索中查看。</p>
              <button type="button" onClick={() => setShowForm(false)} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white">关闭</button>
            </div>
          ) : (
            <div className="w-full max-w-md rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
              <div className="mb-4 flex items-center justify-between border-b border-[#E8DCCB] pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImageUrl} alt={name} className="size-12 shrink-0 rounded-xl object-cover" />
                  ) : <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#DDE8CD]"><ConciergeBell className="size-6 text-[#6F8F4E]" /></div>}
                  <div className="min-w-0 flex-1"><p className="text-xs font-black text-[#6F8F4E]">{formType === "booking" ? "预约服务" : "咨询服务"}</p><p className="mt-0.5 truncate text-base font-black text-[#2B241E]">{name}</p></div>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#F2E7D8]" aria-label="关闭"><X className="size-5 text-[#7A6D5E]" /></button>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-3">
                <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">姓名 *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="如何称呼你" maxLength={50} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">电话</span><input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="手机号码" maxLength={20} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                  <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">邮箱</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="邮箱地址" maxLength={100} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                </div>
                <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">微信号（选填）</span><input value={form.wechat} onChange={(event) => setForm((current) => ({ ...current, wechat: event.target.value }))} placeholder="微信号" maxLength={50} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                {formType === "booking" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">期望日期</span><input type="date" value={form.preferredDate} onChange={(event) => setForm((current) => ({ ...current, preferredDate: event.target.value }))} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none" /></label>
                    <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">期望时间</span><input type="time" value={form.preferredTime} onChange={(event) => setForm((current) => ({ ...current, preferredTime: event.target.value }))} className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none" /></label>
                  </div>
                ) : null}
                <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">备注（选填）</span><textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="其他需求说明" maxLength={300} rows={2} className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                {error ? <p className="rounded-2xl bg-[#FFE6E2] px-4 py-2 text-sm text-[#B42318]">{error}</p> : null}
                <button type="submit" disabled={loading || submitted} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white transition hover:bg-[#5E7F3F] disabled:opacity-50">{loading ? <><Loader className="size-4 animate-spin" />提交中...</> : <><MessageCircle className="size-4" />{formType === "booking" ? "提交预约" : "提交咨询"}</>}</button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default ServiceCardModule;
