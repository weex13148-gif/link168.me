"use client";

/**
 * Jeepwork 管理后台共享 UI 组件库
 *
 * 目标：统一 18 个 /jeepwork 页面的状态标签、空状态、错误状态、加载状态、
 * 卡片、筛选栏、详情抽屉、分页器、危险操作横幅等基础展示元素，避免各页面
 * 各自手写造成样式碎片化。
 *
 * 仅依赖 React + Tailwind + 全站 CSS 变量（var(--ui-*)），不引入新依赖。
 * 所有组件均为纯展示组件，不触发任何业务 API 调用。
 */

import { Eye, EyeOff, X } from "lucide-react";
import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

/* ============================================================
 * 1. 状态标签 AdminStatusBadge
 *    统一中文标签 + 视觉等级，相同状态在不同页面使用相同名称与颜色。
 * ========================================================== */

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical"
  | "muted";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)] border-[var(--ui-line)]",
  info: "bg-[var(--ui-info-soft)] text-[var(--ui-info)] border-[rgb(63_95_143/18%)]",
  success: "bg-[var(--ui-success-soft)] text-[var(--ui-success)] border-[rgb(53_81_38/20%)]",
  warning: "bg-[var(--ui-accent-soft)] text-[#7D5B24] border-[rgb(189_148_80/30%)]",
  danger: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)] border-[rgb(180_35_24/22%)]",
  critical: "bg-[var(--ui-danger)] text-white border-[var(--ui-danger)]",
  muted: "bg-transparent text-[var(--ui-faint)] border-[var(--ui-line)]",
};

export interface AdminStatusBadgeProps {
  /** 中文标签文案 */
  label: string;
  /** 视觉等级 */
  tone?: StatusTone;
  /** 可选辅助信息（如英文枚举），以小字附在主标签后 */
  hint?: string;
  /** 是否显示小圆点（默认显示） */
  dot?: boolean;
  className?: string;
}

