/**
 * 公开主页联系表单 FAB（Floating Action Button）
 * 访客点击"联系"按钮 → 弹出表单 → 提交创建 Lead
 *
 * 使用方式：
 * <SharePageWithContact username={profile.username} displayName={...} bio={...} products={products} ... />
 *
 * 与 SharePageRenderer 完全相同的 props，额外增加联系表单功能。
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, CheckCircle, Loader } from "lucide-react";
import {
  SharePageRenderer,
  type SharePageTemplate,
} from "@/components/share/SharePageRenderer";
import {
  PublicProductsSection,
  type ProductDto,
} from "@/components/share/PublicProductsSection";
import { QrCodeModal } from "@/components/share/QrCodeModal";
import { ShareModal } from "@/components/share/ShareModal";

interface Props {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  links: Parameters<typeof SharePageRenderer>[0]["links"];
  themeName: string;
  reportUrl?: string;
  template?: SharePageTemplate;
  showBrandFoot?: boolean;
  products?: ProductDto[];
}

function ContactForm({
  username,
  products = [],
  interestedProductId,
  onClose,
}: {
  username: string;
  products?: ProductDto[];
  interestedProductId?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    message: "",
    productId: interestedProductId || "",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 焦点管理
  useEffect(() => {
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape 键关闭
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          sourceComponent: "contact_fab",
          interestedProductId: form.productId || undefined,
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
      <div 
        className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4" 
        role="presentation"
        onClick={onClose}
      >
        <div 
          className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 shadow-[0_18px_55px_rgba(86,68,46,0.12)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-success-title"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle className="size-14 text-[#6F8F4E]" aria-hidden="true" />
          <h2 id="contact-success-title" className="text-center text-lg font-black text-[#2B241E]">提交成功！</h2>
          <p className="text-center text-sm text-[#7A6D5E]">
            @{username} 的工作人员将尽快与你联系。
          </p>
          <button
            onClick={onClose}
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-[#6F8F4E] focus:ring-offset-2"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4" 
      role="presentation"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">联系</p>
            <h2 id="contact-form-title" className="mt-1 text-xl font-black text-[#2B241E]">
              @{username}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="grid size-10 place-items-center rounded-2xl bg-[#F2E7D8] hover:bg-[#E8DCCB] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
            aria-label="关闭"
          >
            <X className="size-5 text-[#7A6D5E]" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="mt-5 grid gap-3">
          {products.length > 0 && (
            <div className="grid gap-1.5 text-sm">
              <label htmlFor="contact-product" className="font-black text-[#2B241E]">咨询产品（选填）</label>
              <select
                id="contact-product"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
              >
                <option value="">不指定产品</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.priceText ? ` - ${p.priceText}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="contact-name" className="font-black text-[#2B241E]">姓名 *</label>
            <input
              id="contact-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="如何称呼你"
              maxLength={50}
              required={!form.contact.trim()}
              className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
            />
          </div>

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="contact-info" className="font-black text-[#2B241E]">邮箱或电话 *</label>
            <input
              id="contact-info"
              type="text"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="邮箱或手机号码，方便联系你"
              maxLength={100}
              required={!form.name.trim()}
              className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
            />
          </div>

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="contact-message" className="font-black text-[#2B241E]">留言（选填）</label>
            <textarea
              id="contact-message"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="有什么想了解的？"
              rows={3}
              maxLength={500}
              className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-[#FFE6E2] px-4 py-2 text-sm text-[#B42318]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="link168-button-press mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#6F8F4E] focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader className="size-4 animate-spin" aria-hidden="true" />
                提交中...
              </>
            ) : (
              <>
                <CheckCircle className="size-4" aria-hidden="true" />
                提交
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface SharePageWithContactProps extends Props {
  interestedProductId?: string;
}

export function SharePageWithContact(props: SharePageWithContactProps) {
  const [showContact, setShowContact] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const getPageUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  return (
    <>
      {/* 渲染原始分享页面 */}
      <SharePageRenderer
        template={props.template}
        username={props.username}
        displayName={props.displayName}
        bio={props.bio}
        avatarUrl={props.avatarUrl}
        links={props.links}
        themeName={props.themeName}
        showBrandFoot={props.showBrandFoot}
        reportUrl={props.reportUrl || undefined}
        onQrCodeClick={() => setShowQrCode(true)}
        onShareClick={() => setShowShare(true)}
      />

      {/* 产品展示区域 */}
      {props.products && props.products.length > 0 && (
        <PublicProductsSection
          products={props.products}
          username={props.username}
        />
      )}

      {/* 浮窗联系按钮 */}
      {!props.reportUrl && (
        <button
          onClick={() => setShowContact(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#6F8F4E] px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-[#5E7F3F] active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#6F8F4E] focus:ring-offset-2"
          aria-label="联系"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          <span>联系</span>
        </button>
      )}

      {/* 联系表单弹窗 */}
      {showContact && (
        <ContactForm
          username={props.username}
          products={props.products}
          interestedProductId={props.interestedProductId}
          onClose={() => setShowContact(false)}
        />
      )}

      {/* 二维码弹窗 */}
      <QrCodeModal
        isOpen={showQrCode}
        onClose={() => setShowQrCode(false)}
        pageUrl={getPageUrl()}
        displayName={props.displayName}
        username={props.username}
      />

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        pageUrl={getPageUrl()}
        displayName={props.displayName}
        username={props.username}
        onOpenQrCode={() => setShowQrCode(true)}
      />
    </>
  );
}
