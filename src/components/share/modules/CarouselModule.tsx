"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CarouselPayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type Props = {
  payload: CarouselPayload;
  className?: string;
  autoPlayInterval?: number;
};

export function CarouselModule({ payload, className = "", autoPlayInterval = 4000 }: Props) {
  const { images } = payload;
  const [current, setCurrent] = useState(0);
  const total = images.length;

  const goTo = useCallback((index: number) => {
    if (total === 0) return;
    setCurrent(((index % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = window.setInterval(next, autoPlayInterval);
    return () => window.clearInterval(timer);
  }, [next, autoPlayInterval, total]);

  if (total === 0) return null;

  const currentItem = images[current];
  const safeLink = currentItem.linkUrl ? sanitizePublicUrl(currentItem.linkUrl) : null;
  const href = safeLink?.safe && safeLink.url ? safeLink.url : null;

  const imageContent = (
    <SafeImage
      src={currentItem.imageUrl}
      alt={currentItem.alt || ""}
      className="h-full w-full object-cover"
    />
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`} style={{ aspectRatio: "16/9" }}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full w-full"
        >
          {imageContent}
        </a>
      ) : (
        imageContent
      )}

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            aria-label="上一张"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            aria-label="下一张"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all ${index === current ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                aria-label={`跳转到第 ${index + 1} 张`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
