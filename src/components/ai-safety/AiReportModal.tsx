"use client";

import { useState } from "react";

/**
 * 举报类型枚举
 */
export type ReportType =
  | "error"           // 错误信息举报
  | "illegal"          // 违法违规举报
  | "unsafe"           // 不安全建议举报
  | "privacy"          // 隐私问题举报
  | "other";           // 其他

/**
 * 举报弹窗组件 Props
 */
export type AiReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assistant?: string;
  userMessage?: string;
  aiResponse?: string;
};

/**
 * 举报类型配置
 */
const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: "error",
    label: "错误信息",
    description: "AI 回复存在事实错误或误导性信息",
  },
  {
    value: "illegal",
    label: "违法违规",
    description: "AI 回复涉及违法法规内容，如犯罪指导、欺诈等",
  },
  {
    value: "unsafe",
    label: "不安全建议",
    description: "AI 给出了危险或不安全的建议",
  },
  {
    value: "privacy",
    label: "隐私问题",
    description: "AI 回复存在隐私泄露风险",
  },
  {
    value: "other",
    label: "其他",
    description: "其他问题或顾虑",
  },
];

/**
 * AI 回答举报弹窗组件
 * 用于用户对 AI 的回答提交举报
 */
export default function AiReportModal({ isOpen, onClose, assistant, userMessage, aiResponse }: AiReportModalProps) {
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置表单
  const resetForm = () => {
    setReportType("");
    setReason("");
    setError(null);
    setSubmitted(false);
  };

  // 关闭弹窗
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 提交举报
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType) {
      setError("请选择举报类型");
      return;
    }

    if (reason.trim().length < 5) {
      setError("举报原因不能少于5个字符");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant: assistant || "",
          userMessage: userMessage || "",
          aiResponse: aiResponse || "",
          reason: reason.trim(),
        }),
      });

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (result.success) {
        setSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || "举报提交失败，请稍后重试");
      }
    } catch {
      setError("网络错误，请检查网络连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* 弹窗内容 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-[#7A6D5E] hover:text-[#2B241E]"
          aria-label="关闭"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          /* 提交成功状态 */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6F8F4E]">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#2B241E]">举报已收到</p>
            <p className="mt-2 text-sm text-[#7A6D5E]">感谢您的反馈，我们会尽快审核处理。</p>
            <p className="mt-4 text-xs text-[#7A6D5E]">页面将在2秒后自动关闭...</p>
          </div>
        ) : (
          /* 举报表单 */
          <>
            <h2 className="text-lg font-bold text-[#2B241E]">举报 AI 回答</h2>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              感谢您帮助我们改进 AI 安全性。所有举报将经过审核处理。
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* 举报类型选择 */}
              <div>
                <label className="block text-xs font-bold text-[#2B241E]">
                  举报类型 <span className="text-[#B42318]">*</span>
                </label>
                <div className="mt-2 space-y-2">
                  {REPORT_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition ${
                        reportType === type.value
                          ? "border-[#6F8F4E] bg-[#6F8F4E]/5"
                          : "border-[#E8DCCB] hover:border-[#6F8F4E]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportType"
                        value={type.value}
                        checked={reportType === type.value}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="mt-0.5 h-3 w-3 accent-[#6F8F4E]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#2B241E]">{type.label}</p>
                        <p className="text-xs text-[#7A6D5E]">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 举报原因 */}
              <div>
                <label htmlFor="reason" className="block text-xs font-bold text-[#2B241E]">
                  举报原因 <span className="text-[#B42318]">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请详细描述问题（至少5个字符）"
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-[#E8DCCB] p-2 text-xs text-[#2B241E] placeholder-[#7A6D5E]/50 focus:border-[#6F8F4E] focus:outline-none focus:ring-1 focus:ring-[#6F8F4E]"
                />
                <p className="mt-1 text-xs text-[#7A6D5E]">
                  {reason.length}/500 字符
                </p>
              </div>

              {/* AI 回复预览 */}
              {aiResponse && (
                <div>
                  <label className="block text-xs font-bold text-[#2B241E]">AI 回复预览</label>
                  <div className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-[#E8DCCB] bg-[#F5F0E8] p-2">
                    <p className="text-xs text-[#7A6D5E]">
                      {aiResponse.length > 300 ? aiResponse.slice(0, 300) + "..." : aiResponse}
                    </p>
                  </div>
                </div>
              )}

              {/* 免责声明 */}
              <div className="rounded-lg border border-dashed border-[#E8DCCB] bg-[#F5F0E8] p-3">
                <p className="text-xs text-[#7A6D5E]">
                  <span className="font-bold">注意：</span>
                  恶意举报将可能被追究法律责任。请如实描述问题，帮助我们改进服务。
                </p>
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="rounded-lg bg-[#B42318]/10 p-2">
                  <p className="text-xs text-[#B42318]">{error}</p>
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-[#E8DCCB] py-2 text-xs font-bold text-[#7A6D5E] transition hover:bg-[#F5F0E8]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#B42318] py-2 text-xs font-bold text-white transition hover:bg-[#9a1f15] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "提交中..." : "提交举报"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* 页面底部标识 */}
        <p className="mt-4 text-center text-xs text-[#7A6D5E]">
          内容由人工智能生成，仅供参考，不构成专业建议
        </p>
      </div>
    </div>
  );
}
