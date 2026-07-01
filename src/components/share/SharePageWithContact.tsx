"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Loader, MessageCircle, X } from "lucide-react";
import { PublicProductsSection, type ProductDto } from "@/components/share/PublicProductsSection";
import { QrCodeModal } from "@/components/share/QrCodeModal";
import { ShareModal } from "@/components/share/ShareModal";
import { SharePageRenderer, type SharePageTemplate } from "@/components/share/SharePageRenderer";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type Props = {
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
  interestedProductId?: string;
};

function originalUrlFromPayload(payloadRaw: string | null | undefined) {
  if (!payloadRaw) return null;
  try {
    const payload = JSON.parse(payloadRaw) as { url?: unknown };
    if (typeof payload.url !== "string") return null;
    const checked = sanitizePublicUrl(payload.url);
    return checked.safe ? checked.url : null;
  } catch {
    return null;
  }
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    contact: "",
    message: "",
    productId: interestedProductId || "",
  });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() && !form.contact.trim()) {
      setError("请填写姓名或联系方式。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
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
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error || "提交失败，请稍后重试。");
        return;
      }
      setSuccess(true);
      window.setTimeout(onClose, 1800);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/45 p-4" onClick={onClose} role="presentation">
      <section
        className="w-full max-w-sm rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_24px_80px_rgba(43,36,30,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">联系主页所有者</p>
            <h2 id="contact-title" className="mt-1 text-xl font-black text-[#2B241E]">@{username}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl bg-[#F2E7D8]" aria-label="关闭">
            <X className="size-5 text-[#7A6D5E]" />
          </button>
        </div>

        {success ? (
          <div className="mt-6 rounded-2xl bg-[#EEF4E7] p-6 text-center">
            <CheckCircle className="mx-auto size-12 text-[#6F8F4E]" />
            <p className="mt-3 font-black text-[#355126]">提交成功</p>
            <p className="mt-2 text-sm text-[#4F633F]">主页所有者会尽快与你联系。</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            {products.length ? (
              <label className="grid gap-1.5 text-sm">
                <span className="font-black">咨询产品（选填）</span>
                <select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-xl border border-[#E8DCCB] bg-white px-4 py-3">
                  <option value="">不指定产品</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.priceText ? ` - ${product.priceText}` : ""}</option>)}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1.5 text-sm">
              <span className="font-black">姓名</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={50} placeholder="如何称呼你" className="rounded-xl border border-[#E8DCCB] bg-white px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-black">邮箱或电话</span>
              <input value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} maxLength={100} placeholder="方便联系你的方式" className="rounded-xl border border-[#E8DCCB] bg-white px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-black">留言（选填）</span>
              <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={3} maxLength={500} placeholder="有什么想了解的？" className="resize-none rounded-xl border border-[#E8DCCB] bg-white px-4 py-3" />
            </label>
            {error ? <p className="rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}
            <button type="submit" disabled={loading} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] text-sm font-black text-white disabled:opacity-50">
              {loading ? <Loader className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {loading ? "提交中…" : "提交联系信息"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export function SharePageWithContact(props: Props) {
  const [showContact, setShowContact] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const directLinks = useMemo(() => props.links.map((link) => {
    const originalUrl = originalUrlFromPayload(link.payload);
    if (originalUrl && (!link.url || link.url.startsWith("/go/"))) {
      return { ...link, url: originalUrl };
    }
    return link;
  }), [props.links]);

  const pageUrl = typeof window === "undefined" ? "" : window.location.href;

  return (
    <>
      <SharePageRenderer
        template={props.template}
        username={props.username}
        displayName={props.displayName}
        bio={props.bio}
        avatarUrl={props.avatarUrl}
        links={directLinks}
        themeName={props.themeName}
        showBrandFoot={props.showBrandFoot}
        reportUrl={props.reportUrl || undefined}
        onQrCodeClick={() => setShowQrCode(true)}
        onShareClick={() => setShowShare(true)}
      />

      {props.products?.length ? <PublicProductsSection products={props.products} username={props.username} /> : null}

      {!props.reportUrl ? (
        <button type="button" onClick={() => setShowContact(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#6F8F4E] px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-[#5E7F3F]" aria-label="联系">
          <MessageCircle className="size-5" />
          联系
        </button>
      ) : null}

      {showContact ? <ContactForm username={props.username} products={props.products} interestedProductId={props.interestedProductId} onClose={() => setShowContact(false)} /> : null}

      <QrCodeModal isOpen={showQrCode} onClose={() => setShowQrCode(false)} pageUrl={pageUrl} displayName={props.displayName} username={props.username} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} pageUrl={pageUrl} displayName={props.displayName} username={props.username} onOpenQrCode={() => setShowQrCode(true)} />
    </>
  );
}
