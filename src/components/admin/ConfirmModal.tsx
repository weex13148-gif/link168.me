"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmModalDangerLevel = "warn" | "danger" | "critical";

const DANGER_CONFIG = {
  warn: {
    bgHeader: "bg-[#FFF9E8]",
    colorHeader: "text-[#8C612E]",
    borderHeader: "border-[#E8DCCB]",
    bgButton: "bg-[#8C612E]",
    bgButtonHover: "hover:bg-[#7A5525]",
    label: "操作确认",
  },
  danger: {
    bgHeader: "bg-[#FFF1F0]",
    colorHeader: "text-[#B42318]",
    borderHeader: "border-[#F0C8C8]",
    bgButton: "bg-[#B42318]",
    bgButtonHover: "hover:bg-[#9A1E14]",
    label: "危险操作",
  },
  critical: {
    bgHeader: "bg-[#2B241E]",
    colorHeader: "text-[#FFF1F0]",
    borderHeader: "border-[#B42318]",
    bgButton: "bg-[#B42318]",
    bgButtonHover: "hover:bg-[#9A1E14]",
    label: "最高风险操作",
  },
} as const;

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  dangerLevel?: ConfirmModalDangerLevel;
  /** 默认显示"取消"和确认按钮。为 true 时显示单按钮"关闭" */
  singleButton?: boolean;
  /** 单按钮模式下按钮文字 */
  singleButtonLabel?: string;
  /** 额外信息（如角色变更详情、预计影响） */
  extraInfo?: string;
  /** 输入框 placeholder，用于要求操作者输入文字确认 */
  inputPlaceholder?: string;
  /** 如果设置，则要求输入框内容与 confirmText 完全匹配才允许确认 */
  inputConfirmMatch?: string;
  loading?: boolean;
}

/**
 * 高风险操作二次确认弹窗
 * - 自动 Body scroll lock
 * - Escape / 遮罩层点击关闭（非 loading 状态）
 * - 危险等级区分样式
 * - 可选输入框匹配确认
 * - Keyboard trap（焦点停留在弹窗内）
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  dangerLevel = "warn",
  singleButton = false,
  singleButtonLabel,
  extraInfo,
  inputPlaceholder,
  inputConfirmMatch,
  loading = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const config = DANGER_CONFIG[dangerLevel];
  const canConfirm = !loading && (!inputConfirmMatch || inputValue === inputConfirmMatch);

  // 打开时聚焦到关闭按钮；关闭时清空输入
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setInputValue("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape + 焦点 trap
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap
      if (e.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* 弹窗 */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-[28px] border border-[#E8DCCB] bg-white shadow-xl"
      >
        {/* 顶部色条 */}
        <div
          className={`flex items-center justify-between rounded-t-[28px] ${config.bgHeader} ${config.borderHeader} border-b px-6 py-4`}
        >
          <div className="flex items-center gap-2">
            {(dangerLevel === "danger" || dangerLevel === "critical") && (
              <AlertTriangle className={`size-5 ${config.colorHeader}`} aria-hidden="true" />
            )}
            <h2 id="confirm-modal-title" className={`text-base font-black ${config.colorHeader}`}>
              {title}
            </h2>
          </div>
          {!singleButton && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl p-2 text-[#7A6D5E] hover:bg-black/5 disabled:opacity-40"
              aria-label="关闭"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-[#2B241E]">{description}</p>

          {extraInfo ? (
            <div className="mt-3 rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-5 text-[#7A6D5E]">
              {extraInfo}
            </div>
          ) : null}

          {inputConfirmMatch ? (
            <div className="mt-4 grid gap-2">
              <label htmlFor="confirm-input" className="text-sm font-bold text-[#2B241E]">
                请输入 <span className="font-black text-[#B42318]">{inputConfirmMatch}</span> 确认：
              </label>
              <input
                id="confirm-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder || inputConfirmMatch}
                autoComplete="off"
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
              />
            </div>
          ) : null}
        </div>

        {/* 按钮行 */}
        <div className="flex items-center justify-end gap-3 rounded-b-[28px] border-t border-[#E8DCCB] bg-[#FFF9F0] px-6 py-4">
          {singleButton ? (
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white"
            >
              {singleButtonLabel || "关闭"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-5 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7] disabled:opacity-50"
              >
                取消
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => void onConfirm()}
                disabled={!canConfirm}
                className={`min-h-11 rounded-2xl px-5 text-sm font-black text-white transition ${config.bgButton} ${config.bgButtonHover} disabled:opacity-50`}
              >
                {loading ? "处理中…" : "确认执行"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
