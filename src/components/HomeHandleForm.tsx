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
    router.push(normalizedHandle ? `/register?handle=${encodeURIComponent(normalizedHandle)}` : "/register");
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 w-full max-w-xl">
      <div className="flex flex-col gap-2 rounded-[22px] border border-[#DCE2D7] bg-white p-2 shadow-[0_20px_55px_rgba(24,32,22,0.09)] sm:flex-row sm:items-center">
        <label className="flex min-h-14 flex-1 items-center overflow-hidden rounded-[16px] bg-[#F3F5EF]">
          <span className="shrink-0 border-r border-[#DCE2D7] px-4 text-[15px] font-semibold text-[#4F6F3C]">
            link168.me/
          </span>
          <input
            value={handle}
            onChange={(event) => setHandle(normalizeHandle(event.target.value))}
            placeholder="yourname"
            aria-label="Link168 主页后缀"
            className="min-w-0 flex-1 bg-transparent px-3 text-base font-semibold text-[#182016] outline-none placeholder:text-[#A1A99E]"
          />
        </label>
        <button
          type="submit"
          className="link168-button-press inline-flex min-h-14 items-center justify-center gap-2 rounded-[16px] bg-[#587744] px-6 font-semibold text-white shadow-lg shadow-[#587744]/18 transition hover:-translate-y-0.5 hover:bg-[#486436]"
        >
          免费创建
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </form>
  );
}
