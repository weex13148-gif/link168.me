/**
 * 公开主页产品展示组件
 * 展示产品卡片列表，点击咨询按钮弹出咨询表单
 */
"use client";

import { useState } from "react";
import { Package, MessageCircle, Loader } from "lucide-react";

interface ProductDto {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

interface ProductCardProps {
  product: ProductDto;
  username: string;
  onContact: (productId: string) => void;
}

function ProductCard({ product, onContact }: ProductCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white shadow-sm">
      {/* 封面图 */}
      {product.coverImageUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-[#F7F1E7]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.coverImageUrl}
            alt={product.name}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-[#F7F1E7]">
          <Package className="size-10 text-[#C8B89A]" />
        </div>
      )}

      {/* 产品信息 */}
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="mb-1 inline-block w-fit rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#7A6D5E]">
            {product.category}
          </span>
        )}
        <h3 className="text-sm font-black text-[#2B241E] line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1 flex-1 text-xs leading-5 text-[#7A6D5E] line-clamp-2">
            {product.description}
          </p>
        )}
        {product.priceText && (
          <p className="mt-2 text-base font-black text-[#B03A2E]">
            {product.priceText}
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 border-t border-[#E8DCCB] p-3">
        {product.ctaUrl && (
          <a
            href={product.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-center text-xs font-black text-[#2B241E] transition hover:bg-[#F7F1E7]"
          >
            {product.ctaLabel || "查看详情"}
          </a>
        )}
        <button
          onClick={() => onContact(product.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6F8F4E] px-3 py-2 text-xs font-black text-white transition hover:bg-[#5E7F3F]"
        >
          <MessageCircle className="size-4" />
          咨询
        </button>
      </div>
    </div>
  );
}

interface ProductConsultFormProps {
  product: ProductDto;
  username: string;
  onClose: () => void;
}

function ProductConsultForm({ product, username, onClose }: ProductConsultFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    message: `我想了解「${product.name}」的更多信息`,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() && !form.contact.trim()) {
      setError("请填写姓名或联系方式。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          name: form.name.trim(),
          contact: form.contact.trim(),
          message: form.message.trim(),
          sourceComponent: "product_card",
          sourcePage: `/${username}/products`,
          interestedProductId: product.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "提交失败，请稍后重试。");
        return;
      }

      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
          <svg className="size-14 text-[#6F8F4E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-center text-lg font-black text-[#2B241E]">提交成功！</p>
          <p className="text-center text-sm text-[#7A6D5E]">
            @{username} 的工作人员将尽快联系你。
          </p>
          <button
            onClick={onClose}
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4">
      <div className="w-full max-w-sm rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
        {/* 产品信息头部 */}
        <div className="mb-4 flex items-center gap-3 border-b border-[#E8DCCB] pb-4">
          {product.coverImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.coverImageUrl}
              alt={product.name}
              className="size-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F7F1E7]">
              <Package className="size-6 text-[#C8B89A]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[#6F8F4E]">咨询产品</p>
            <p className="mt-0.5 truncate text-base font-black text-[#2B241E]">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#F2E7D8]"
          >
            <svg className="size-5 text-[#7A6D5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">姓名 *</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="如何称呼你"
              maxLength={50}
              className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">邮箱或电话 *</span>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="邮箱或手机号码"
              maxLength={100}
              className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">留言（选填）</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="有什么想了解的？"
              rows={3}
              maxLength={500}
              className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-[#FFE6E2] px-4 py-2 text-sm text-[#B42318]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="size-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                提交咨询
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface PublicProductsSectionProps {
  products: ProductDto[];
  username: string;
}

export function PublicProductsSection({ products, username }: PublicProductsSectionProps) {
  const [contactProduct, setContactProduct] = useState<ProductDto | null>(null);

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <section className="mt-6 w-full">
        <div className="mb-3 flex items-center gap-2">
          <Package className="size-4 text-[#6F8F4E]" />
          <h2 className="text-sm font-black text-[#3F5F31]">产品与服务</h2>
          <span className="rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[10px] font-black text-[#7A6D5E]">
            {products.length}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              username={username}
              onContact={(productId) => {
                const p = products.find((x) => x.id === productId);
                if (p) setContactProduct(p);
              }}
            />
          ))}
        </div>
      </section>

      {/* 产品咨询弹窗 */}
      {contactProduct && (
        <ProductConsultForm
          product={contactProduct}
          username={username}
          onClose={() => setContactProduct(null)}
        />
      )}
    </>
  );
}

export type { ProductDto };
