"use client";

import { Bot, MessageCircle } from "lucide-react";

export function PublicProfileStickyAction({
  kind,
  onClick,
}: {
  kind: "ai" | "contact";
  onClick: () => void;
}) {
  const isAi = kind === "ai";
  const label = isAi ? "立即咨询" : "留下需求";

  return (
    <div
      data-public-profile-sticky-action
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-[#FFF8EF]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        data-public-button
        style={{ borderRadius: "var(--profile-button-radius, 16px)" }}
        className="mx-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 border border-[#31543D] bg-[#31543D] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#26462E]"
      >
        {isAi ? <Bot className="size-5" /> : <MessageCircle className="size-5" />}
        {label}
      </button>
    </div>
  );
}
