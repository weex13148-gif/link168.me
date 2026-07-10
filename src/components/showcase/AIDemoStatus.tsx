"use client";

import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle, XCircle, Lock, Clock, Zap, Play, Pause, RefreshCw } from "lucide-react";

export type AIDemoStatusType =
  | "preparing"
  | "available"
  | "calling"
  | "success"
  | "safety_reject"
  | "insufficient_quota"
  | "service_unavailable"
  | "timeout"
  | "demo_closed"
  | "audit_replay";

export interface AIDemoStatusProps {
  status: AIDemoStatusType;
  message?: string;
  modelInfo?: {
    name?: string;
    version?: string;
    tokenCount?: number;
    cost?: string;
  };
  onRetry?: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<AIDemoStatusType, {
  label: string;
  icon: typeof Loader2;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
  description: string;
}> = {
  preparing: {
    label: "准备中",
    icon: Loader2,
    bg: "bg-[var(--ui-surface-muted)]",
    border: "border-[var(--ui-line)]",
    text: "text-[var(--ui-muted)]",
    iconColor: "text-[var(--ui-muted)]",
    description: "正在初始化演示环境，请稍候",
  },
  available: {
    label: "可调用",
    icon: Zap,
    bg: "bg-[var(--ui-success-soft)]",
    border: "border-[var(--ui-success-soft)]",
    text: "text-[var(--ui-success)]",
    iconColor: "text-[var(--ui-success)]",
    description: "AI 演示功能已就绪，可以发起调用",
  },
  calling: {
    label: "调用中",
    icon: Loader2,
    bg: "bg-[var(--ui-brand-soft)]",
    border: "border-[var(--ui-brand-soft)]",
    text: "text-[var(--ui-brand)]",
    iconColor: "text-[var(--ui-brand)]",
    description: "正在处理您的请求，请勿重复提交",
  },
  success: {
    label: "调用成功",
    icon: CheckCircle,
    bg: "bg-[var(--ui-success-soft)]",
    border: "border-[var(--ui-success)]",
    text: "text-[var(--ui-success)]",
    iconColor: "text-[var(--ui-success)]",
    description: "AI 已成功生成响应",
  },
  safety_reject: {
    label: "安全拒答",
    icon: AlertCircle,
    bg: "bg-[var(--ui-warning-soft)]",
    border: "border-[var(--ui-warning)]",
    text: "text-[var(--ui-warning)]",
    iconColor: "text-[var(--ui-warning)]",
    description: "请求内容触发安全策略，已拒绝处理",
  },
  insufficient_quota: {
    label: "额度不足",
    icon: Lock,
    bg: "bg-[var(--ui-info-soft)]",
    border: "border-[var(--ui-info)]",
    text: "text-[var(--ui-info)]",
    iconColor: "text-[var(--ui-info)]",
    description: "当前演示额度已用完，请稍后再试",
  },
  service_unavailable: {
    label: "服务不可用",
    icon: XCircle,
    bg: "bg-[var(--ui-danger-soft)]",
    border: "border-[var(--ui-danger)]",
    text: "text-[var(--ui-danger)]",
    iconColor: "text-[var(--ui-danger)]",
    description: "AI 服务暂时不可用，请稍后再试",
  },
  timeout: {
    label: "请求超时",
    icon: Clock,
    bg: "bg-[var(--ui-info-soft)]",
    border: "border-[var(--ui-info)]",
    text: "text-[var(--ui-info)]",
    iconColor: "text-[var(--ui-info)]",
    description: "请求处理超时，请尝试重新提交",
  },
  demo_closed: {
    label: "演示已关闭",
    icon: Lock,
    bg: "bg-[var(--ui-surface-muted)]",
    border: "border-[var(--ui-line)]",
    text: "text-[var(--ui-muted)]",
    iconColor: "text-[var(--ui-muted)]",
    description: "当前演示已关闭，无法发起新的调用",
  },
  audit_replay: {
    label: "审计回放",
    icon: Play,
    bg: "bg-[var(--ui-accent-soft)]",
    border: "border-[var(--ui-accent)]",
    text: "text-[#7D5B24]",
    iconColor: "text-[#7D5B24]",
    description: "正在回放之前的 AI 交互记录",
  },
};

export default function AIDemoStatus({ status, message, modelInfo, onRetry, disabled }: AIDemoStatusProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const canRetry = ["timeout", "service_unavailable", "insufficient_quota", "safety_reject"].includes(status);

  return (
    <div
      className={`rounded-[var(--ui-radius-md)] ${config.bg} ${config.border} border p-5 transition-all duration-200 ${isHovered ? "shadow-md" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`grid size-12 place-items-center rounded-lg bg-white/60 ${status === "calling" ? "animate-pulse" : ""}`}>
            <Icon className={`size-6 ${config.iconColor} ${status === "calling" || status === "preparing" ? "animate-spin" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${config.text}`}>{config.label}</span>
              {status === "available" && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--ui-muted)]">
                  <span className="size-1.5 rounded-full bg-[var(--ui-success)]"></span>
                  实时
                </span>
              )}
            </div>
            <p className={`mt-1 text-xs ${config.text}`}>{message || config.description}</p>
            {modelInfo && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {modelInfo.name && (
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--ui-faint)]">模型：</span>
                    <span className="font-bold text-[var(--ui-text)]">{modelInfo.name}</span>
                  </div>
                )}
                {modelInfo.version && (
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--ui-faint)]">版本：</span>
                    <span className="font-bold text-[var(--ui-text)]">{modelInfo.version}</span>
                  </div>
                )}
                {modelInfo.tokenCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--ui-faint)]">Tokens：</span>
                    <span className="font-bold text-[var(--ui-text)]">{modelInfo.tokenCount.toLocaleString()}</span>
                  </div>
                )}
                {modelInfo.cost && (
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--ui-faint)]">成本：</span>
                    <span className="font-bold text-[var(--ui-text)]">{modelInfo.cost}</span>
                  </div>
                )}
                {!modelInfo.name && !modelInfo.version && !modelInfo.tokenCount && !modelInfo.cost && (
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--ui-faint)]">详情：</span>
                    <span className="font-bold text-[var(--ui-muted)]">—</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {canRetry && onRetry && !disabled && (
          <button
            type="button"
            onClick={onRetry}
            className="ui-button-secondary min-h-9 px-4 text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="size-3" />
            重新尝试
          </button>
        )}
        {status === "calling" && (
          <div className="flex items-center gap-2 text-xs text-[var(--ui-muted)] self-start sm:self-auto">
            <Pause className="size-3" />
            处理中，请勿重复提交
          </div>
        )}
      </div>
    </div>
  );
}