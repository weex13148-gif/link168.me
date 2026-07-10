"use client";

import type { ProductStatus } from "@/lib/showcase-config";

export type ShowcaseStatus = "completed" | "beta" | "planned" | "current" | "demo" | "pending";

const STATUS_CONFIG: Record<ShowcaseStatus, { label: string; bg: string; text: string; icon: string }> = {
  completed: { label: "已上线", bg: "bg-[var(--ui-success-soft)]", text: "text-[var(--ui-success)]", icon: "✓" },
  beta: { label: "内测中", bg: "bg-[var(--ui-accent-soft)]", text: "text-[#7D5B24]", icon: "○" },
  current: { label: "本次改版", bg: "bg-[var(--ui-brand-soft)]", text: "text-[var(--ui-brand)]", icon: "◆" },
  planned: { label: "未来规划", bg: "bg-[var(--ui-surface-muted)]", text: "text-[var(--ui-muted)]", icon: "◇" },
  demo: { label: "演示数据", bg: "bg-[var(--ui-info-soft)]", text: "text-[var(--ui-info)]", icon: "⊛" },
  pending: { label: "待核验", bg: "bg-[var(--ui-warning-soft)]", text: "text-[var(--ui-warning)]", icon: "?" },
};

function fromProductStatus(status: ProductStatus): ShowcaseStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "beta":
      return "beta";
    case "planned":
      return "planned";
    default:
      return "pending";
  }
}

export default function StatusBadge({
  status,
  text,
  variant = "auto",
}: {
  status: ProductStatus | ShowcaseStatus;
  text?: string;
  variant?: "auto" | "product" | "showcase";
}) {
  const isProductStatus = ["completed", "beta", "planned"].includes(status);
  const showcaseStatus = variant === "product" ? fromProductStatus(status as ProductStatus) : (status as ShowcaseStatus);
  const cfg = STATUS_CONFIG[showcaseStatus];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${cfg.bg} ${cfg.text}`}>
      <span className="size-3 flex items-center justify-center">{cfg.icon}</span>
      <span>{text || cfg.label}</span>
    </span>
  );
}
