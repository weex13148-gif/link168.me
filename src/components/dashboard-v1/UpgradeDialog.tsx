"use client";

import { Check, Crown, Sparkles, X } from "lucide-react";
import {
  PLAN_DEFINITIONS,
  PUBLIC_PLAN_ORDER,
  formatPriceDisplay,
  AI_RECEPTION_ADDON,
  type PlanCode,
} from "@/lib/billing/plans";

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const plans = PUBLIC_PLAN_ORDER.map((code: PlanCode) => {
    const plan = PLAN_DEFINITIONS[code];
    return {
      code,
      name: plan.name,
      price: formatPriceDisplay(code, "yearly"),
      features: plan.features.slice(0, 4),
      highlight: Boolean(plan.highlight),
    };
  });

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <section className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-lg)] sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="会员版本说明">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><Crown className="size-5" /></span>
            <div><p className="ui-eyebrow">四档会员</p><h2 className="mt-1 text-2xl ui-title">免费无限链接，按经营需要升级</h2><p className="mt-2 text-sm ui-muted">当前在线收款仅支持支付宝；微信支付后续开放。</p></div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.code} className={`rounded-[18px] border p-4 ${plan.highlight ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/45" : "border-[var(--ui-line)] bg-[var(--ui-surface-strong)]"}`}>
              <h3 className="font-black">{plan.name}</h3><p className="mt-1 text-sm font-black text-[var(--ui-brand-hover)]">{plan.price}</p>
              <div className="mt-4 grid gap-2 text-sm">{plan.features.map((feature) => <p key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />{feature}</p>)}</div>
            </article>
          ))}
        </div>

        {/* AI 接待加油包 */}
        <div className="mt-4 rounded-[18px] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--ui-warning)]" />
              <div>
                <h3 className="font-black text-[var(--ui-ink)]">{AI_RECEPTION_ADDON.name}</h3>
                <p className="text-xs text-[var(--ui-muted)]">{AI_RECEPTION_ADDON.description}</p>
              </div>
            </div>
            <p className="text-sm font-black text-[var(--ui-brand-hover)]">¥{(AI_RECEPTION_ADDON.priceCents / 100).toFixed(1)} / {AI_RECEPTION_ADDON.quantity} 次</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--ui-line)] pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ui-button-secondary">继续使用免费版</button>
          <a href="/workbench/membership" className="ui-button-primary">查看收费方案</a>
        </div>
      </section>
    </div>
  );
}
