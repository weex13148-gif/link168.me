import type { ReactNode } from "react";
import type { CurrentPageStatus } from "@/lib/current/contracts";
import type {
  CurrentBoundaryProps,
  CurrentPageAction,
  CurrentPreviewStateProps,
  CurrentPublicStateProps,
  CurrentRendererViewport,
} from "@/components/current-page/types";

const statusConfig: Record<
  CurrentPageStatus,
  { label: string; className: string }
> = {
  draft_only: {
    label: "仅 Draft",
    className: "border-[#E6D8BE] bg-[#FFF7EA] text-[#9A650F]",
  },
  published: {
    label: "已发布",
    className: "border-[#B6DEC7] bg-[#EDF8F2] text-[#126442]",
  },
  draft_changes: {
    label: "有未发布修改",
    className: "border-[#C9D5F6] bg-[#EEF3FF] text-[#1C4ED8]",
  },
  publishing: {
    label: "发布中",
    className: "border-[#C9D5F6] bg-[#EEF3FF] text-[#1C4ED8]",
  },
  publish_failed: {
    label: "发布失败",
    className: "border-[#F2C2BE] bg-[#FDECEA] text-[#B42318]",
  },
  disabled: {
    label: "已停用",
    className: "border-[#DDD6CC] bg-[#F5F1EA] text-[#5E5A54]",
  },
};

function ActionButton({ action }: { action: CurrentPageAction }) {
  const tone =
    action.kind === "secondary"
      ? "border border-[#DDD6CC] bg-white text-[#151515]"
      : action.kind === "quiet"
        ? "border border-transparent bg-transparent text-[#0B4DD8]"
        : "border border-[#0B4DD8] bg-[#0B4DD8] text-white";

  const shared =
    "inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2";
  const disabled = action.disabled
    ? "cursor-not-allowed opacity-60"
    : "hover:brightness-[0.97]";

  if (action.href && !action.disabled) {
    return (
      <a href={action.href} className={`${shared} ${tone} ${disabled}`}>
        {action.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={Boolean(action.disabled)}
      aria-disabled={action.disabled}
      title={action.reason || undefined}
      className={`${shared} ${tone} ${disabled}`}
    >
      {action.label}
    </button>
  );
}

export function CurrentPageStatusBadge({ status }: { status: CurrentPageStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function CurrentBoundaryPill({
  boundary,
}: {
  boundary: CurrentBoundaryProps;
}) {
  return boundary.source === "draft" ? (
    <span className="inline-flex min-h-8 items-center rounded-full border border-[#C9D5F6] bg-[#EEF3FF] px-3 text-xs font-bold text-[#1C4ED8]">
      Draft boundary
    </span>
  ) : (
    <span className="inline-flex min-h-8 items-center rounded-full border border-[#B6DEC7] bg-[#EDF8F2] px-3 text-xs font-bold text-[#126442]">
      Published boundary
    </span>
  );
}

export function CurrentPreviewBanner({
  boundary,
  pageStatus,
  missingRequirements = [],
  publishAction,
}: CurrentPreviewStateProps) {
  return (
    <section
      aria-label="草稿预览状态"
      className="sticky top-0 z-20 rounded-[20px] border border-[#C9D5F6] bg-[#F6F8FF] px-4 py-4 shadow-[0_10px_28px_rgba(44,34,20,.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CurrentBoundaryPill boundary={boundary} />
            <CurrentPageStatusBadge status={pageStatus} />
          </div>
          <p className="mt-3 text-base font-bold text-[#151515]">
            预览草稿 · 公开页面尚未更新
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5E5A54]">
            {boundary.draftLabel} {boundary.publicWarning}
          </p>
          {boundary.publishedVersionLabel ? (
            <p className="mt-2 text-xs font-medium text-[#5E5A54]">
              当前公开版本：{boundary.publishedVersionLabel}
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-sm space-y-3 lg:w-auto">
          {missingRequirements.length > 0 ? (
            <div
              role="status"
              className="rounded-[16px] border border-[#E6D8BE] bg-[#FFF7EA] px-4 py-3 text-sm text-[#9A650F]"
            >
              <p className="font-bold">发布前仍缺少：</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {missingRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {publishAction ? <ActionButton action={publishAction} /> : null}
        </div>
      </div>
    </section>
  );
}

export function CurrentPublicState({
  title,
  description,
  action,
}: CurrentPublicStateProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] items-center px-4 py-10">
      <section className="w-full rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-[0_20px_56px_rgba(44,34,20,.10)] sm:p-8">
        <span className="inline-flex min-h-8 items-center rounded-full border border-[#DDD6CC] bg-[#F5F1EA] px-3 text-xs font-bold text-[#5E5A54]">
          Public Personal Page
        </span>
        <h1 className="mt-4 text-3xl font-bold text-[#151515] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#5E5A54]">{description}</p>
        {action ? (
          <div className="mt-6">
            <ActionButton action={action} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export function CurrentPublishStatePanel({
  boundary,
  status,
  disabledReason,
}: {
  boundary: CurrentBoundaryProps;
  status: CurrentPageStatus;
  disabledReason?: string | null;
}) {
  const copy =
    boundary.source === "draft"
      ? "当前组件只用于 Draft / Preview 侧；真正 Publish 成功前，Public 不得变更。"
      : "当前组件正消费 Published boundary，不允许回读 Draft。";

  return (
    <section className="rounded-[20px] border border-[#DDD6CC] bg-white p-5 shadow-[0_10px_28px_rgba(44,34,20,.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <CurrentBoundaryPill boundary={boundary} />
        <CurrentPageStatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#5E5A54]">{copy}</p>
      {disabledReason ? (
        <p className="mt-3 rounded-[14px] border border-[#F2C2BE] bg-[#FDECEA] px-3 py-3 text-sm text-[#B42318]">
          {disabledReason}
        </p>
      ) : null}
    </section>
  );
}

export function CurrentViewportFrame({
  viewport,
  children,
}: {
  viewport: CurrentRendererViewport;
  children: ReactNode;
}) {
  return viewport === "mobile" ? (
    <div className="mx-auto w-full max-w-[430px] rounded-[32px] border border-[#DDD6CC] bg-[#FFFDF9] p-3 shadow-[0_20px_56px_rgba(44,34,20,.14)]">
      <div className="mb-3 flex items-center justify-between rounded-[20px] border border-[#EEE7DD] bg-[#F7F2E9] px-4 py-2 text-xs font-bold text-[#5E5A54]">
        <span>9:41</span>
        <span>Mobile preview</span>
        <span>5G</span>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-[#EEE7DD] bg-[#F7F2E9]">
        {children}
      </div>
    </div>
  ) : (
    <div className="w-full overflow-hidden rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] shadow-[0_20px_56px_rgba(44,34,20,.10)]">
      {children}
    </div>
  );
}
