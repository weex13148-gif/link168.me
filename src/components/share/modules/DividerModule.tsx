"use client";

import type { DividerPayload } from "@/features/profile-modules";

type Props = {
  payload: DividerPayload;
  className?: string;
};

export function DividerModule({ payload, className = "" }: Props) {
  const { style = "line" } = payload;

  if (style === "space") {
    return <div className={`h-6 w-full sm:h-8 ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-3 py-2 ${className}`}>
      <span className="h-px flex-1 bg-[#E8DCCB]" />
      <span className="h-1 w-1 rounded-full bg-[#E8DCCB]" />
      <span className="h-px flex-1 bg-[#E8DCCB]" />
    </div>
  );
}
