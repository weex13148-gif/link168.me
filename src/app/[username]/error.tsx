"use client";

import { useEffect } from "react";
import { StatePage } from "@/components/public-profile/StatePage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 可选：向日志服务报告错误
    console.error("公开主页渲染错误:", error);
  }, [error]);

  return (
    <StatePage
      title="页面加载出错"
      description="该主页暂时无法正常显示，可能是网络问题或系统维护。请稍后再试。"
      action={
        <button
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
        >
          重新加载
        </button>
      }
    />
  );
}
