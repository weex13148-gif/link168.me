"use client";

import ConsoleShell from "@/components/layout/ConsoleShell";

/**
 * WorkbenchShell —— 已收敛为 ConsoleShell 的薄包装。
 * 禁止继续保留三套独立导航、三套首页或三套 Shell。
 * /workbench/* 页面仍保留为二级页面，但使用与 /console 统一的 Shell。
 */
export default function WorkbenchShell(
  props: React.ComponentProps<typeof ConsoleShell>,
) {
  return <ConsoleShell {...props} />;
}
