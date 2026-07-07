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
  onConfirm?: () => void | Promise<void>;
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
  /**
   * 操作原因输入。设置后弹窗内出现必填原因输入框。
   * onConfirm 收到的不是原函数，而是包装后的：原 onConfirm 仍可读取
   * 外部闭包变量；reason 通过 onConfirmWithReason 传出。
   */
  requireReason?: boolean;
  /** 原因最少字符数（默认 10） */
  reasonMinLength?: number;
  /** 原因占位提示 */
  reasonPlaceholder?: string;
  /** 操作完成后通过 onConfirm(reason) 形式调用 */
  onConfirmWithReason?: (reason: string) => void | Promise<void>;
  /** 影响范围说明（列表条目，每项一行） */
  impactList?: string[];
  /** 不可逆提示文案；设置后显示醒目提示条 */
  irreversibleNotice?: string;
  /** 影响对象数量提示（如"将影响 3 个用户"） */
  impactSummary?: string;
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
  requireReason = false,
  reasonMinLength = 10,
  reasonPlaceholder,
  onConfirmWithReason,
  impactList,
  irreversibleNotice,
  impactSummary,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [reason, setReason] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const config = DANGER_CONFIG[dangerLevel];
  const reasonValid = !requireReason || reason.trim().length >= reasonMinLength;
  const canConfirm =
    !loading &&
    (!inputConfirmMatch || inputValue === inputConfirmMatch) &&
    reasonValid;

  // 打开时聚焦到关闭按钮；关闭时清空输入
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setInputValue("");
      setReason("");
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

          {impactSummary ? (
            <div className={`mt-3 rounded-2xl border px-4 py-3 text-xs font-bold ${config.colorHeader} ${config.bgHeader} ${config.borderHeader} border`}>
              影响范围：{impactSummary}
            </div>
          ) : null}

          {extraInfo ? (
            <div className="mt-3 rounded-2xl bg-[#F9F6F1] px-4 py-3 text-xs leading-5 text-[#7A6D5E]">
              {extraInfo}
            </div>
          ) : null}

          {impactList && impactList.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-3">
              <p className="text-xs font-black text-[#2B241E]">操作将产生以下影响：</p>
              <ul className="mt-2 space-y-1">
                {impactList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[#7A6D5E]">
                    <span aria-hidden className="mt-0.5 text-[#B42318]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {irreversibleNotice ? (
            <div className="mt-3 rounded-2xl border border-[#B42318] bg-[#FFF1F0] px-4 py-3 text-xs font-black text-[#B42318]">
              <span aria-hidden className="mr-1">⛔ 不可逆：</span>
              {irreversibleNotice}
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

          {requireReason ? (
            <div className="mt-4 grid gap-2">
              <label htmlFor="confirm-reason" className="text-sm font-bold text-[#2B241E]">
                操作原因 <span className="text-[#B42318]">*</span>
                <span className="ml-2 text-xs font-normal text-[#7A6D5E]">
                  （不少于 {reasonMinLength} 字，将写入审计日志）
                </span>
              </label>
              <textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder || "请说明本次操作的具体原因，例如：经核查确认存在违规行为，已与当事人核实。"}
                rows={3}
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-3 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
              />
              {requireReason && reason.length > 0 && reason.trim().length < reasonMinLength ? (
                <p className="text-xs font-bold text-[#B42318]">
                  原因至少 {reasonMinLength} 字，当前 {reason.trim().length} 字
                </p>
              ) : null}
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
                onClick={() => {
                  if (onConfirmWithReason) {
                    void onConfirmWithReason(reason.trim());
                  } else if (onConfirm) {
                    void onConfirm();
                  }
                }}
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
