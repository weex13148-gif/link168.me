"use client";

import type { ReactNode } from "react";

interface PublicPageShellProps {
  children: ReactNode;
  surfaceClassName?: string;
  style?: React.CSSProperties;
}

/**
 * 公开主页外层壳组件
 * 统一处理最大宽度、背景色、安全区域等布局逻辑
 */
export function PublicPageShell({
  children,
  surfaceClassName = "bg-[var(--ui-surface-muted)]",
  style,
}: PublicPageShellProps) {
  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10 ${surfaceClassName}`}
      style={style}
      role="main"
      aria-label="公开主页"
    >
      {children}
    </div>
  );
}
