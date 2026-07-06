"use client";

import { useState } from "react";
import { ImageOff, Clock, XCircle } from "lucide-react";

export type AuditStatus = "approved" | "pending" | "pending_manual_review" | "rejected" | "unknown";

type Props = {
  src: string;
  alt?: string;
  auditStatus?: AuditStatus;
  className?: string;
  fill?: boolean;
};

export function SafeImage({ src, alt = "", auditStatus = "approved", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);

  if (auditStatus === "rejected") {
    return (
      <div className={`grid size-full place-items-center bg-gray-100 text-gray-400 ${className}`}>
        <div className="flex flex-col items-center gap-1 text-center">
          <XCircle aria-hidden className="size-8" />
          <span className="text-xs font-bold">审核未通过</span>
        </div>
      </div>
    );
  }

  if (auditStatus === "pending" || auditStatus === "pending_manual_review") {
    return (
      <div className={`grid size-full place-items-center bg-gray-100 text-gray-400 ${className}`}>
        <div className="flex flex-col items-center gap-1 text-center">
          <Clock aria-hidden className="size-8" />
          <span className="text-xs font-bold">审核中</span>
        </div>
      </div>
    );
  }

  if (!src || imgError) {
    return (
      <div className={`grid size-full place-items-center bg-gray-100 text-gray-400 ${className}`}>
        <ImageOff aria-hidden className="size-8" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}
