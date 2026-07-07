"use client";

import { useState } from "react";
import { ChevronDown, Globe, X } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/hooks";
import type { Language } from "@/lib/i18n";

const languageLabels: Record<Language, string> = {
  zh: "中文",
  en: "English",
};

export function LanguageSelector() {
  const { lang, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleSelect(locale: Language) {
    setLocale(locale);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-9 items-center gap-2 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] px-3 text-xs font-black text-[var(--ui-muted)] transition hover:border-[var(--ui-brand)]/35"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="size-4" />
        <span>{languageLabels[lang]}</span>
        <ChevronDown className={`size-3 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-lg)]"
            role="listbox"
            aria-label="语言选择"
          >
            <div className="flex items-center justify-between border-b border-[var(--ui-line)] p-3">
              <span className="text-sm font-black text-[var(--ui-ink)]">语言</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-muted)]"
                aria-label="关闭"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="p-1">
              {SUPPORTED_LANGUAGES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => handleSelect(locale)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-black transition ${
                    lang === locale
                      ? "bg-[var(--ui-brand)] text-white"
                      : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-ink)]"
                  }`}
                  role="option"
                  aria-selected={lang === locale}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                      lang === locale
                        ? "bg-[var(--ui-surface-strong)]/20"
                        : "bg-[var(--ui-surface-muted)]"
                    }`}
                  >
                    {locale.toUpperCase()}
                  </span>
                  {languageLabels[locale]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
