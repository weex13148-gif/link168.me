import type { CurrentErrorCode, CurrentResult } from "@/lib/current/contracts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CurrentValidationIssue {
  field: string;
  message: string;
}

export function currentOk<T>(value: T): CurrentResult<T> {
  return { ok: true, value };
}

export function currentErr<T = never>(
  code: CurrentErrorCode,
  message: string,
  field?: string,
  retryable = false,
): CurrentResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      field,
      retryable,
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function ensureString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ensureOptionalString(value: unknown, maxLength: number): string | null {
  const normalized = ensureString(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function ensureBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function ensureUuid(value: string, field: string): CurrentResult<string> {
  if (!UUID_RE.test(value)) {
    return currentErr("VALIDATION_ERROR", `${field} 必须是合法 UUID。`, field);
  }

  return currentOk(value);
}

export function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

export function isoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function issuesToResult<T>(issues: readonly CurrentValidationIssue[]): CurrentResult<T> | null {
  if (issues.length === 0) {
    return null;
  }

  const firstIssue = issues[0];
  return currentErr("VALIDATION_ERROR", firstIssue.message, firstIssue.field);
}

export function normalizeComparableString(value: string): string {
  return value.trim().toLowerCase();
}
