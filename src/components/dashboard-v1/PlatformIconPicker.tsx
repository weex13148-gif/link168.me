"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { searchPlatforms, getPlatformByKey, type PlatformDefinition } from "@/lib/link-icons";

export function PlatformIconPicker({
  value,
  onSelect,
  onClear,
  onAutoDetect,
  url,
}: {
  value: string | null | undefined;
  onSelect: (platformKey: string) => void;
  onClear: () => void;
  onAutoDetect: () => void;
  url?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const platforms = searchPlatforms(query);
  const selectedPlatform = value ? getPlatformByKey(value) : undefined;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((i) => (i < platforms.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((i) => (i > 0 ? i - 1 : platforms.length - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (platforms[focusedIndex]) {
          onSelect(platforms[focusedIndex].key);
          setIsOpen(false);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white p-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedPlatform ? (
          <>
            <span className="grid size-9 place-items-center overflow-hidden rounded-lg">
              <img src={selectedPlatform.iconPath} alt={selectedPlatform.name} className="size-full object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block font-black">{selectedPlatform.name}</span>
              <span className="text-xs ui-muted">已选择平台图标</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="grid size-8 place-items-center rounded-lg bg-[var(--ui-surface-muted)] text-[var(--ui-muted)] transition hover:bg-[var(--ui-danger-soft)] hover:text-[var(--ui-danger)]" aria-label="清除选择">
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--ui-surface-muted)]">
              <Search className="size-4 text-[var(--ui-muted)]" />
            </span>
            <span className="flex-1 text-sm ui-muted">搜索或选择平台</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onAutoDetect(); }} disabled={!url} className="grid size-8 place-items-center rounded-lg bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] transition hover:bg-[var(--ui-brand-soft-hover)] disabled:opacity-50" aria-label="自动识别">
              <RefreshCw className="size-4" />
            </button>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-hidden rounded-xl border border-[var(--ui-line)] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[var(--ui-line)] px-3 py-2">
            <Search className="size-4 text-[var(--ui-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索平台名称..."
              className="flex-1 border-none bg-transparent outline-none text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-[var(--ui-muted)]" aria-label="清除搜索">
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {platforms.length === 0 ? (
              <div className="grid place-items-center py-8 text-sm ui-muted">
                <Search className="mx-auto mb-2 size-8 opacity-50" />
                <span>未找到匹配的平台</span>
                <span className="text-xs">尝试其他关键词或使用默认图标</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {platforms.map((platform, index) => (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => {
                      onSelect(platform.key);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 transition ${
                      focusedIndex === index ? "bg-[var(--ui-brand-soft)]" : "hover:bg-[var(--ui-surface-muted)]"
                    }`}
                    aria-selected={platform.key === value}
                    role="option"
                  >
                    <span className="grid size-10 place-items-center overflow-hidden rounded-lg">
                      <img src={platform.iconPath} alt={platform.name} className="size-full object-contain" />
                    </span>
                    <span className="text-xs font-black text-center leading-tight">{platform.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--ui-line)] p-2">
            <button type="button" onClick={() => { onAutoDetect(); setIsOpen(false); }} disabled={!url} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ui-brand-soft)] py-2 text-sm font-black text-[var(--ui-brand)] transition hover:bg-[var(--ui-brand-soft-hover)] disabled:opacity-50">
              <RefreshCw className="size-4" />
              {url ? `根据网址自动识别` : `请先填写网址`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}