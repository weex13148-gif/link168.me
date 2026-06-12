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
      <div className="flex flex-col gap-3 rounded-[30px] border border-white/30 bg-white/90 p-2 shadow-[0_24px_70px_rgba(17,58,29,0.18)] backdrop-blur sm:flex-row sm:items-center">
        <label className="flex min-h-14 flex-1 items-center overflow-hidden rounded-full bg-[#F7F6EA]">
          <span className="shrink-0 border-r border-[#DDE8CF] px-4 text-sm font-black text-[#0B6B2B] sm:text-base">
            link168.me/
          </span>
          <input
            value={handle}
            onChange={(event) => setHandle(normalizeHandle(event.target.value))}
            placeholder="abao"
            aria-label="Link168 主页后缀"
            className="min-w-0 flex-1 bg-transparent px-3 text-base font-black text-[#113A1D] outline-none placeholder:text-[#8FA083]"
          />
        </label>
        <button
          type="submit"
          className="link168-button-press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-6 font-black text-[#113A1D] shadow-xl shadow-[#FACC15]/30 transition hover:-translate-y-0.5 hover:brightness-105"
        >
          立即创建你的 Link168
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </form>
  );
}
