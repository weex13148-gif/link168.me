export { useTranslation } from "./hooks";

export {
  getLocaleFromRequest,
  setLocaleCookie,
  createLocaleCookieHeader,
  COOKIE_NAME as SERVER_COOKIE_NAME,
} from "./server";

export {
  setLocale,
  getLocale,
  removeLocale,
  subscribeToLocaleChange,
  COOKIE_NAME as CLIENT_COOKIE_NAME,
} from "./client";

export {
  translations,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getTranslation,
} from "../i18n";

export type { Language, TranslationKey, TranslationRecord } from "../i18n";