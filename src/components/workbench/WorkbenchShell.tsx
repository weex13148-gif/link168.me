"use client";

import ConsoleShell from "@/components/layout/ConsoleShell";

/**
 * WorkbenchShell —— 已收敛为 ConsoleShell 的薄包装。
 * 禁止继续保留三套独立导航、三套首页或三套 Shell。
 * 旧 /workbench/* 仅作为兼容来源文件；外部请求统一重定向到 /console/*。
 */
export default function WorkbenchShell(
  props: React.ComponentProps<typeof ConsoleShell>,
) {
  return <ConsoleShell {...props} />;
}
