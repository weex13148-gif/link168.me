/**
 * Products 交互组件：列表展示 + 新增/编辑表单
 */
"use client";

import { useState } from "react";
import { Plus, Sparkles, Package, X, Check, Trash2, ExternalLink } from "lucide-react";
import type { Product } from "@/generated/prisma/client";

type ProductWithDates = Product & {
  createdAt: Date;
  updatedAt: Date;
};

type ProductDto = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_text: string | null;
  cover_image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
  allow_ai_recommendation: boolean;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  "SaaS",
  "运营",
  "会员",
  "咨询",
  "硬件",
  "教育",
  "医疗",
  "金融",
  "零售",
  "其他",
];

interface Props {
  initialProducts: ProductWithDates[];
}

export default function ProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<ProductWithDates[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "其他",
    description: "",
    priceText: "",
    ctaLabel: "",
    ctaUrl: "",
    isActive: true,
    allowAiRecommendation: true,
  });

  function openCreate() {
    setForm({
      name: "",
      category: "其他",
      description: "",
      priceText: "",
      ctaLabel: "",
      ctaUrl: "",
      isActive: true,
      allowAiRecommendation: true,
    });
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(product: ProductWithDates) {
    setForm({
      name: product.name,
      category: product.category ?? "其他",
      description: product.description ?? "",
      priceText: product.priceText ?? "",
      ctaLabel: product.ctaLabel ?? "",
      ctaUrl: product.ctaUrl ?? "",
      isActive: product.isActive,
      allowAiRecommendation: product.allowAiRecommendation,
    });
    setEditingId(product.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("请输入产品名称。");
      return;
    }

    setLoading(true);
    setError(null);

    const url = editingId
      ? `/api/dashboard/products/${editingId}`
      : "/api/dashboard/products";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "保存失败，请重试。");
        return;
      }

      // 更新本地状态
      if (editingId) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  ...data.product,
                  createdAt: new Date(data.product.created_at),
                  updatedAt: new Date(),
                }
              : p
          )
        );
      } else {
        setProducts((prev) => [
          {
            ...data.product,
            userId: data.product.user_id,
            sortOrder: data.product.sort_order,
            isActive: data.product.is_active,
            allowAiRecommendation: data.product.allow_ai_recommendation,
            createdAt: new Date(data.product.created_at),
            updatedAt: new Date(),
          } as ProductWithDates,
          ...prev,
        ]);
      }

      setShowForm(false);
      setEditingId(null);
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除该产品？删除后无法恢复。")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isActive: data.product.is_active,
                  updatedAt: new Date(),
                }
              : p
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#3F5F31]">你的产品与服务</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">点击编辑详细资料，或新增一个产品条目。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreate}
            className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white hover:bg-[#5E7F3F]"
          >
            <Plus aria-hidden className="size-4" />
            新增产品
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl bg-[#FFE6E2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      {/* 产品列表 */}
      {products.length === 0 ? (
        <div className="mt-4 grid min-h-[180px] place-items-center rounded-[28px] border border-dashed border-[#E8DCCB] p-5 text-center">
          <div>
            <p className="text-sm font-black text-[#2B241E]">还没有产品？</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">先新增一个产品或服务条目。</p>
            <button
              onClick={openCreate}
              className="mt-4 link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white"
            >
              <Plus aria-hidden className="size-4" />
              新增产品
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex h-full flex-col justify-between rounded-[28px] border border-[#E8DCCB] bg-[#F7F1E7] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-[#3F5F31] ring-1 ring-[#E8DCCB]">
                      {product.name.charAt(0)}
                    </span>
                    <span className="rounded-full bg-[#DDE8CD] px-3 py-1 text-xs font-black text-[#3F5F31]">
                      {product.category ?? "其他"}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                      product.isActive ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E]"
                    }`}
                  >
                    {product.isActive ? "在售" : "已下架"}
                  </span>
                </div>
                <p className="mt-3 text-base font-black text-[#2B241E]">{product.name}</p>
                {product.description && (
                  <p className="mt-1 text-xs text-[#7A6D5E]">{product.description}</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-lg font-black text-[#6F8F4E]">
                  {product.priceText ?? "价格待定"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(product.id, product.isActive)}
                    disabled={loading}
                    className="link168-button-press grid size-8 place-items-center rounded-xl bg-white text-xs text-[#3F5F31] ring-1 ring-[#E8DCCB]"
                    title={product.isActive ? "下架" : "上架"}
                  >
                    {product.isActive ? <X aria-hidden className="size-3" /> : <Check aria-hidden className="size-3" />}
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    disabled={loading}
                    className="link168-button-press grid size-8 place-items-center rounded-xl bg-white text-xs text-[#3F5F31] ring-1 ring-[#E8DCCB]"
                    title="编辑"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={loading}
                    className="link168-button-press grid size-8 place-items-center rounded-xl bg-[#FFE6E2] text-xs text-[#B42318]"
                    title="删除"
                  >
                    <Trash2 aria-hidden className="size-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4">
          <div className="w-full max-w-md rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#3F5F31]">
                {editingId ? "编辑产品" : "新增产品"}
              </p>
              <button
                onClick={() => setShowForm(false)}
                className="grid size-9 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E]"
              >
                <X aria-hidden className="link168-nav-icon" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">产品名称 *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：企业 AI 名片服务"
                  maxLength={80}
                  className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">类目</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">描述</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="简要描述产品特点和优势"
                  maxLength={400}
                  rows={3}
                  className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]/20"
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">价格文本</span>
                <input
                  type="text"
                  value={form.priceText}
                  onChange={(e) => setForm((f) => ({ ...f, priceText: e.target.value }))}
                  placeholder="例如：¥ 980 / 年"
                  className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-black text-[#2B241E]">按钮文案</span>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="例如：立即购买"
                    className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-black text-[#2B241E]">跳转链接</span>
                  <input
                    type="url"
                    value={form.ctaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="https://..."
                    className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <span className="font-bold text-[#2B241E]">上架销售</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.allowAiRecommendation}
                    onChange={(e) => setForm((f) => ({ ...f, allowAiRecommendation: e.target.checked }))}
                    className="size-4 rounded"
                  />
                  <span className="font-bold text-[#2B241E]">允许 AI 推荐</span>
                </label>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="link168-button-press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
                >
                  {loading ? "保存中..." : editingId ? "保存修改" : "创建产品"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#F7F1E7] px-4 text-sm font-black text-[#3F5F31] ring-1 ring-[#E8DCCB]"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
