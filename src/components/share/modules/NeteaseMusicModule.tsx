"use client";

import { Music, ArrowUpRight } from "lucide-react";
import type { NeteaseMusicPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";

type Props = {
  payload: NeteaseMusicPayload;
  className?: string;
};

export function NeteaseMusicModule({ payload, className = "" }: Props) {
  const { songId, title, artist, coverUrl } = payload;
  const musicUrl = `https://music.163.com/#/song?id=${songId}`;

  const displayTitle = title || "网易云音乐";
  const displayArtist = artist || "";
  const displayCover = coverUrl || `https://music.163.com/api/img/song/${songId}?size=200x200`;

  return (
    <a
      href={musicUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 py-3 shadow-sm transition hover:bg-[var(--ui-surface-muted)] active:scale-[0.99] ${className}`}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16">
        <SafeImage
          src={displayCover}
          alt={displayTitle}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--ui-surface)]/90 text-red-500">
            <Music aria-hidden className="size-3.5" />
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--ui-ink)]">{displayTitle}</p>
        {displayArtist ? (
          <p className="mt-0.5 truncate text-xs text-[var(--ui-muted)]">{displayArtist}</p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
          <span className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px]">网易云</span>
          点击收听
        </p>
      </div>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-40" />
    </a>
  );
}
