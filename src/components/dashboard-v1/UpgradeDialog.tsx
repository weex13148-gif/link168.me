"use client";

import { Check, Crown, X } from "lucide-react";
import { MAINLINE_ORDINARY_PLAN_FACTS } from "@/lib/product/mainline";

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <section className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-lg)] sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="会员版本说明">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[#8C612E]"><Crown className="size-5" /></span>
            <div><p className="ui-eyebrow">三档方案</p><h2 className="mt-1 text-2xl ui-title">Free 当前可用，Plus / Pro 等待正式开放</h2><p className="mt-2 text-sm ui-muted">正式价格、权益与支付方式完成核验后再开放购买。</p></div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {MAINLINE_ORDINARY_PLAN_FACTS.map((plan) => (
            <article key={plan.name} className={`rounded-[18px] border p-4 ${plan.code === "pro" ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/45" : "border-[var(--ui-line)] bg-white"}`}>
              <h3 className="font-black">{plan.name}</h3>
              <p className="mt-1 text-sm font-black text-[var(--ui-brand-hover)]">{plan.availability}</p>
              <p className="mt-1 text-xs ui-muted">{plan.purchaseState}</p>
              <div className="mt-4 grid gap-2 text-sm">{plan.features.map((feature) => <p key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />{feature}</p>)}</div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--ui-line)] pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ui-button-secondary">继续使用 Free</button>
        </div>
      </section>
    </div>
  );
}
