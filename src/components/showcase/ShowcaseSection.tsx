"use client";

import type { ReactNode } from "react";
import StatusBadge, { type ShowcaseStatus } from "./StatusBadge";

export interface ShowcaseSectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  status?: ShowcaseStatus;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export default function ShowcaseSection({
  id,
  eyebrow,
  title,
  description,
  status,
  children,
  className = "",
  headerClassName = "",
}: ShowcaseSectionProps) {
  return (
    <section id={id} className={`scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-16 ${className}`}>
      <div className="ui-container">
        <div className={`mb-7 sm:mb-10 ${headerClassName}`}>
          {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-3">
            <div>
              <h2 className="ui-title text-3xl leading-tight sm:text-4xl">{title}</h2>
              {description && <p className="ui-muted mt-4 leading-7">{description}</p>}
            </div>
            {status && <StatusBadge status={status} />}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export interface ShowcaseCardProps {
  title: string;
  description?: string;
  status?: ShowcaseStatus;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ShowcaseCard({ title, description, status, icon, children, className = "" }: ShowcaseCardProps) {
  return (
    <div className={`ui-surface p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {icon && <div className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)]">{icon}</div>}
          <div>
            <h3 className="text-sm font-black">{title}</h3>
            {description && <p className="text-xs text-[var(--ui-muted)] mt-0.5">{description}</p>}
          </div>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      {children}
    </div>
  );
}

export interface ShowcaseStatProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  className?: string;
}

export function ShowcaseStat({ label, value, suffix, trend, trendLabel, className = "" }: ShowcaseStatProps) {
  return (
    <div className={`ui-surface p-5 ${className}`}>
      <p className="text-xs font-black text-[var(--ui-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}{suffix}</p>
      {trend && trendLabel && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${
          trend === "up" ? "text-[var(--ui-success)]" :
          trend === "down" ? "text-[var(--ui-danger)]" :
          "text-[var(--ui-muted)]"
        }`}>
          <span>{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}