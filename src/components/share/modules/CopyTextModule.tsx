"use client";

import { useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import type { CopyTextPayload } from "@/features/profile-modules";

type Props = {
  payload: CopyTextPayload;
  className?: string;
};

export function CopyTextModule({ payload, className = "" }: Props) {
  const { label, copyContent, description } = payload;
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  function handleCopy() {
    setCopyError(false);
    if (!navigator.clipboard) {
      // 降级方案：使用 textarea 选中复制
      try {
        const textarea = document.createElement("textarea");
        textarea.value = copyContent;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } else {
          setCopyError(true);
          window.setTimeout(() => setCopyError(false), 3000);
        }
      } catch {
        setCopyError(true);
        window.setTimeout(() => setCopyError(false), 3000);
      }
      return;
    }
    navigator.clipboard.writeText(copyContent).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 3000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 py-3 text-left shadow-sm transition hover:bg-[var(--ui-surface-muted)] active:scale-[0.99] ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--ui-ink)]">{label}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ui-muted)]">{description}</p>
        ) : null}
        <p className="mt-1 truncate text-xs font-mono text-[var(--ui-muted)]">{copyContent}</p>
        {copyError ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[var(--ui-danger)]">
            <AlertCircle className="size-3" />
            复制失败，请长按文本手动复制
          </p>
        ) : null}
      </div>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${copied ? "bg-green-100 text-green-600" : copyError ? "bg-red-100 text-red-600" : "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]"}`}>
        {copied ? <Check aria-hidden className="size-4" /> : copyError ? <AlertCircle aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      </span>
    </button>
  );
}