export function AdminStatusBadge({
  label,
  tone = "neutral",
  hint,
  dot = true,
  className = "",
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONE_CLASS[tone]} ${className}`}
    >
      {dot ? (
        <span
          aria-hidden
          className={`inline-block size-1.5 rounded-full ${
            tone === "critical"
              ? "bg-white"
              : tone === "muted"
                ? "bg-[var(--ui-faint)]"
                : "bg-current opacity-70"
          }`}
        />
      ) : null}
      <span>{label}</span>
      {hint ? (
        <span className="text-[10px] font-bold opacity-70">{hint}</span>
      ) : null}
    </span>
  );
}

/* ============================================================
 * 2. 状态映射助手 STATUS_TONE_MAP
 *    常见状态字符串 → (中文标签, tone) 的统一映射。
 *    各页面可直接调用 resolveStatus(status) 得到统一徽章。
 * ========================================================== */

const STATUS_TONE_MAP: Record<string, { label: string; tone: StatusTone }> = {
  // 通用
  active: { label: "正常", tone: "success" },
  enabled: { label: "已启用", tone: "success" },
  configured: { label: "已配置", tone: "success" },
  available: { label: "可用", tone: "success" },
  ok: { label: "正常", tone: "success" },
  healthy: { label: "健康", tone: "success" },
  inactive: { label: "未启用", tone: "neutral" },
  disabled: { label: "已停用", tone: "neutral" },
  pending: { label: "待处理", tone: "warning" },
  pending_manual_review: { label: "待人工复核", tone: "warning" },
  in_progress: { label: "处理中", tone: "info" },
  processing: { label: "处理中", tone: "info" },
  processing_manual: { label: "处理中", tone: "info" },
  approved: { label: "已通过", tone: "success" },
  rejected: { label: "已拒绝", tone: "danger" },
  passed: { label: "已通过", tone: "success" },
  failed: { label: "失败", tone: "danger" },
  error: { label: "异常", tone: "danger" },
  frozen: { label: "已冻结", tone: "warning" },
  banned: { label: "已封禁", tone: "critical" },
  closed: { label: "已关闭", tone: "neutral" },
  cancelled: { label: "已取消", tone: "neutral" },
  completed: { label: "已完成", tone: "success" },
  done: { label: "已完成", tone: "success" },
  refunded: { label: "已退款", tone: "info" },
  paid: { label: "已支付", tone: "success" },
  unpaid: { label: "待支付", tone: "warning" },
  expired: { label: "已过期", tone: "neutral" },
  deactivated: { label: "已注销", tone: "muted" },
  maintenance: { label: "维护中", tone: "warning" },
  degraded: { label: "降级中", tone: "warning" },
  incomplete: { label: "未完成", tone: "warning" },
  legacy: { label: "历史数据", tone: "muted" },
  null: { label: "历史数据", tone: "muted" },
  undefined: { label: "历史数据", tone: "muted" },
  // 举报
  open: { label: "待处理", tone: "warning" },
  resolved: { label: "已处置", tone: "success" },
  dismissed: { label: "已驳回", tone: "neutral" },
  appealed: { label: "申诉中", tone: "info" },
  // 会员
  free: { label: "免费版", tone: "neutral" },
  member_plus: { label: "Pro", tone: "info" },
  pro: { label: "Pro", tone: "info" },
  enterprise: { label: "企业版", tone: "info" },
  // 角色
  super_admin: { label: "超级管理员", tone: "critical" },
  admin: { label: "管理员", tone: "info" },
  user: { label: "普通用户", tone: "neutral" },
};

export function resolveStatus(
  status: string | null | undefined,
  fallbackLabel?: string,
): { label: string; tone: StatusTone } {
  if (status == null || status === "") {
    return { label: fallbackLabel ?? "历史数据", tone: "muted" };
  }
  const key = String(status).toLowerCase();
  return (
    STATUS_TONE_MAP[key] ?? {
      label: fallbackLabel ?? String(status),
      tone: "neutral",
    }
  );
}

export function AdminStatusBadgeFromCode({
  status,
  fallbackLabel,
  hint,
}: {
  status: string | null | undefined;
  fallbackLabel?: string;
  hint?: string;
}) {
  const { label, tone } = resolveStatus(status, fallbackLabel);
  return <AdminStatusBadge label={label} tone={tone} hint={hint} />;
}

/* ============================================================
 * 3. 空状态 AdminEmptyState
 * ========================================================== */

export interface AdminEmptyStateProps {
  title?: string;
  description?: string;
  /** 主操作（如"清除筛选"按钮） */
  actionLabel?: string;
  onAction?: () => void;
  /** 是否紧凑显示（用于表格内嵌行） */
  compact?: boolean;
  icon?: ReactNode;
}

export function AdminEmptyState({
  title = "暂无数据",
  description,
  actionLabel,
  onAction,
  compact = false,
  icon,
}: AdminEmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <p className="text-sm font-bold text-[var(--ui-muted)]">{title}</p>
        {description ? (
          <p className="text-xs text-[var(--ui-faint)]">{description}</p>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="ui-button-quiet mt-1 px-3 text-xs"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--ui-radius-md)] border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]">
        {icon ?? <span aria-hidden className="text-xl font-black">∅</span>}
      </div>
      <div>
        <p className="text-sm font-black text-[var(--ui-ink)]">{title}</p>
        {description ? (
          <p className="ui-muted mt-1 text-xs leading-5">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="ui-button-secondary mt-2 min-h-10 px-4 text-xs"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ============================================================
 * 4. 错误状态 AdminErrorState
 * ========================================================== */

export interface AdminErrorStateProps {
  title?: string;
  description?: string;
  /** 重试回调；不传则只显示文案 */
  onRetry?: () => void;
  retryLabel?: string;
  /** 透传的错误对象（仅显示 message，不显示堆栈） */
  error?: unknown;
  compact?: boolean;
}

function pickMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "object" && err !== null) {
    const e = err as { message?: string; error?: { message?: string } };
    if (typeof e.message === "string") return e.message;
    if (e.error?.message) return e.error.message;
  }
  return fallback;
}

export function AdminErrorState({
  title = "加载失败",
  description,
  onRetry,
  retryLabel = "重试",
  error,
  compact = false,
}: AdminErrorStateProps) {
  const message = description ?? pickMessage(error, "请稍后重试或联系系统管理员。");
  if (compact) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-[var(--ui-radius-sm)] border border-[rgb(180_35_24/22%)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm">
        <p className="font-black text-[var(--ui-danger)]">{title}</p>
        <p className="text-xs leading-5 text-[var(--ui-ink)]">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ui-button-secondary mt-1 min-h-9 px-3 text-xs"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--ui-radius-md)] border border-[rgb(180_35_24/22%)] bg-[var(--ui-danger-soft)] px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[var(--ui-danger)]/10 text-[var(--ui-danger)]">
        <span aria-hidden className="text-xl font-black">!</span>
      </div>
      <div>
        <p className="text-sm font-black text-[var(--ui-danger)]">{title}</p>
        <p className="ui-muted mt-1 max-w-md text-xs leading-5">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ui-button-primary mt-2 min-h-10 px-4 text-xs"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ============================================================
 * 5. 加载状态 AdminLoadingState
 * ========================================================== */

export interface AdminLoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function AdminLoadingState({
  label = "正在加载真实数据…",
  compact = false,
}: AdminLoadingStateProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-[var(--ui-muted)]">
        <span
          aria-hidden
          className="inline-block size-3 animate-spin rounded-full border-2 border-[var(--ui-line)] border-t-[var(--ui-brand)]"
        />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span
        aria-hidden
        className="inline-block size-6 animate-spin rounded-full border-2 border-[var(--ui-line)] border-t-[var(--ui-brand)]"
      />
      <p className="text-sm font-bold text-[var(--ui-muted)]">{label}</p>
    </div>
  );
}

/* ============================================================
 * 6. 无权限状态 AdminNoPermissionState
 * ========================================================== */

export function AdminNoPermissionState({
  title = "无访问权限",
  description = "您当前的角色无权访问该页面。请联系超级管理员开通权限。",
  backHref = "/jeepwork",
  backLabel = "返回后台首页",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--ui-radius-md)] border border-[var(--ui-line)] bg-[var(--ui-surface)] px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[var(--ui-accent-soft)] text-[#7D5B24]">
        <span aria-hidden className="text-xl font-black">⊘</span>
      </div>
      <div>
        <p className="text-sm font-black text-[var(--ui-ink)]">{title}</p>
        <p className="ui-muted mt-1 max-w-md text-xs leading-5">{description}</p>
      </div>
      <Link
        href={backHref}
        className="ui-button-secondary mt-2 min-h-10 px-4 text-xs"
      >
        {backLabel}
      </Link>
    </div>
  );
}

/* ============================================================
 * 7. 卡片 AdminCard (统一 section 容器)
 * ========================================================== */

export interface AdminCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 顶部色条（用于突出告警/危险区块） */
  accent?: "brand" | "warning" | "danger" | "info" | "neutral";
  /** 是否带边框分隔头部 */
  dividedHeader?: boolean;
}

const ACCENT_BORDER: Record<NonNullable<AdminCardProps["accent"]>, string> = {
  brand: "border-t-2 border-t-[var(--ui-brand)]",
  warning: "border-t-2 border-t-[var(--ui-accent)]",
  danger: "border-t-2 border-t-[var(--ui-danger)]",
  info: "border-t-2 border-t-[var(--ui-info)]",
  neutral: "",
};

export function AdminCard({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
  accent,
  dividedHeader = true,
}: AdminCardProps) {
  const accentClass = accent ? ACCENT_BORDER[accent] : "";
  return (
    <section className={`ui-surface overflow-hidden ${accentClass} ${className}`}>
      {title || description || actions ? (
        <div
          className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
            dividedHeader ? "border-b border-[var(--ui-line)]" : ""
          }`}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="font-black text-[var(--ui-ink)]">{title}</h2>
            ) : null}
            {description ? (
              <p className="ui-muted mt-1 text-xs leading-5">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={`min-w-0 ${bodyClassName || "p-5"}`}>{children}</div>
    </section>
  );
}

