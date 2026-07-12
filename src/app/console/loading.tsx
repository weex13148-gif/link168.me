import ConsoleShell from "@/components/layout/ConsoleShell";

export default function ConsoleLoading() {
  return (
    <ConsoleShell
      eyebrow="Console"
      title="正在加载"
      subtitle="正在读取你的经营数据，请稍候。"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="控制台正在加载">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="min-h-32 animate-pulse rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 sm:rounded-[28px] sm:p-5"
          >
            <div className="h-3 w-20 rounded-full bg-[var(--ui-surface-muted)]" />
            <div className="mt-4 h-8 w-24 rounded-xl bg-[var(--ui-surface-muted)]" />
            <div className="mt-5 h-3 w-16 rounded-full bg-[var(--ui-surface-muted)]" />
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}
