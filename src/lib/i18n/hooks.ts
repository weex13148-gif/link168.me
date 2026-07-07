"use client";

import { useState, useEffect, useCallback } from "react";
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "../i18n";
import type { Language, TranslationKey, TranslationRecord } from "../i18n";

function detectBrowserLanguage(): Language {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }
  return DEFAULT_LANGUAGE as Language;
}

function getStoredLocale(): Language | null {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("link168_locale");
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  }
  return null;
}

function getCookieLocale(): Language | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/link168_locale=([^;]+)/);
    if (match && SUPPORTED_LANGUAGES.includes(match[1] as Language)) {
      return match[1] as Language;
    }
  }
  return null;
}

export function useTranslation(initialLocale?: Language) {
  const [lang, setLang] = useState<Language>(() => {
    if (initialLocale && SUPPORTED_LANGUAGES.includes(initialLocale)) {
      return initialLocale;
    }
    return getCookieLocale() || getStoredLocale() || detectBrowserLanguage();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const cookieLocale = getCookieLocale();
      if (cookieLocale && cookieLocale !== lang) {
        setLang(cookieLocale);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  const t = useCallback((key: TranslationKey): string => {
    const translation = translations[lang];
    return translation[key] || key;
  }, [lang]);

  const setLocale = useCallback((locale: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(locale)) return;
    setLang(locale);
    if (typeof document !== "undefined") {
      document.cookie = `link168_locale=${locale}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("link168_locale", locale);
    }
  }, []);

  const translation: TranslationRecord = translations[lang];

  return { t, lang, setLocale, translation };
}