/* ============================================================
 * 8. 危险/告警横幅 AdminAlertBanner
 *    用于已知限制、系统降级、风险提示。
 * ========================================================== */

export type AlertTone = "info" | "warning" | "danger" | "success";

const ALERT_CLASS: Record<AlertTone, string> = {
  info: "border-[rgb(63_95_143/22%)] bg-[var(--ui-info-soft)] text-[var(--ui-info)]",
  warning:
    "border-[rgb(189_148_80/32%)] bg-[var(--ui-accent-soft)] text-[#7D5B24]",
  danger:
    "border-[rgb(180_35_24/22%)] bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
  success:
    "border-[rgb(53_81_38/22%)] bg-[var(--ui-success-soft)] text-[var(--ui-success)]",
};

const ALERT_ICON: Record<AlertTone, string> = {
  info: "ⓘ",
  warning: "⚠",
  danger: "⛔",
  success: "✓",
};

export function AdminAlertBanner({
  tone = "warning",
  title,
  children,
  className = "",
  action,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-[var(--ui-radius-sm)] border px-4 py-3 text-sm ${ALERT_CLASS[tone]} ${className}`}
      role="status"
    >
      <span aria-hidden className="font-black leading-6">
        {ALERT_ICON[tone]}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="font-black leading-6">{title}</p>
        ) : null}
        <div className="text-xs leading-5 opacity-90">{children}</div>
      </div>
      {action ? (
        <div className="flex-shrink-0">{action}</div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * 9. 筛选栏 AdminFilters
 * ========================================================== */

export interface AdminFiltersProps {
  children: ReactNode;
  /** 查询按钮回调；不传则不显示查询按钮（适合即时筛选） */
  onSubmit?: () => void;
  /** 重置回调；不传则不显示重置按钮 */
  onReset?: () => void;
  /** 是否在加载中 */
  loading?: boolean;
  /** 查询按钮文案 */
  submitLabel?: string;
  /** 重置按钮文案 */
  resetLabel?: string;
  className?: string;
}

export function AdminFilters({
  children,
  onSubmit,
  onReset,
  loading = false,
  submitLabel = "查询",
  resetLabel = "重置",
  className = "",
}: AdminFiltersProps) {
  return (
    <div
      className={`rounded-[var(--ui-radius-md)] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 ${className}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {children}
      </div>
      {onSubmit || onReset ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--ui-line)] pt-3">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              disabled={loading}
              className="ui-button-secondary min-h-10 px-4 text-xs disabled:opacity-50"
            >
              {resetLabel}
            </button>
          ) : null}
          {onSubmit ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="ui-button-primary min-h-10 px-5 text-xs disabled:opacity-50"
            >
              {loading ? "查询中…" : submitLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminFilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs font-black text-[var(--ui-muted)]">{label}</span>
      {children}
    </label>
  );
}

