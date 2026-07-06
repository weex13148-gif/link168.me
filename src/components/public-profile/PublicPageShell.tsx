"use client";

import type { ReactNode } from "react";

interface PublicPageShellProps {
  children: ReactNode;
  surfaceClassName?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export function PublicPageShell({
  children,
  surfaceClassName = "bg-[#F7F1E7]",
  style,
  "aria-label": ariaLabel,
}: PublicPageShellProps) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10 ${surfaceClassName}`}
      style={style}
      aria-label={ariaLabel}
      role="main"
    >
      {children}
    </main>
  );
}
