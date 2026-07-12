"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import ConsoleShell from "@/components/layout/ConsoleShell";

export default function ConsoleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ConsoleShell
      eyebrow="Console"
      title="页面暂时无法加载"
      subtitle="你的数据没有被删除，可以重新尝试加载当前页面。"
    >
      <section className="mx-auto max-w-xl rounded-[24px] border border-[var(--ui-danger)]/20 bg-[var(--ui-surface)] p-5 text-center shadow-sm sm:rounded-[28px] sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]">
          <AlertTriangle className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-black text-[var(--ui-ink)]">加载失败</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
          可能是网络或服务短暂异常。重新尝试不会重复提交订单、AI调用或其他敏感操作。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ui-ink)] px-5 text-sm font-black text-white"
        >
          <RotateCcw className="size-4" />
          重新加载
        </button>
      </section>
    </ConsoleShell>
  );
}
