"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Share2,
  Copy,
  CheckCircle,
  QrCode,
  MessageCircle,
  Link2,
  X,
  Download,
} from "lucide-react";

interface ShareActionsProps {
  pageUrl: string;
  displayName: string;
  username: string;
  onOpenQrCode?: () => void;
}

/**
 * 内联分享操作面板
 * 悬浮在公开主页右下角，提供快速分享、复制链接、打开二维码
 */
export function ShareActions({ pageUrl, displayName, username, onOpenQrCode }: ShareActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const input = document.createElement("input");
      input.value = pageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pageUrl]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${displayName} | Link168`,
          text: `访问 ${displayName} 的 Link168 主页`,
          url: pageUrl,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      setExpanded(true);
    }
  }, [pageUrl, displayName]);

  // 点击外部关闭
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  return (
    <div ref={panelRef} className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2">
      {expanded && (
        <div
          className="mb-2 flex flex-col gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-3 shadow-lg animate-slide-up"
          role="menu"
          aria-label="分享选项"
        >
          <button
            onClick={handleCopy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
            role="menuitem"
          >
            {copied ? (
              <CheckCircle className="size-5 text-[var(--ui-success)]" aria-hidden />
            ) : (
              <Copy className="size-5 text-[var(--ui-muted)]" aria-hidden />
            )}
            {copied ? "已复制链接" : "复制主页链接"}
          </button>

          {onOpenQrCode && (
            <button
              onClick={() => {
                setExpanded(false);
                onOpenQrCode();
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
              role="menuitem"
            >
              <QrCode className="size-5 text-[var(--ui-muted)]" aria-hidden />
              二维码名片
            </button>
          )}

          <button
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(
                `${displayName} 的 Link168 主页`
              )}&body=${encodeURIComponent(`推荐你看看这个主页：${pageUrl}`)}`;
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-[var(--ui-ink)] hover:bg-[var(--ui-surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
            role="menuitem"
          >
            <MessageCircle className="size-5 text-[var(--ui-muted)]" aria-hidden />
            邮件分享
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="grid size-12 place-items-center rounded-full border border-[var(--ui-success)] bg-[var(--ui-surface)] text-[var(--ui-brand)] shadow-lg hover:bg-[var(--ui-success-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
          aria-label={copied ? "已复制链接" : "复制主页链接"}
          title="复制链接"
        >
          {copied ? (
            <CheckCircle className="size-5 text-[var(--ui-success)]" />
          ) : (
            <Link2 className="size-5" />
          )}
        </button>

        {onOpenQrCode && (
          <button
            onClick={() => {
              setExpanded(false);
              onOpenQrCode();
            }}
            className="grid size-12 place-items-center rounded-full border border-[var(--ui-success)] bg-[var(--ui-surface)] text-[var(--ui-brand)] shadow-lg hover:bg-[var(--ui-success-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)]"
            aria-label="打开二维码"
            title="二维码"
          >
            <QrCode className="size-5" />
          </button>
        )}

        <button
          onClick={() => {
            if (typeof navigator !== "undefined" && "share" in navigator) {
              handleNativeShare();
            } else {
              setExpanded(!expanded);
            }
          }}
          className="grid size-12 place-items-center rounded-full bg-[var(--ui-success)] text-[var(--ui-surface)] shadow-lg hover:bg-[var(--ui-success)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ui-brand)] focus:ring-offset-2"
          aria-label="分享"
          title="分享"
        >
          <Share2 className="size-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * 微信分享提示遮罩
 * 检测到微信浏览器时显示引导
 */
export function WechatShareTip({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-[var(--ui-ink)]/70 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="微信分享引导"
    >
      <div className="flex flex-col items-end text-[var(--ui-surface)]">
        <p className="text-lg font-black">点击右上角</p>
        <p className="mt-1 text-sm opacity-90">选择「分享到朋友圈」或「发送给朋友」</p>
        <div className="mt-4 rounded-2xl bg-[var(--ui-surface)]/10 p-4 text-sm">
          <p>1. 点击微信右上角 ··· 菜单</p>
          <p className="mt-1">2. 选择分享方式</p>
          <p className="mt-1">3. 好友点击即可访问主页</p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 rounded-full bg-[var(--ui-surface)] px-6 py-2 text-sm font-black text-[var(--ui-ink)]"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
