"use client";

import { useState, useRef, useEffect } from "react";
import { X, Download, CheckCircle, Share2, Copy } from "lucide-react";

interface QrSharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageUrl: string;
  displayName: string;
  username: string;
}

/**
 * 二维码与分享组合面板
 * 整合二维码展示、保存、复制链接功能
 */
export function QrSharePanel({ isOpen, onClose, pageUrl, displayName, username }: QrSharePanelProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const qrCodeUrl = `/api/qrcode?url=${encodeURIComponent(pageUrl)}&size=400&dark=2B241E&light=FFFDF8&margin=2&filename=${encodeURIComponent(username)}_qrcode`;

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}_qrcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      // 静默失败
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = pageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${displayName} | Link168`,
          text: `访问 ${displayName} 的 Link168 主页`,
          url: pageUrl,
        });
      } catch {
        // 用户取消
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--ui-ink)]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-share-title"
        className="w-full max-w-sm rounded-[30px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[var(--ui-brand)]">分享名片</p>
            <h3 id="qr-share-title" className="mt-1 text-xl font-black text-[var(--ui-ink)]">
              {displayName}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="grid size-10 place-items-center rounded-2xl bg-[var(--ui-surface-muted)] hover:bg-[var(--ui-line)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
            aria-label="关闭"
          >
            <X className="size-5 text-[var(--ui-muted)]" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-3 shadow-sm sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt={`${displayName} 的主页二维码`}
              className="size-48 rounded-lg sm:size-56"
              loading="eager"
            />
          </div>
          <p className="mt-3 text-center text-xs text-[var(--ui-muted)] sm:text-sm">
            微信扫码即可访问 @{username} 的主页
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            onClick={handleDownload}
            className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ui-success)] text-sm font-black text-[var(--ui-surface)] hover:bg-[var(--ui-success)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
          >
            {downloaded ? (
              <>
                <CheckCircle className="size-5" aria-hidden />
                已保存到相册
              </>
            ) : (
              <>
                <Download className="size-5" aria-hidden />
                保存二维码到相册
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
          >
            {copied ? (
              <>
                <CheckCircle className="size-5 text-[var(--ui-success)]" aria-hidden />
                <span className="text-[var(--ui-success)]">已复制链接</span>
              </>
            ) : (
              <>
                <Copy className="size-5 text-[var(--ui-muted)]" aria-hidden />
                复制主页链接
              </>
            )}
          </button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={handleNativeShare}
              className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
            >
              <Share2 className="size-5 text-[var(--ui-muted)]" aria-hidden />
              系统分享
            </button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-3">
          <p className="text-[11px] font-bold text-[var(--ui-muted)]">主页链接</p>
          <p className="mt-1 break-all text-sm font-black text-[var(--ui-ink)]">{pageUrl}</p>
        </div>
      </div>
    </div>
  );
}
