"use client";

import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "../i18n";
import type { Language } from "../i18n";

export const COOKIE_NAME = "link168_locale";

export function setLocale(locale: Language): void {
  if (!SUPPORTED_LANGUAGES.includes(locale)) return;
  
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
  localStorage.setItem("link168_locale", locale);
  
  const event = new CustomEvent("localeChange", { detail: { locale } });
  window.dispatchEvent(event);
}

export function getLocale(): Language {
  const cookieMatch = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (cookieMatch && SUPPORTED_LANGUAGES.includes(cookieMatch[1] as Language)) {
    return cookieMatch[1] as Language;
  }

  const stored = localStorage.getItem("link168_locale");
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    return stored as Language;
  }

  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }

  return DEFAULT_LANGUAGE as Language;
}

export function removeLocale(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  localStorage.removeItem("link168_locale");
}

export function subscribeToLocaleChange(callback: (locale: Language) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ locale: Language }>).detail;
    if (detail?.locale) {
      callback(detail.locale);
    }
  };
  
  window.addEventListener("localeChange", handler);
  
  return () => {
    window.removeEventListener("localeChange", handler);
  };
}
