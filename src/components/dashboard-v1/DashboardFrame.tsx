"use client";

import type { ReactNode } from "react";
import { Eye, FileText, Palette, Radio } from "lucide-react";
import type { CardEditorSection, SaveState } from "@/components/dashboard-v1/types";

const sections: Array<{
  key: CardEditorSection;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { key: "content", label: "内容与业务", description: "身份、业务和客户动作", icon: FileText },
  { key: "style", label: "样式", description: "主题和页面风格", icon: Palette },
  { key: "publish", label: "预览与发布", description: "公开、分享和二维码", icon: Radio },
];

function SaveStatus({ state, isPublic }: { state: SaveState; isPublic: boolean }) {
  const config = {
    saved: { label: isPublic ? "已保存 · 公开页已同步" : "已保存", className: "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" },
    dirty: { label: "未保存", className: "bg-[var(--ui-accent-soft)] text-[#8C612E]" },
    saving: { label: "保存中", className: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]" },
    error: { label: "保存失败", className: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]" },
  }[state];

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-black ${config.className}`}>
      {config.label}
    </span>
  );
}

export function DashboardFrame({
  activeSection,
  setActiveSection,
  saveState,
  isPublic,
  children,
  preview,
}: {
  activeSection: CardEditorSection;
  setActiveSection: (section: CardEditorSection) => void;
  saveState: SaveState;
  isPublic: boolean;
  children: ReactNode;
  preview: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <section className="ui-surface p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-[var(--ui-surface-muted)] p-1" aria-label="名片编辑步骤">
            {sections.map(({ key, label, description, icon: Icon }) => {
              const active = activeSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  aria-current={active ? "step" : undefined}
                  className={`min-w-0 rounded-xl px-2 py-2.5 text-left transition sm:px-3 ${
                    active ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-black sm:text-sm">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="mt-1 hidden text-[10px] leading-4 opacity-75 md:block">{description}</span>
                </button>
              );
            })}
          </nav>
          <SaveStatus state={saveState} isPublic={isPublic} />
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="min-w-0">{children}</section>
        <aside className={`${activeSection === "publish" ? "block" : "hidden"} min-w-0 xl:block`}>
          <div className="ui-surface sticky top-5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="size-4 text-[var(--ui-brand)]" />
              <div>
                <p className="text-sm font-black text-[var(--ui-ink)]">公开页预览</p>
                <p className="text-xs text-[var(--ui-muted)]">与访客实际页面使用同一渲染器</p>
              </div>
            </div>
            {preview}
          </div>
        </aside>
      </div>
    </div>
  );
}
