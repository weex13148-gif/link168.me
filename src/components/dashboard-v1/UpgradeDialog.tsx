"use client";

import { Check, Crown, X } from "lucide-react";

const plans = [
  { name: "免费版", price: "0元", features: ["无限链接", "基础主题与二维码", "保留 Link168 品牌"] },
  { name: "Plus", price: "188元/年", features: ["基础访客AI助理", "基础资料交付", "更多主题"] },
  { name: "Pro", price: "388元/年", features: ["客户线索", "更多AI额度", "高级数据"] },
  { name: "企业会员", price: "1288元/年", features: ["企业主页", "高级AI客服", "独立域名名额"] },
  { name: "企业专业Plus", price: "3988元/年", features: ["多成员", "多知识空间", "企业优先服务"] },
];

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <section className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-lg)] sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="会员版本说明">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[#8C612E]"><Crown className="size-5" /></span>
            <div><p className="ui-eyebrow">五档会员</p><h2 className="mt-1 text-2xl ui-title">免费无限链接，按经营需要升级</h2><p className="mt-2 text-sm ui-muted">当前在线收款仅支持支付宝；微信支付后续开放。</p></div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`rounded-[18px] border p-4 ${index === 2 ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/45" : "border-[var(--ui-line)] bg-white"}`}>
              <h3 className="font-black">{plan.name}</h3><p className="mt-1 text-sm font-black text-[var(--ui-brand-hover)]">{plan.price}</p>
              <div className="mt-4 grid gap-2 text-sm">{plan.features.map((feature) => <p key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />{feature}</p>)}</div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--ui-line)] pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ui-button-secondary">继续使用免费版</button>
          <a href="/console/membership" className="ui-button-primary">查看收费方案</a>
        </div>
      </section>
    </div>
  );
}
