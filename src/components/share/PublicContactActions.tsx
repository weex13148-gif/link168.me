"use client";

import { Copy, Download, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { PublicProfileIdentity } from "@/components/share/public-profile-types";
import { PUBLIC_PROFILE_BUTTON_STYLE } from "@/components/share/PublicModuleList";
import { sanitizePhoneNumber, sanitizePublicUrl } from "@/lib/public-url-security";

function sanitizeEmail(value: string | null | undefined) {
  const email = (value || "").trim().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function PublicContactActions({ identity }: { identity: PublicProfileIdentity }) {
  const isPublic = identity.contactVisibility === "public";
  const phoneResult = sanitizePhoneNumber(identity.phone || "");
  const phone = isPublic && phoneResult.safe ? phoneResult.phone : null;
  const email = isPublic ? sanitizeEmail(identity.email) : null;
  const wechat = isPublic && identity.wechat?.trim() ? identity.wechat.trim().slice(0, 100) : null;
  const websiteResult = sanitizePublicUrl(identity.website || "");
  const website = isPublic && websiteResult.safe ? websiteResult.url : null;
  const address = isPublic && identity.address?.trim() ? identity.address.trim().slice(0, 300) : null;
  const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--profile-button-radius,16px)] border border-[#DCCFBE] bg-white/70 px-3 text-sm font-black text-[#31543D] transition hover:bg-white";

  return (
    <section aria-label="联系方式" className="grid grid-cols-2 gap-2 px-5 pb-5">
      <a href={`/api/public/${encodeURIComponent(identity.username)}/vcard`} download data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} className={actionClass}>
        <Download aria-hidden className="size-4" />
        保存到通讯录
      </a>
      {phone ? <a href={`tel:${phone}`} data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} className={actionClass}><Phone aria-hidden className="size-4" />{phone}</a> : null}
      {email ? <a href={`mailto:${email}`} data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} className={actionClass}><Mail aria-hidden className="size-4" /><span className="truncate">{email}</span></a> : null}
      {wechat ? (
        <button type="button" data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} className={actionClass} onClick={() => void navigator.clipboard?.writeText(wechat).catch(() => undefined)}>
          <Copy aria-hidden className="size-4" />微信：{wechat}
        </button>
      ) : null}
      {website ? <a href={website} target="_blank" rel="noopener noreferrer" data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} className={actionClass}><Globe aria-hidden className="size-4" />访问官网</a> : null}
      {address ? <span className={actionClass}><MapPin aria-hidden className="size-4" /><span className="truncate">{address}</span></span> : null}
    </section>
  );
}
