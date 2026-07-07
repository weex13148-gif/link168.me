import { Check, Loader2, Zap } from "lucide-react";

export type DashboardStatus = "saved" | "saving" | "draft";

type DashboardStatusBarProps = {
  status: DashboardStatus;
  message?: string;
};

const configByStatus: Record<DashboardStatus, { label: string; tone: string; icon: typeof Check }> = {
  saved: {
    label: "已保存",
    tone: "border-[var(--ui-success)]/30 bg-[var(--ui-success-soft)] text-[var(--ui-brand)]",
    icon: Check,
  },
  saving: {
    label: "自动保存中",
    tone: "border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-muted)]",
    icon: Loader2,
  },
  draft: {
    label: "离线草稿",
    tone: "border-[var(--ui-warning)]/40 bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]",
    icon: Zap,
  },
};

export function DashboardStatusBar({ status, message }: DashboardStatusBarProps) {
  const { label, tone, icon: Icon } = configByStatus[status];
  const displayMessage = message || label;

  return (
    <div
      role="status"
      aria-live="polite"
      title={displayMessage}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black shadow-sm sm:min-h-9 sm:gap-2 sm:px-3 sm:text-xs ${tone}`}
    >
      <Icon aria-hidden className={`size-4 ${status === "saving" ? "animate-spin" : ""} sm:link168-nav-icon`} />
      <span className="hidden sm:inline">{displayMessage}</span>
    </div>
  );
}
