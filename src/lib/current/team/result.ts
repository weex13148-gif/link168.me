import type { CurrentErrorCode, CurrentResult } from "@/lib/current/contracts";

export function currentOk<T>(value: T): CurrentResult<T> {
  return { ok: true, value };
}

export function currentErr<T = never>(
  code: CurrentErrorCode,
  message: string,
  options: {
    field?: string;
    retryable?: boolean;
  } = {},
): CurrentResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      field: options.field,
      retryable: options.retryable,
    },
  };
}

export function currentFromUnknown<T = never>(
  error: unknown,
  fallbackMessage: string,
  retryable = false,
): CurrentResult<T> {
  if (error instanceof Error) {
    return currentErr("INTERNAL_ERROR", error.message || fallbackMessage, { retryable });
  }
  return currentErr("INTERNAL_ERROR", fallbackMessage, { retryable });
}
