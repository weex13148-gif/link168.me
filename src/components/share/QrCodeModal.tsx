"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, CheckCircle } from "lucide-react";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageUrl: string;
  displayName: string;
  username: string;
}

export function QrCodeModal({ isOpen, onClose, pageUrl, displayName, username }: QrCodeModalProps) {
  const [downloaded, setDownloaded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 焦点管理
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

  const qrCodeUrl = `/api/qrcode?url=${encodeURIComponent(pageUrl)}&size=400&dark=2B241E&light=FFFDF8&margin=2&filename=${encodeURIComponent(username)}_qrcode`;

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
    } catch (err) {
      console.error("下载二维码失败:", err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/40 p-4" 
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qrcode-modal-title"
        className="w-full max-w-sm rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(86,68,46,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">二维码</p>
            <h3 id="qrcode-modal-title" className="mt-1 text-xl font-black text-[#2B241E]">
              {displayName}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="grid size-10 place-items-center rounded-2xl bg-[#F2E7D8] hover:bg-[#E8DCCB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6F8F4E]"
            aria-label="关闭"
          >
            <X className="size-5 text-[#7A6D5E]" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-2xl border border-[#E8DCCB] bg-white p-3 shadow-sm sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt={`${displayName} 的主页二维码`}
              className="size-48 rounded-lg sm:size-64 sm:rounded-xl"
            />
          </div>

          <p className="mt-4 text-center text-xs text-[#7A6D5E] sm:text-sm">
            扫码访问 @{username} 的主页
          </p>

          <button
            onClick={handleDownload}
            className="link168-button-press mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white hover:bg-[#5E7F3F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6F8F4E] focus:ring-offset-2"
          >
            {downloaded ? (
              <>
                <CheckCircle className="size-5" aria-hidden="true" />
                <span className="text-[#6F8F4E]">已保存</span>
              </>
            ) : (
              <>
                <Download className="size-5" aria-hidden="true" />
                下载二维码
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
