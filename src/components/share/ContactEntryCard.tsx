"use client";

import { Building2, ExternalLink, MessageCircle, QrCode, X } from "lucide-react";
import {
  contactChannelLabel,
  parseContactEntryPayload,
  type ContactChannel,
} from "@/lib/contact-entries";

export type PublicContactEntry = {
  id: string;
  title: string;
  description?: string | null;
  payload: string | null | undefined;
  workspaceId?: string | null;
};

function appUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");
}

export function contactConnectUrl(entryId: string, publicBaseUrl?: string | null) {
  const baseUrl = publicBaseUrl === undefined ? appUrl() : publicBaseUrl;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/$/, "")}/connect/${encodeURIComponent(entryId)}`;
}

function ChannelIcon({ channel }: { channel: ContactChannel }) {
  return channel === "wecom"
    ? <Building2 aria-hidden className="size-5" />
    : <MessageCircle aria-hidden className="size-5" />;
}

export function ContactEntryCard({
  entry,
  compact = false,
  publicBaseUrl,
}: {
  entry: PublicContactEntry;
  compact?: boolean;
  /** Pass null in a team console preview until a verified public host exists. */
  publicBaseUrl?: string | null;
}) {
  const payload = parseContactEntryPayload(entry.payload, entry.workspaceId);
  if (!payload) return null;

  const connectUrl = contactConnectUrl(entry.id, publicBaseUrl);
  const qrCodeUrl = connectUrl
    ? `/api/qrcode?url=${encodeURIComponent(connectUrl)}&size=220&dark=31543d&light=ffffff&margin=2`
    : null;
  const channelLabel = contactChannelLabel(payload.channel);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#CFE0BE] bg-gradient-to-br from-[#F8FCF4] via-white to-[#ECF5E3] shadow-sm ${compact ? "p-3" : "p-4"}`}
      aria-label={`${entry.title || channelLabel} 联系入口`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#6F8F4E] text-white">
            <ChannelIcon channel={payload.channel} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#243A2A]">{entry.title || `${channelLabel}联系`}</p>
            <p className="mt-0.5 text-xs font-bold text-[#5C745F]">{entry.workspaceId ? "团队共享联系入口" : "联系本人"} · {channelLabel}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#3F5F31] shadow-sm">
          <QrCode aria-hidden className="size-3" />扫码添加
        </span>
      </div>

      {entry.description ? <p className="mt-3 text-xs leading-5 text-[#59705C]">{entry.description}</p> : null}

      <div className={`mt-3 flex items-center gap-3 ${compact ? "" : "sm:gap-4"}`}>
        {qrCodeUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt={`扫描二维码添加${channelLabel}`} className="size-24 rounded-xl border border-[#DDE8CD] bg-white p-1" />
        </> : <div className="grid size-24 shrink-0 place-items-center rounded-xl border border-dashed border-[#CDBEAC] bg-[#FFF9F0] text-center text-[11px] font-bold leading-4 text-[#8C612E]">
          <QrCode aria-hidden className="mb-1 size-5" />
          等待域名验证
        </div>}
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-5 text-[#5C745F]">{connectUrl ? `可扫码添加，也可直接打开对应的${channelLabel}添加页面。` : "团队域名验证完成后，系统会在这里生成可分享二维码和直达链接。"}</p>
          {connectUrl ? <a
              href={connectUrl}
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-3 text-xs font-black text-white transition hover:bg-[#5D7B42]"
            >
              直接添加{channelLabel}
              <ExternalLink aria-hidden className="size-3.5" />
            </a> : <span className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#D8E3CC] px-3 text-xs font-black text-[#5C745F]" aria-disabled="true">等待团队域名验证</span>}
        </div>
      </div>
    </section>
  );
}

export function ContactEntryDialog({
  entry,
  onClose,
  publicBaseUrl,
}: {
  entry: PublicContactEntry;
  onClose: () => void;
  publicBaseUrl?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#2B241E]/45 p-4" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="人工联系入口"
        className="w-full max-w-sm rounded-[28px] border border-[#DDE8CD] bg-[#FFFDF8] p-5 shadow-[0_24px_80px_rgba(43,36,30,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">已转人工</p>
            <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">请通过下面的联系入口继续沟通。</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-[#F2E7D8] text-[#7A6D5E]" aria-label="关闭联系入口">
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <ContactEntryCard entry={entry} publicBaseUrl={publicBaseUrl} />
      </section>
    </div>
  );
}
