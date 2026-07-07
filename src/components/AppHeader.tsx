import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const navItems = [
  { href: "#features", label: "功能" },
  { href: "#cases", label: "适用人群" },
  { href: "#pricing", label: "版本" },
  { href: "#help", label: "如何开始" },
];

export function AppHeader() {
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

        <nav className="flex shrink-0 items-center gap-2" aria-label="账户导航">
          <Link href="/login" className="ui-button-quiet px-3 sm:px-4">
            登录
          </Link>
          <Link href="/register" className="ui-button-primary px-4 sm:px-5">
            免费创建主页
          </Link>
        </nav>
      </div>
    </header>
  );
}
