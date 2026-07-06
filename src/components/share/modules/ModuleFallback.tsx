"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  message?: string;
};

export function ModuleFallback({ message = "模块加载失败" }: Props) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gray-200 text-gray-500">
        <AlertTriangle aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-gray-600">{message}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">数据格式不正确，已安全降级</p>
      </div>
    </div>
  );
}
