import type { CurrentErrorCode } from "@/lib/current/contracts";

const CURRENT_ERROR_HTTP_STATUS: Record<CurrentErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 409,
  IDEMPOTENCY_ERROR: 503,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  DEPENDENCY_UNAVAILABLE: 503,
  TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

export function currentErrorHttpStatus(code: CurrentErrorCode) {
  return CURRENT_ERROR_HTTP_STATUS[code];
}
