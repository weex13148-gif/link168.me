import type { CurrentError, CurrentResult } from "@/lib/current/contracts";

export interface CurrentVisitorAiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CurrentVisitorAiChatRequest {
  pageId?: string;
  publicIdentity?: string;
  message: string;
  history: readonly CurrentVisitorAiChatMessage[];
  visitorSessionId?: string;
  idempotencyKey?: string;
}

function validationError(message: string, field?: string): CurrentResult<never> {
  const error: CurrentError = {
    code: "VALIDATION_ERROR",
    message,
    field,
  };

  return { ok: false, error };
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHistory(value: unknown): readonly CurrentVisitorAiChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { role?: unknown; content?: unknown };
      if ((candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string") {
        const content = candidate.content.trim();
        if (!content) return null;
        return {
          role: candidate.role,
          content: content.slice(0, 4000),
        } satisfies CurrentVisitorAiChatMessage;
      }

      return null;
    })
    .filter((item): item is CurrentVisitorAiChatMessage => item !== null)
    .slice(-12);
}

export function parseCurrentVisitorAiChatRequest(value: unknown): CurrentResult<CurrentVisitorAiChatRequest> {
  if (!value || typeof value !== "object") {
    return validationError("Visitor AI request body must be a JSON object.");
  }

  const body = value as {
    pageId?: unknown;
    publicIdentity?: unknown;
    message?: unknown;
    history?: unknown;
    visitorSessionId?: unknown;
    idempotencyKey?: unknown;
  };

  const pageId = trimString(body.pageId);
  const publicIdentity = trimString(body.publicIdentity)?.toLowerCase();
  const message = trimString(body.message);

  if (!pageId && !publicIdentity) {
    return validationError("Either pageId or publicIdentity is required.", "pageId");
  }

  if (!message) {
    return validationError("Visitor AI message is required.", "message");
  }

  if (message.length > 4000) {
    return validationError("Visitor AI message must be 4000 characters or fewer.", "message");
  }

  return {
    ok: true,
    value: {
      pageId,
      publicIdentity,
      message,
      history: normalizeHistory(body.history),
      visitorSessionId: trimString(body.visitorSessionId),
      idempotencyKey: trimString(body.idempotencyKey),
    },
  };
}
