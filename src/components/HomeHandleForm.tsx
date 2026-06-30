"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function HomeHandleForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedHandle = normalizeHandle(handle);
    router.push(
      normalizedHandle
        ? `/register?handle=${encodeURIComponent(normalizedHandle)}`
        : "/register"
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 w-full max-w-xl sm:mt-8">
      <div className="flex flex-col gap-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-lg shadow-[#8b5cf6]/10 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
        <label className="flex min-h-12 flex-1 items-center overflow-hidden rounded-xl bg-[#f5f3ff] sm:min-h-14 sm:rounded-full sm:rounded-r-none">
          <span className="shrink-0 border-r border-[#e5e7eb] px-3 text-xs font-semibold text-[#8b5cf6] sm:px-4 sm:text-[15px]">
            link168.me/
          </span>
          <input
            value={handle}
            onChange={(event) => setHandle(normalizeHandle(event.target.value))}
            placeholder="yourname"
            aria-label="Link168 主页后缀"
            className="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-[#1f1f2e] outline-none placeholder:text-[#9ca3af] sm:px-3 sm:text-base"
          />
        </label>
        <button
          type="submit"
          className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#7c3aed] sm:min-h-12 sm:rounded-full sm:px-6"
        >
          免费创建
          <ArrowRight aria-hidden className="size-4 sm:size-5" />
        </button>
      </div>
    </form>
  );
}
