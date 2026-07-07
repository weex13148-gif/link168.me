"use client";

import { ArrowUpRight, Image as ImageIcon } from "lucide-react";
import type { CoverImagePayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type Props = {
  payload: CoverImagePayload;
  className?: string;
};

export function CoverImageModule({ payload, className = "" }: Props) {
  const { imageUrl, alt = "", linkUrl } = payload;

  const safeLink = linkUrl ? sanitizePublicUrl(linkUrl) : null;
  const href = safeLink?.safe && safeLink.url ? safeLink.url : null;

  const content = (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`}>
      <SafeImage
        src={imageUrl}
        alt={alt}
        className="h-auto w-full object-cover"
      />
      {href ? (
        <div className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/40 text-[var(--ui-surface)] backdrop-blur-sm">
          <ArrowUpRight aria-hidden className="size-4" />
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block active:scale-[0.99] transition-transform"
      >
        {content}
      </a>
    );
  }

  return content;
}
