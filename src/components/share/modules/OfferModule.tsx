"use client";

import { useState } from "react";
import { Check, Clock, Gift, Loader, Tag, X } from "lucide-react";

export type OfferPayload = {
  title: string;
  description?: string;
  originalPrice?: string;
  offerPrice?: string;
  discountText?: string;
  coverImageUrl?: string;
  validFrom?: string;
  validUntil?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  couponCode?: string;
};

interface OfferModuleProps {
  payload: OfferPayload | null;
  username: string;
}

function OfferModule({ payload, username }: OfferModuleProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", wechat: "", message: "" });

  if (!payload) return null;

  const title = payload.title || "优惠活动";
  const description = payload.description;
  const originalPrice = payload.originalPrice;
  const offerPrice = payload.offerPrice;
  const discountText = payload.discountText;
  const coverImageUrl = payload.coverImageUrl;
  const validFrom = payload.validFrom;
  const validUntil = payload.validUntil;
  const ctaLabel = payload.ctaLabel;
  const ctaUrl = payload.ctaUrl;
  const couponCode = payload.couponCode;

  const isExpired = validUntil ? new Date(validUntil) < new Date() : false;
  const isActive = validFrom ? new Date(validFrom) <= new Date() : true;
  const isLive = !isExpired && isActive;

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
          offerTitle: title,
          couponCode: couponCode || undefined,
          message: form.message.trim(),
          sourceComponent: "quote",
          sourcePage: `/${username}`,
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

  return (
    <section className="w-full">
      <div className={`flex flex-col overflow-hidden rounded-2xl border shadow-sm ${isLive ? "border-[#6F8F4E]" : "border-[#E8DCCB]"} ${isExpired ? "opacity-60" : ""}`}>
        {coverImageUrl ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-[#F7F1E7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt={title} className="size-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#FFE6E2] to-[#F7F1E7]">
            <Gift className="size-12 text-[#B03A2E]" />
          </div>
        )}

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start gap-2">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${isLive ? "bg-[#DDE8CD] text-[#3F5F31]" : isExpired ? "bg-[#F7F1E7] text-[#7A6D5E]" : "bg-[#EAF3FF] text-[#2563EB]"}`}>
              {isExpired ? "已结束" : isLive ? "进行中" : "未开始"}
            </span>
            {discountText ? <span className="inline-block rounded-full bg-[#FFE6E2] px-2 py-0.5 text-[10px] font-black text-[#B42318]">{discountText}</span> : null}
          </div>

          <h3 className="mt-2 text-sm font-black text-[#2B241E]">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">{description}</p> : null}

          <div className="mt-3 flex items-center gap-3">
            {originalPrice ? <p className="text-sm text-[#7A6D5E] line-through">{originalPrice}</p> : null}
            {offerPrice ? <p className="text-lg font-black text-[#B03A2E]">{offerPrice}</p> : <p className="text-sm text-[#7A6D5E]">联系咨询</p>}
          </div>

          {validUntil ? <p className="mt-2 flex items-center gap-1 text-xs text-[#7A6D5E]"><Clock className="size-3" />有效期至 {new Date(validUntil).toLocaleDateString("zh-CN")}</p> : null}

          {couponCode && isLive ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F7F1E7] px-3 py-2">
              <Tag className="size-4 text-[#6F8F4E]" />
              <span className="text-sm font-black text-[#2B241E]">优惠码：</span>
              <code className="rounded-lg bg-white px-2 py-1 font-mono text-sm font-bold text-[#B03A2E]">{couponCode}</code>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[#E8DCCB] p-3">
          {ctaUrl && isLive ? <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-center text-xs font-black text-[#2B241E] transition hover:bg-[#F7F1E7]">{ctaLabel || "查看详情"}</a> : null}
          {isLive ? <button type="button" onClick={() => setShowForm(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6F8F4E] px-3 py-2 text-xs font-black text-white transition hover:bg-[#5E7F3F]"><Gift className="size-4" />立即咨询</button> : null}
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
                    <img src={coverImageUrl} alt={title} className="size-12 shrink-0 rounded-xl object-cover" />
                  ) : <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#FFE6E2]"><Gift className="size-6 text-[#B03A2E]" /></div>}
                  <div className="min-w-0 flex-1"><p className="text-xs font-black text-[#6F8F4E]">报价咨询</p><p className="mt-0.5 truncate text-base font-black text-[#2B241E]">{title}</p></div>
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
                <label className="grid gap-1.5 text-sm"><span className="font-black text-[#2B241E]">需求说明（选填）</span><textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="想了解什么？" maxLength={300} rows={2} className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none" /></label>
                {error ? <p className="rounded-2xl bg-[#FFE6E2] px-4 py-2 text-sm text-[#B42318]">{error}</p> : null}
                <button type="submit" disabled={loading || submitted} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white transition hover:bg-[#5E7F3F] disabled:opacity-50">{loading ? <><Loader className="size-4 animate-spin" />提交中...</> : <><Gift className="size-4" />提交咨询</>}</button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default OfferModule;
