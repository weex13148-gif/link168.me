"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Loader, MessageCircle, X } from "lucide-react";
import { PublicAiAssistant } from "@/components/share/PublicAiAssistant";
import { PublicProductsSection, type ProductDto } from "@/components/share/PublicProductsSection";
import { QrCodeModal } from "@/components/share/QrCodeModal";
import { ShareModal } from "@/components/share/ShareModal";
import { SharePageRenderer, type SharePageTemplate } from "@/components/share/SharePageRenderer";
import { sanitizePublicUrl } from "@/lib/public-url-security";

const VISITOR_ID_KEY = "link168_visitor_id";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return "";
  }
}

type Props = {
  profileId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  links: Parameters<typeof SharePageRenderer>[0]["links"];
  themeName: string;
  customTheme?: string | null;
  reportUrl?: string;
  template?: SharePageTemplate;
  showBrandFoot?: boolean;
  products?: ProductDto[];
  interestedProductId?: string;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  contactVisibility?: string;
  onQrCodeClick?: () => void;
  onShareClick?: () => void;
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

function normalizePublicLinkUrl(url: string | null | undefined, payload: string | null | undefined) {
  const payloadUrl = originalUrlFromPayload(payload);
  if (payloadUrl) return payloadUrl;
  if (!url || url.startsWith("/go/")) return null;
  const checked = sanitizePublicUrl(url);
  return checked.safe ? checked.url : null;
}

function BrandFooter() {
  return (
    <a
      href={process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}
      className="mx-auto mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-black text-[#3F5F31] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      aria-label="访问 Link168 官网"
    >
      <span className="grid size-7 place-items-center rounded-xl bg-[#6F8F4E] text-xs font-black text-white">L</span>
      由 Link168 提供
    </a>
  );
}

function ContactForm({
  profileId,
  username,
  products = [],
  interestedProductId,
  onClose,
}: {
  profileId: string;
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
    if (!form.name.trim()) {
      setError("请填写姓名。");
      return;
    }
    if (!form.contact.trim()) {
      setError("请填写联系方式。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          username,
          name: form.name.trim(),
          contact: form.contact.trim(),
          message: form.message.trim(),
          sourceComponent: "contact_form",
          sourcePage: `/${username}`,
          interestedProductId: form.productId || undefined,
        }),
      });
      const result = (await response.json()) as { success?: boolean; leadId?: string; error?: string };
      if (!response.ok || !result.success || !result.leadId) {
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
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#2B241E]/45 p-4" onClick={onClose} role="presentation">
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
            <p className="mt-2 text-sm text-[#4F633F]">主页所有者会在客户线索中查看你的信息。</p>
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
              <span className="font-black">邮箱、电话或微信</span>
              <input value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} maxLength={100} placeholder="方便联系你的方式" className="rounded-xl border border-[#E8DCCB] bg-white px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-black">留言（选填）</span>
              <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={3} maxLength={500} placeholder="你想咨询什么内容？" className="resize-none rounded-xl border border-[#E8DCCB] bg-white px-4 py-3" />
            </label>
            {error ? <p className="rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}
            <button type="submit" disabled={loading} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] text-sm font-black text-white disabled:opacity-50">
              {loading ? <Loader className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {loading ? "提交中..." : "提交联系信息"}
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

  const directLinks = useMemo(() => props.links.map((link) => ({
    ...link,
    url: normalizePublicLinkUrl(link.url, link.payload),
  })), [props.links]);

  const hasAiChatModule = useMemo(() => {
    return props.links.some((link) => {
      const componentType = link.componentType || (link.type || "").toLowerCase();
      return componentType === "ai-chat";
    });
  }, [props.links]);

  const pageUrl = typeof window === "undefined" ? "" : window.location.href;

  const trackContactInteraction = useCallback((linkId: string) => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    fetch(`/api/public/links/${encodeURIComponent(linkId)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    fetch(`/api/public/${props.username}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        referer: document.referrer || null,
      }),
    }).catch(() => undefined);
  }, [props.username]);

  return (
    <>
      <SharePageRenderer
        template={props.template}
        profileId={props.profileId}
        username={props.username}
        displayName={props.displayName}
        bio={props.bio}
        avatarUrl={props.avatarUrl}
        links={directLinks}
        themeName={props.themeName}
        customTheme={props.customTheme}
        showBrandFoot={false}
        reportUrl={props.reportUrl || undefined}
        onQrCodeClick={() => setShowQrCode(true)}
        onShareClick={() => setShowShare(true)}
        company={props.company}
        jobTitle={props.jobTitle}
        phone={props.phone}
        email={props.email}
        wechat={props.wechat}
        city={props.city}
        address={props.address}
        website={props.website}
        contactVisibility={props.contactVisibility}
        onContactInteraction={trackContactInteraction}
      />

      {props.showBrandFoot !== false ? <div className="flex justify-center"><BrandFooter /></div> : null}
      {props.products?.length ? <PublicProductsSection products={props.products} username={props.username} /> : null}

      <button
        type="button"
        onClick={() => setShowContact(true)}
        className="fixed bottom-6 left-5 z-40 flex min-h-12 items-center gap-2 rounded-full border border-[#DCE7D1] bg-white px-4 text-sm font-black text-[#4F6D37] shadow-lg hover:bg-[#F8FBF5]"
        aria-label="联系主页所有者"
      >
        <MessageCircle className="size-5" />
        联系
      </button>

      {!hasAiChatModule ? (
        <PublicAiAssistant
          username={props.username}
          displayName={props.displayName}
          onOpenContact={() => setShowContact(true)}
        />
      ) : null}

      {showContact ? <ContactForm profileId={props.profileId} username={props.username} products={props.products} interestedProductId={props.interestedProductId} onClose={() => setShowContact(false)} /> : null}
      <QrCodeModal isOpen={showQrCode} onClose={() => setShowQrCode(false)} pageUrl={pageUrl} displayName={props.displayName} username={props.username} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} pageUrl={pageUrl} displayName={props.displayName} username={props.username} onOpenQrCode={() => setShowQrCode(true)} />
    </>
  );
}
