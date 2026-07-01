"use client";

import { Check, Crown, X } from "lucide-react";

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <section className="w-full max-w-2xl rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-lg)] sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="会员版本说明">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[#8C612E]"><Crown className="size-5" /></span>
            <div><p className="ui-eyebrow">会员版本</p><h2 className="mt-1 text-2xl ui-title">按需要升级，不强制打扰</h2><p className="mt-2 text-sm ui-muted">免费版已经可以完成公开主页闭环；只有使用高级主题和更多能力时才需要升级。</p></div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-[18px] border border-[var(--ui-line)] bg-white p-4">
            <h3 className="font-black">免费版</h3><p className="mt-1 text-sm ui-muted">0 元</p>
            <div className="mt-4 grid gap-2 text-sm"><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />公开主页</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />最多 10 个链接</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />免费主题与二维码</p></div>
          </article>
          <article className="rounded-[18px] border border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/45 p-4">
            <h3 className="font-black text-[var(--ui-brand-hover)]">会员版</h3><p className="mt-1 text-sm font-black text-[var(--ui-brand-hover)]">188 元/年</p>
            <div className="mt-4 grid gap-2 text-sm"><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />高级主题</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />更多链接与数据能力</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />高级二维码与装修</p></div>
          </article>
          <article className="rounded-[18px] border border-[var(--ui-line)] bg-white p-4">
            <h3 className="font-black">企业版</h3><p className="mt-1 text-sm ui-muted">联系开通</p>
            <div className="mt-4 grid gap-2 text-sm"><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />企业资料库</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />AI 助手与团队能力</p><p className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--ui-brand)]" />更高额度和服务支持</p></div>
          </article>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--ui-line)] pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ui-button-secondary">继续使用免费版</button>
          <a href="/help" className="ui-button-primary">查看开通说明</a>
        </div>
      </section>
    </div>
  );
}
