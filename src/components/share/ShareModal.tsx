"use client";

import { useState, useEffect, useRef } from "react";
import { X, Share2, Copy, CheckCircle, QrCode } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageUrl: string;
  displayName: string;
  username: string;
  onOpenQrCode: () => void;
}

export function ShareModal({ isOpen, onClose, pageUrl, displayName, username, onOpenQrCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare] = useState(() => {
    if (typeof navigator !== "undefined" && !!navigator.share) {
      return true;
    }
    return false;
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 焦点管理
  useEffect(() => {
    if (isOpen) {
      // 打开时聚焦关闭按钮
      closeButtonRef.current?.focus();
      // 禁止背景滚动
      document.body.style.overflow = "hidden";
    } else {
      // 关闭时恢复滚动
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape 键关闭
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制链接失败:", err);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${displayName} | Link168`,
        text: `访问 ${displayName} 的 Link168 主页`,
        url: pageUrl,
      });
      onClose();
    } catch {
      // 用户取消或浏览器不支持分享，静默处理
    }
  };

  const handleQrCodeClick = () => {
    onClose();
    setTimeout(onOpenQrCode, 100);
  };

  return (
    <div 
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--ui-ink)]/40 p-4" 
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="w-full max-w-sm rounded-[30px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[var(--ui-brand)]">分享</p>
            <h3 id="share-modal-title" className="mt-1 text-xl font-black text-[var(--ui-ink)]">
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

        <div className="mt-5 grid gap-3">
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ui-success)] text-sm font-black text-[var(--ui-surface)] hover:bg-[var(--ui-success)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
            >
              <Share2 className="size-5" aria-hidden="true" />
              系统分享
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
          >
            {copied ? (
            <>
              <CheckCircle className="size-5 text-[var(--ui-success)]" aria-hidden="true" />
              <span className="text-[var(--ui-success)]">已复制链接</span>
            </>
          ) : (
            <>
              <Copy className="size-5 text-[var(--ui-muted)]" aria-hidden="true" />
              复制链接
            </>
          )}
          </button>

          <button
            onClick={handleQrCodeClick}
            className="link168-button-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
          >
            <QrCode className="size-5 text-[var(--ui-muted)]" aria-hidden="true" />
            二维码名片
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-3">
          <p className="text-[11px] font-bold text-[var(--ui-muted)]">主页链接</p>
          <p className="mt-1 break-all text-sm font-black text-[var(--ui-ink)]">{pageUrl}</p>
        </div>
      </div>
    </div>
  );
}
