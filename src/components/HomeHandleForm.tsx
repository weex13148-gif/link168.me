"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X, Loader2 } from "lucide-react";

function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

export function HomeHandleForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [checkMessage, setCheckMessage] = useState("");
  const [debouncedHandle, setDebouncedHandle] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHandle(handle);
    }, 300);
    return () => clearTimeout(timer);
  }, [handle]);

  useEffect(() => {
    const value = debouncedHandle;
    if (!value) {
      setCheckState("idle");
      setCheckMessage("");
      return;
    }
    if (value.length < 2) {
      setCheckState("invalid");
      setCheckMessage("用户名至少 2 个字符");
      return;
    }

    let cancelled = false;
    setCheckState("checking");
    setCheckMessage("");

    fetch(`/api/auth/username?username=${encodeURIComponent(value)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.available) {
          setCheckState("available");
          setCheckMessage("可以使用");
        } else {
          setCheckState("taken");
          setCheckMessage(data.reason || "该用户名不可用");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCheckState("idle");
        setCheckMessage("");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedHandle]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedHandle = normalizeHandle(handle);
    if (!normalizedHandle || checkState === "taken" || checkState === "invalid") {
      return;
    }
    router.push(
      normalizedHandle
        ? `/register?handle=${encodeURIComponent(normalizedHandle)}`
        : "/register"
    );
  }

  const isDisabled = !handle || checkState === "taken" || checkState === "invalid";

  return (
    <form onSubmit={onSubmit} className="mt-6 w-full max-w-xl sm:mt-8">
      <div className="flex flex-col gap-2 rounded-2xl border border-[#e5e7eb] bg-[var(--ui-surface)] p-2 shadow-lg shadow-[#8b5cf6]/10 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
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
          disabled={isDisabled}
          className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#7c3aed] sm:min-h-12 sm:rounded-full sm:px-6 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          免费创建
          <ArrowRight aria-hidden className="size-4 sm:size-5" />
        </button>
      </div>
      <div className="mt-2 min-h-5 pl-1 text-xs">
        {checkState === "checking" && (
          <span className="flex items-center gap-1 text-[#9ca3af]">
            <Loader2 className="size-3 animate-spin" />
            正在检查可用性…
          </span>
        )}
        {checkState === "available" && (
          <span className="flex items-center gap-1 text-[#22c55e]">
            <Check className="size-3.5" />
            {checkMessage}
          </span>
        )}
        {checkState === "taken" && (
          <span className="flex items-center gap-1 text-[#ef4444]">
            <X className="size-3.5" />
            {checkMessage}
          </span>
        )}
        {checkState === "invalid" && (
          <span className="flex items-center gap-1 text-[#f59e0b]">
            <X className="size-3.5" />
            {checkMessage}
          </span>
        )}
      </div>
    </form>
  );
}
