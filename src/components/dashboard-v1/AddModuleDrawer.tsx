"use client";

import { useEffect } from "react";
import {
  Link,
  FileText,
  Hash,
  QrCode,
  MessageCircle,
  Phone,
  ShoppingBag,
  Calendar,
  MapPin,
  X,
  Copy,
  Minus,
  Image,
  Maximize2,
  Images,
  Play,
  Video,
  Music,
  Music2,
  Bot,
  Package,
  ConciergeBell,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { listModulesByCategory } from "@/features/profile-modules";
import type { ProfileModuleType, ProfileModuleCategory } from "@/features/profile-modules";

const ICON_MAP: Record<string, LucideIcon> = {
  Link,
  FileText,
  Hash,
  QrCode,
  MessageCircle,
  Phone,
  ShoppingBag,
  Calendar,
  MapPin,
  Copy,
  Minus,
  Image,
  Maximize2,
  Images,
  Play,
  Video,
  Music,
  Music2,
  Bot,
  Package,
  ConciergeBell,
  Gift,
};

// 组件分类中文化：基础信息 / 联系方式 / 图文内容 / 产品与服务 / 图片 / 视频 / 音乐 / AI 互动 / 其他
const CATEGORY_LABELS: Record<ProfileModuleCategory, string> = {
  basic: "基础信息",
  contact: "联系方式",
  content: "图文内容",
  commerce: "产品与服务",
  image: "图片",
  video: "视频",
  audio: "音乐",
  ai: "AI 互动",
  other: "其他",
};

const CATEGORY_ORDER: ProfileModuleCategory[] = [
  "basic",
  "contact",
  "content",
  "commerce",
  "image",
  "video",
  "audio",
  "ai",
  "other",
];

// 按分类映射到「基础信息 / 联系方式 / 图文内容 / 产品与服务 / 图片 / 视频 / 音乐 / AI 互动 / 其他」的中文小标题
function categoryShortLabel(category: ProfileModuleCategory): string {
  return CATEGORY_LABELS[category] || "其他";
}

type AddModuleDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProfileModuleType) => void;
  onUpgrade: () => void;
};

export function AddModuleDrawer({ open, onClose, onSelect, onUpgrade }: AddModuleDrawerProps) {
  const modulesByCategory = listModulesByCategory();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col animate-slide-up rounded-t-2xl bg-[var(--ui-surface)] shadow-[var(--ui-shadow-lg)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">添加内容</h2>
            <p className="mt-0.5 truncate text-xs text-[var(--ui-muted)]">按分类选择要添加的模块</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)]"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="phone-preview-scroll flex-1 overflow-y-auto p-4 sm:p-5">
          {CATEGORY_ORDER.map((category) => {
            const modules = modulesByCategory[category];
            if (!modules || modules.length === 0) return null;
            return (
              <div key={category} className="mb-5 last:mb-0">
                <p className="mb-3 text-xs font-black text-[var(--ui-muted)]">
                  {categoryShortLabel(category)}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  {modules.map((mod) => {
                    const Icon = ICON_MAP[mod.iconName];
                    const isLocked = !mod.free;
                    return (
                      <button
                        key={mod.type}
                        type="button"
                        onClick={() => {
                          if (mod.free) {
                            onSelect(mod.type);
                          } else {
                            onUpgrade();
                          }
                        }}
                        className="group relative flex min-h-[88px] flex-col items-start justify-start gap-1.5 overflow-hidden rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-3 text-left transition-colors hover:border-[var(--ui-brand)] hover:bg-[var(--ui-brand-soft)] sm:min-h-[100px] sm:p-4 sm:items-center sm:text-center"
                      >
                        {isLocked && (
                          <span className="absolute right-1.5 top-1.5 rounded-md bg-[var(--ui-accent)] px-1.5 py-0.5 text-[9px] font-black leading-none text-white sm:text-[10px]">
                            会员
                          </span>
                        )}
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)] transition-colors group-hover:bg-[var(--ui-brand)] group-hover:text-white sm:size-10">
                          {Icon ? <Icon className="size-4 sm:size-5" /> : null}
                        </span>
                        <span className="text-[13px] font-black leading-tight sm:text-sm sm:leading-tight">
                          {mod.label}
                        </span>
                        <span className="text-[10px] leading-3 text-[var(--ui-muted)] line-clamp-2 sm:text-[11px] sm:leading-4">
                          {mod.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {CATEGORY_ORDER.every((category) => !modulesByCategory[category] || modulesByCategory[category].length === 0) ? (
            <div className="rounded-xl border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-8 text-center text-sm text-[var(--ui-muted)]">
              暂无可添加的组件，请稍后再试。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
