import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "../i18n";
import type { Language } from "../i18n";

export const COOKIE_NAME = "link168_locale";

export function getLocaleFromRequest(request: Request): Language {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match && SUPPORTED_LANGUAGES.includes(match[1] as Language)) {
      return match[1] as Language;
    }
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const languages = acceptLanguage.split(",");
    for (const lang of languages) {
      const normalized = lang.trim().toLowerCase().split(";")[0];
      if (normalized.startsWith("zh")) return "zh";
      if (normalized.startsWith("en")) return "en";
    }
  }

  return DEFAULT_LANGUAGE as Language;
}

export function setLocaleCookie(response: Response, locale: Language): Response {
  const cookieValue = `${COOKIE_NAME}=${locale}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`;
  
  const existingHeaders = response.headers.get("Set-Cookie");
  if (existingHeaders) {
    response.headers.set("Set-Cookie", `${existingHeaders}, ${cookieValue}`);
  } else {
    response.headers.set("Set-Cookie", cookieValue);
  }
  
  return response;
}

export function createLocaleCookieHeader(locale: Language): string {
  return `${COOKIE_NAME}=${locale}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}
