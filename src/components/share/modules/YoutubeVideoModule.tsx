"use client";

import { Play, ArrowUpRight } from "lucide-react";
import type { YoutubeVideoPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";

type Props = {
  payload: YoutubeVideoPayload;
  className?: string;
};

export function YoutubeVideoModule({ payload, className = "" }: Props) {
  const { videoId, title, coverUrl } = payload;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const displayTitle = title || "YouTube 视频";
  const displayCover = coverUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-3 shadow-sm transition hover:bg-[#F7F1E7] active:scale-[0.99] ${className}`}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
        <SafeImage
          src={displayCover}
          alt={displayTitle}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <span className="grid size-8 place-items-center rounded-full bg-white/90 text-red-600">
            <Play aria-hidden className="size-4 ml-0.5" />
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black text-[#2B241E]">{displayTitle}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-600">
          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px]">YouTube</span>
          点击跳转播放
        </p>
      </div>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-40" />
    </a>
  );
}
