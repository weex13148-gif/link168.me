"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import type { AudienceMode } from "@/lib/showcase-config";
import { AUDIENCE_META, SHOWCASE_PROJECT } from "@/lib/showcase-config";

export default function ShowcaseLayout({
  mode,
  children,
  navItems,
}: {
  mode: AudienceMode;
  children: React.ReactNode;
  navItems: { id: string; label: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = AUDIENCE_META[mode];

  return (
    <div className="ui-page">
      <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[var(--ui-surface)]/95 backdrop-blur">
        <div className="ui-container flex min-h-16 items-center justify-between gap-4">
          <Link href="/showcase" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[var(--ui-radius-sm)] font-black text-white" style={{ backgroundColor: meta.themeColor }}>
              L
            </span>
            <span>
              <strong className="block text-sm">{SHOWCASE_PROJECT.name} 外部尽调</strong>
              <small className="text-[var(--ui-muted)]">{meta.badge}</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-bold text-[var(--ui-muted)] xl:flex">
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="hover:text-[var(--ui-brand)]">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="ui-button-secondary hidden text-xs sm:inline-flex">
              真实产品 <ExternalLink className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="ui-button-secondary px-3 xl:hidden"
              aria-label="打开导航"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="ui-container grid border-t border-[var(--ui-line)] py-3 xl:hidden">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-bold text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--ui-line)] bg-[var(--ui-surface)] py-10">
        <div className="ui-container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[var(--ui-muted)]">
            {SHOWCASE_PROJECT.name} · 版本 {SHOWCASE_PROJECT.version} · 更新于 {SHOWCASE_PROJECT.updatedAt}
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--ui-muted)]">
            <Link href="/showcase" className="hover:text-[var(--ui-brand)]">尽调入口</Link>
            <Link href="/showcase/judge" className="hover:text-[var(--ui-brand)]">评委</Link>
            <Link href="/showcase/investor" className="hover:text-[var(--ui-brand)]">投资人</Link>
            <Link href="/showcase/government" className="hover:text-[var(--ui-brand)]">政府</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
