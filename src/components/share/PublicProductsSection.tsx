"use client";

import { useState } from "react";
import { Check, Loader, MessageCircle, Package, X } from "lucide-react";

export interface ProductDto {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

function ProductCard({
  product,
  onContact,
}: {
  product: ProductDto;
  onContact: (product: ProductDto) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-sm">
      {product.coverImageUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--ui-surface-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.coverImageUrl} alt={product.name} className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-[var(--ui-surface-muted)]">
          <Package className="size-10 text-[var(--ui-muted)]" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {product.category ? <span className="mb-1 inline-block w-fit rounded-full bg-[var(--ui-surface-muted)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--ui-muted)]">{product.category}</span> : null}
        <h3 className="line-clamp-2 text-sm font-black text-[var(--ui-ink)]">{product.name}</h3>
        {product.description ? <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-[var(--ui-muted)]">{product.description}</p> : null}
        {product.priceText ? <p className="mt-2 text-base font-black text-[var(--ui-danger)]">{product.priceText}</p> : null}
      </div>

      <div className="flex gap-2 border-t border-[var(--ui-line)] p-3">
        {product.ctaUrl ? (
          <a href={product.ctaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 py-2 text-center text-xs font-black text-[var(--ui-ink)] transition hover:bg-[var(--ui-surface-muted)]">
            {product.ctaLabel || "查看详情"}
          </a>
        ) : null}
        <button type="button" onClick={() => onContact(product)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ui-success)] px-3 py-2 text-xs font-black text-[var(--ui-surface)] transition hover:bg-[var(--ui-success)]">
          <MessageCircle className="size-4" />
          咨询
        </button>
      </div>
    </div>
  );
}

function ProductConsultForm({ product, username, onClose }: { product: ProductDto; username: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() && !form.contact.trim()) {
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
          contact: form.contact.trim(),
          message: form.message.trim(),
          productName: product.name,
          sourceComponent: "product_card",
          sourcePage: `/${username}`,
          interestedProductId: product.id,
        }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error ?? "提交失败，请稍后重试。");
        return;
      }
      setSuccess(true);
      window.setTimeout(onClose, 2000);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--ui-ink)]/40 p-4">
      {success ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[30px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-8 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
          <Check className="size-14 text-[var(--ui-success)]" />
          <p className="text-center text-lg font-black text-[var(--ui-ink)]">提交成功</p>
          <p className="text-center text-sm text-[var(--ui-muted)]">主页所有者可以在客户线索中查看。</p>
          <button type="button" onClick={onClose} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ui-success)] px-6 text-sm font-black text-[var(--ui-surface)]">关闭</button>
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-[30px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--ui-line)] pb-4">
            <div className="flex min-w-0 items-center gap-3">
              {product.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.coverImageUrl} alt={product.name} className="size-12 shrink-0 rounded-xl object-cover" />
              ) : <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-surface-muted)]"><Package className="size-6 text-[var(--ui-muted)]" /></div>}
              <div className="min-w-0 flex-1"><p className="text-xs font-black text-[var(--ui-success)]">咨询产品</p><p className="mt-0.5 truncate text-base font-black text-[var(--ui-ink)]">{product.name}</p></div>
            </div>
            <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-5 text-[var(--ui-muted)]" /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="grid gap-1.5 text-sm"><span className="font-black text-[var(--ui-ink)]">姓名</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="如何称呼你" maxLength={50} className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-black text-[var(--ui-ink)]">邮箱、电话或微信</span><input value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} placeholder="方便联系你的方式" maxLength={100} className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-black text-[var(--ui-ink)]">留言（选填）</span><textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={3} maxLength={500} placeholder="你想了解什么？" className="resize-none rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3" /></label>
            {error ? <p className="rounded-2xl bg-[var(--ui-danger-soft)] px-4 py-2 text-sm text-[var(--ui-danger)]">{error}</p> : null}
            <button type="submit" disabled={loading} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ui-success)] text-sm font-black text-[var(--ui-surface)] disabled:opacity-50">
              {loading ? <><Loader className="size-4 animate-spin" />提交中...</> : <><MessageCircle className="size-4" />提交咨询</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function PublicProductsSection({ products, username }: { products: ProductDto[]; username: string }) {
  const [contactProduct, setContactProduct] = useState<ProductDto | null>(null);
  if (products.length === 0) return null;

  return (
    <>
      <section className="mt-6 w-full">
        <div className="mb-3 flex items-center gap-2">
          <Package className="size-4 text-[var(--ui-success)]" />
          <h2 className="text-sm font-black text-[var(--ui-brand)]">产品与服务</h2>
          <span className="rounded-full bg-[var(--ui-surface-muted)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-muted)]">{products.length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => <ProductCard key={product.id} product={product} onContact={setContactProduct} />)}
        </div>
      </section>
      {contactProduct ? <ProductConsultForm product={contactProduct} username={username} onClose={() => setContactProduct(null)} /> : null}
    </>
  );
}