export const adminInputClass =
  "min-h-10 w-full rounded-[var(--ui-radius-sm)] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] px-3 text-sm text-[var(--ui-ink)] outline-none transition focus:border-[var(--ui-brand)] focus:ring-2 focus:ring-[rgb(95_127_69/15%)]";

/* ============================================================
 * 10. 表格 AdminTable
 *     统一表头、行高、空状态、加载状态、横向滚动容器。
 * ========================================================== */

export interface AdminTableColumn<T> {
  key: string;
  label: ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  /** 自定义单元格渲染 */
  render?: (row: T, index: number) => ReactNode;
  /** 是否在窄屏隐藏 */
  hideOnNarrow?: boolean;
  /** 是否固定在右侧（操作列） */
  stickyRight?: boolean;
}

export interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  empty?: ReactNode;
  /** 行点击 */
  onRowClick?: (row: T) => void;
  /** 是否允许横向滚动（默认允许） */
  scrollX?: boolean;
  /** 列堆叠为卡片的最大断点（默认 md） */
  cardBreakpoint?: "sm" | "md" | "lg";
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  scrollX = true,
  cardBreakpoint = "md",
}: AdminTableProps<T>) {
  const bp = cardBreakpoint === "sm" ? "sm" : cardBreakpoint === "lg" ? "lg" : "md";
  const tableWrap = scrollX
    ? "overflow-x-auto"
    : "overflow-hidden";
  return (
    <div className="ui-surface overflow-hidden">
      <div className={`${tableWrap} ${bp}:block hidden`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align ?? "left" }}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-wide text-[var(--ui-muted)] ${
                    col.stickyRight ? "sticky right-0 bg-[var(--ui-surface-muted)]/95 backdrop-blur" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6">
                  <AdminLoadingState compact label="正在加载…" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4">
                  {empty ?? <AdminEmptyState compact title="暂无符合条件的记录" />}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-[var(--ui-line)] last:border-b-0 transition ${
                    onRowClick ? "cursor-pointer hover:bg-[var(--ui-surface-muted)]/60" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align ?? "left" }}
                      className={`px-4 py-3 align-middle text-[var(--ui-ink)] ${
                        col.stickyRight ? "sticky right-0 bg-[var(--ui-surface)] backdrop-blur" : ""
                      }`}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 窄屏卡片列表 */}
      <div className={`${bp}:hidden divide-y divide-[var(--ui-line)]`}>
        {loading ? (
          <div className="px-4 py-6">
            <AdminLoadingState compact label="正在加载…" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6">
            {empty ?? <AdminEmptyState compact title="暂无符合条件的记录" />}
          </div>
        ) : (
          rows.map((row, idx) => (
            <div key={rowKey(row, idx)} className="px-4 py-3">
              {columns
                .filter((c) => !c.stickyRight)
                .map((col, ci) => {
                  const value = col.render
                    ? col.render(row, idx)
                    : String((row as Record<string, unknown>)[col.key] ?? "—");
                  return (
                    <div
                      key={col.key}
                      className={`flex items-start gap-3 ${ci === 0 ? "" : "mt-1"}`}
                    >
                      <span className="w-24 flex-shrink-0 text-xs font-black text-[var(--ui-muted)]">
                        {col.label}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-[var(--ui-ink)]">
                        {value}
                      </span>
                    </div>
                  );
                })}
              {columns.find((c) => c.stickyRight) ? (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  {columns
                    .filter((c) => c.stickyRight)
                    .map((col) => (
                      <span key={col.key}>
                        {col.render ? col.render(row, idx) : null}
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * 11. 分页 AdminPagination
 * ========================================================== */

export interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** 是否显示"共 N 条" */
  showTotal?: boolean;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  showTotal = true,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-xs text-[var(--ui-muted)]">
      {showTotal ? (
        <span>
          共 <strong className="text-[var(--ui-ink)]">{total}</strong> 条，
          当前 {from}-{to}
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="ui-button-secondary min-h-9 px-3 text-xs disabled:opacity-40"
        >
          上一页
        </button>
        <span className="text-xs font-bold text-[var(--ui-ink)]">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="ui-button-secondary min-h-9 px-3 text-xs disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * 12. 详情抽屉 AdminDrawer
 *     桌面端右侧滑出，移动端全屏。
 * ========================================================== */

export interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 桌面端宽度（px），默认 520 */
  width?: number;
  loading?: boolean;
}

export function AdminDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  loading = false,
}: AdminDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-[var(--ui-surface)] shadow-2xl lg:max-w-[520px]"
        style={{ maxWidth: typeof width === "number" ? `${width}px` : undefined }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--ui-line)] px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-black text-[var(--ui-ink)]">{title}</h3>
            {description ? (
              <p className="ui-muted mt-1 text-xs leading-5">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-full p-2 text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? <AdminLoadingState label="加载详情中…" /> : children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--ui-line)] bg-[var(--ui-surface-muted)]/40 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
 * 13. 详情字段行 AdminDetailRow
 * ========================================================== */

export function AdminDetailRow({
  label,
  children,
  mono = false,
}: {
  label: ReactNode;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-[var(--ui-line)] px-1 py-2 last:border-b-0">
      <span className="text-xs font-black text-[var(--ui-muted)]">{label}</span>
      <span
        className={`min-w-0 text-sm text-[var(--ui-ink)] ${
          mono ? "font-mono text-xs break-all" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
}

/* ============================================================
 * 14. 密码输入 AdminPasswordInput
 *     带可见性切换。
 * ========================================================== */

export function AdminPasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required = true,
  disabled = false,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={`${adminInputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        className="absolute right-2 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-full text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

/* ============================================================
 * 15. 已知限制条目 AdminKnownLimit
 * ========================================================== */

export function AdminKnownLimit({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--ui-radius-sm)] border border-[rgb(189_148_80/28%)] bg-[var(--ui-accent-soft)]/60 px-4 py-3">
      <p className="text-xs font-black text-[#7D5B24]">{title}</p>
      <div className="mt-1 text-xs leading-5 text-[var(--ui-ink)]">{children}</div>
    </div>
  );
}

/* ============================================================
 * 16. 按钮 AdminButton
 *     统一封装主/次/危险按钮，便于在表格操作列使用。
 * ========================================================== */

export function AdminButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  ...rest
}: {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-[var(--ui-radius-sm)] font-black transition disabled:opacity-50";
  const sizes = size === "sm" ? "min-h-9 px-3 text-xs" : "min-h-11 px-4 text-sm";
  const variants = {
    primary: "ui-button-primary",
    secondary: "ui-button-secondary",
    danger:
      "border border-[var(--ui-danger)] bg-[var(--ui-danger)] text-white hover:bg-[#9A1E14]",
    ghost: "ui-button-quiet",
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${sizes} ${variants[variant]} ${rest.className ?? ""}`}
    >
      {loading ? "处理中…" : children}
    </button>
  );
}
