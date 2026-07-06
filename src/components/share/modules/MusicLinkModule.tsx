"use client";

import { Music2, ArrowUpRight } from "lucide-react";
import type { MusicLinkPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type Props = {
  payload: MusicLinkPayload;
  className?: string;
};

export function MusicLinkModule({ payload, className = "" }: Props) {
  const { url, title, artist, coverUrl } = payload;

  const safe = sanitizePublicUrl(url);
  const href = safe.safe && safe.url ? safe.url : null;

  const displayTitle = title || "音乐链接";
  const displayArtist = artist || "";

  if (!href) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-3 shadow-sm ${className}`}>
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-400 sm:size-16">
          <Music2 aria-hidden className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-[#2B241E]">{displayTitle}</p>
          <p className="mt-1 text-xs font-bold text-red-600">链接不安全，已屏蔽</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-3 shadow-sm transition hover:bg-[#F7F1E7] active:scale-[0.99] ${className}`}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16">
        {coverUrl ? (
          <SafeImage
            src={coverUrl}
            alt={displayTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#F3E7D1] text-[#8A6A2E]">
            <Music2 aria-hidden className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#2B241E]">{displayTitle}</p>
        {displayArtist ? (
          <p className="mt-0.5 truncate text-xs text-[#7A6D5E]">{displayArtist}</p>
        ) : null}
        <p className="mt-1 text-xs font-bold text-[#7A6D5E]">
          点击收听
        </p>
      </div>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-40" />
    </a>
  );
}
