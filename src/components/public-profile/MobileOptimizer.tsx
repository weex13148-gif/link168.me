"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

interface MobileOptimizerProps {
  children: ReactNode;
}

/**
 * 移动端优化组件
 * - 阻止 iOS 双击缩放
 * - 优化视口滚动体验
 * - 处理安全区域
 */
export function MobileOptimizer({ children }: MobileOptimizerProps) {
  useEffect(() => {
    // 阻止 iOS 双击缩放，但保留 pinch 缩放
    let lastTouchEnd = 0;
    const handleTouchEnd = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return <>{children}</>;
}

/**
 * 图片懒加载与性能优化包装
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

/**
 * 安全区域底部padding
 */
export function SafeAreaBottom({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pb-[env(safe-area-inset-bottom)] ${className}`}>{children}</div>;
}
