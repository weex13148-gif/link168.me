"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CONSOLE_PRIMARY_NAV,
  isSharedNavItemActive,
} from "@/components/layout/console-navigation";

export default function WorkbenchShell({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="dark-public min-h-dvh w-full overflow-x-hidden bg-[var(--ui-page)]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:flex-row lg:items-start">
        <aside className="hidden lg:sticky lg:top-4 lg:block lg:h-[calc(100dvh-32px)] lg:w-[248px] lg:shrink-0">
          <div className="flex h-full flex-col rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm">
            <Link href="/console" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-2xl bg-[var(--ui-brand)] text-base font-black text-white">
                L
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-wide text-[var(--ui-ink)]">
                  Link168 控制台
                </p>
                <p className="text-[11px] font-semibold text-[var(--ui-muted)]">
                  统一经营入口
                </p>
              </div>
            </Link>

            <nav aria-label="用户控制台导航" className="mt-6 grid gap-2">
              {CONSOLE_PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isSharedNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-black transition ${
                      active
                        ? "bg-[var(--ui-ink)] text-white shadow-sm"
                        : "text-[var(--ui-brand)] hover:bg-[var(--ui-page)]"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                        active ? "bg-white/15 text-white" : item.tone
                      }`}
                    >
                      <Icon aria-hidden className="size-4.5" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4">
              <p className="text-xs font-black text-[var(--ui-muted)]">当前为兼容页面</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ui-brand)]">
                功能继续复用原有实现，一级导航统一归入Console五分类。
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="mb-4 flex min-w-0 items-center gap-2 lg:hidden">
            <Link href="/console" className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--ui-brand)] text-sm font-black text-white">
                L
              </span>
              <span className="truncate text-sm font-black text-[var(--ui-ink)]">Link168</span>
            </Link>
          </div>

          <header className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4 shadow-sm sm:rounded-[28px] sm:p-6">
            {eyebrow ? (
              <p className="break-words text-xs font-black uppercase tracking-[0.16em] text-[var(--ui-brand)] sm:tracking-[0.2em]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 break-words text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[var(--ui-muted)]">
                {subtitle}
              </p>
            ) : null}
          </header>

          <div className="mt-4 min-w-0 sm:mt-6">{children}</div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ui-line)] bg-[var(--ui-surface-strong)]/96 px-2 py-1 backdrop-blur lg:hidden safe-area-pb"
        aria-label="手机端控制台导航"
      >
        <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1">
          {CONSOLE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isSharedNavItemActive(pathname, item);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black transition ${
                  active
                    ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]"
                    : "text-[var(--ui-muted)] hover:bg-[var(--ui-page)]"
                }`}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
