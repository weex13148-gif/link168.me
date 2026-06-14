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
      <div className="flex flex-col gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#FFFDF8]/94 p-2 shadow-[0_22px_58px_rgba(86,68,46,0.12)] backdrop-blur sm:flex-row sm:items-center">
        <label className="flex min-h-14 flex-1 items-center overflow-hidden rounded-[18px] bg-[#F7F1E7]">
          <span className="shrink-0 border-r border-[#E8DCCB] px-4 text-[15px] font-semibold text-[#3F5F31]">
            link168.me/
          </span>
          <input
            value={handle}
            onChange={(event) => setHandle(normalizeHandle(event.target.value))}
            placeholder="yourname"
            aria-label="Link168 主页后缀"
            className="min-w-0 flex-1 bg-transparent px-3 text-base font-semibold text-[#2B241E] outline-none placeholder:text-[#A69A8A]"
          />
        </label>
        <button
          type="submit"
          className="link168-button-press inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-[#6F8F4E] px-6 font-semibold text-white shadow-lg shadow-[#6F8F4E]/18 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F]"
        >
          免费创建
          <ArrowRight aria-hidden className="link168-feature-icon" />
        </button>
      </div>
    </form>
  );
}
