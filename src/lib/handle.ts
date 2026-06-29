export const HANDLE_FORMAT_ERROR = "链接后缀只能使用小写英文、数字、短横线或下划线，长度 3-30 位";
export const HANDLE_RESERVED_ERROR = "该链接后缀不可使用，请换一个";

const PLACEHOLDER_PREFIX = "pending_";
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
  "reset-password",
  "verify-email",
  "help",
  "about",
  "settings",
  "me",
  "content-policy",
  "community-rules",
  "contact",
  "showcase",
  "enterprise-ai",
  "workbench",
  "go",
  "short",
  "pricing",
]);

const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

export function normalizeHandle(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function createPlaceholderHandle(userId: string) {
  const compactId = userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return `${PLACEHOLDER_PREFIX}${compactId || "newuser"}`;
}

export function isPlaceholderHandle(value: unknown) {
  const handle = normalizeHandle(value);
  return PLACEHOLDER_HANDLES.has(handle) || handle.startsWith(PLACEHOLDER_PREFIX);
}

export function validateHandle(value: unknown) {
  const handle = normalizeHandle(value);

  if (!HANDLE_PATTERN.test(handle)) {
    return { success: false as const, handle, error: HANDLE_FORMAT_ERROR };
  }

  if (RESERVED_HANDLES.has(handle) || isPlaceholderHandle(handle)) {
    return { success: false as const, handle, error: HANDLE_RESERVED_ERROR };
  }

  return { success: true as const, handle };
}
