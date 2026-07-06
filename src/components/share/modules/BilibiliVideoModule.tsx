"use client";

import { Play, ArrowUpRight } from "lucide-react";
import type { BilibiliVideoPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";

type Props = {
  payload: BilibiliVideoPayload;
  className?: string;
};

export function BilibiliVideoModule({ payload, className = "" }: Props) {
  const { bvid, title, coverUrl } = payload;
  const videoUrl = `https://www.bilibili.com/video/${bvid}`;

  const displayTitle = title || "哔哩哔哩视频";
  const displayCover = coverUrl || `https://i0.hdslb.com/bfs/archive/magic/${bvid}.jpg`;

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
          <span className="grid size-8 place-items-center rounded-full bg-white/90 text-pink-600">
            <Play aria-hidden className="size-4 ml-0.5" />
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black text-[#2B241E]">{displayTitle}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#FB7299]">
          <span className="inline-block rounded bg-pink-100 px-1.5 py-0.5 text-[10px]">B站</span>
          点击跳转播放
        </p>
      </div>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-40" />
    </a>
  );
}
