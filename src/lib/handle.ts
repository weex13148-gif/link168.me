export const HANDLE_FORMAT_ERROR = "链接后缀只能使用小写英文、数字、短横线或下划线，长度 3-30 位";
export const HANDLE_RESERVED_ERROR = "该链接后缀不可使用，请换一个";
export const PLACEHOLDER_HANDLES = new Set(["", "yourname", "null", "undefined"]);

export const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "report",
  "reports",
  "terms",
  "privacy",
  "forgot-password",
  "help",
  "about",
  "settings",
  "me",
  "content-policy",
  "community-rules",
  "contact",
]);

const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

export function normalizeHandle(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isPlaceholderHandle(value: unknown) {
  return PLACEHOLDER_HANDLES.has(normalizeHandle(value));
}

export function validateHandle(value: unknown) {
  const handle = normalizeHandle(value);

  if (!HANDLE_PATTERN.test(handle)) {
    return { success: false as const, handle, error: HANDLE_FORMAT_ERROR };
  }

  if (RESERVED_HANDLES.has(handle)) {
    return { success: false as const, handle, error: HANDLE_RESERVED_ERROR };
  }

  return { success: true as const, handle };
}
