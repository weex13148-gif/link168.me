"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const navItems = [
  { href: "#features", label: "功能" },
  { href: "#cases", label: "适用人群" },
  { href: "#pricing", label: "版本" },
  { href: "#help", label: "如何开始" },
];

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      const previouslyFocused = previousFocusRef.current;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      previousFocusRef.current = null;
      return;
    }

    const menu = mobileMenuRef.current;
    if (!menu) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(menu.querySelectorAll<HTMLElement>(focusableSelector));
    focusables()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    previousFocusRef.current = menuButtonRef.current;
    setMenuOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ui-line)] bg-[color:var(--ui-surface)]/95 backdrop-blur">
      <div className="ui-container flex min-h-16 items-center justify-between gap-4">
        <BrandLogo size="header" className="!w-[126px]" />

        <nav className="hidden items-center gap-7 text-sm font-bold text-[var(--ui-muted)] lg:flex" aria-label="首页导航">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[var(--ui-brand-hover)]">
              {item.label}
            </a>
          ))}
        </nav>

        <nav className="hidden shrink-0 items-center gap-2 lg:flex" aria-label="账户导航">
          <Link href="/login" className="ui-button-quiet px-3 sm:px-4">
            登录
          </Link>
          <Link href="/register" className="ui-button-primary px-4 sm:px-5">
            免费创建主页
          </Link>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="ui-button-quiet px-3 lg:hidden"
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={menuOpen}
          aria-controls="mobile-header-menu"
          onClick={toggleMenu}
        >
          {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          ref={mobileMenuRef}
          id="mobile-header-menu"
          className="border-t border-[var(--ui-line)] bg-[color:var(--ui-surface)] px-4 py-4 lg:hidden"
          aria-label="移动端导航"
        >
          <div className="ui-container flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-bold text-[var(--ui-muted)] transition hover:bg-[var(--ui-page)] hover:text-[var(--ui-brand-hover)]"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-[var(--ui-line)] pt-4">
              <Link href="/login" className="ui-button-quiet flex-1" onClick={closeMenu}>登录</Link>
              <Link href="/register" className="ui-button-primary flex-1" onClick={closeMenu}>免费创建主页</Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
