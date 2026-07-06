"use client";

import { useState, useEffect } from "react";
import { X, Maximize2 } from "lucide-react";
import type { PopupImagePayload } from "@/features/profile-modules";
import { SafeImage } from "./SafeImage";

type Props = {
  payload: PopupImagePayload;
  className?: string;
};

export function PopupImageModule({ payload, className = "" }: Props) {
  const { thumbnailUrl, fullImageUrl, alt = "" } = payload;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full overflow-hidden rounded-2xl active:scale-[0.99] transition-transform ${className}`}
      >
        <SafeImage
          src={thumbnailUrl}
          alt={alt}
          className="h-auto w-full object-cover"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span className="grid size-10 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <Maximize2 aria-hidden className="size-5" />
          </span>
        </div>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
          <div
            className="max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <SafeImage
              src={fullImageUrl}
              alt={alt}
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
