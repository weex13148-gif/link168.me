"use client";

import { Video, ArrowUpRight } from "lucide-react";
import type { VideoLinkPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type Props = {
  payload: VideoLinkPayload;
  className?: string;
};

export function VideoLinkModule({ payload, className = "" }: Props) {
  const { url, title, coverUrl, platform } = payload;

  const safe = sanitizePublicUrl(url);
  const href = safe.safe && safe.url ? safe.url : null;

  const displayTitle = title || "视频链接";
  const displayPlatform = platform || "视频";

  if (!href) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-3 shadow-sm ${className}`}>
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-400 sm:size-20">
          <Video aria-hidden className="size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-black text-[#2B241E]">{displayTitle}</p>
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
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
        {coverUrl ? (
          <SafeImage
            src={coverUrl}
            alt={displayTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#F3E7D1] text-[#8A6A2E]">
            <Video aria-hidden className="size-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black text-[#2B241E]">{displayTitle}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#7A6D5E]">
          <span className="inline-block rounded bg-[#F3E7D1] px-1.5 py-0.5 text-[10px]">{displayPlatform}</span>
          点击观看
        </p>
      </div>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-40" />
    </a>
  );
}
