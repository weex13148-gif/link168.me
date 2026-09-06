import type { CurrentError, CurrentLeadContact, CurrentLeadSource, CurrentResult } from "@/lib/current/contracts";

export interface CurrentLeadCreateRequest {
  source: Exclude<CurrentLeadSource, "enterprise">;
  originPageId: string;
  workspaceId: string;
  originPublicIdentity?: string;
  originMemberUserId?: string;
  originOfferingId?: string;
  contact: CurrentLeadContact;
  commercialIntent: string;
  conversationId?: string;
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

function parseContact(value: unknown): CurrentLeadContact {
  if (!value || typeof value !== "object") return {};
  const contact = value as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    wechat?: unknown;
    preferredChannel?: unknown;
  };

  const preferredChannel = trimString(contact.preferredChannel);

  return {
    name: trimString(contact.name),
    email: trimString(contact.email)?.toLowerCase(),
    phone: trimString(contact.phone),
    wechat: trimString(contact.wechat),
    preferredChannel:
      preferredChannel === "email" || preferredChannel === "phone" || preferredChannel === "wechat"
        ? preferredChannel
        : undefined,
  };
}

export function parseCurrentLeadCreateRequest(value: unknown): CurrentResult<CurrentLeadCreateRequest> {
  if (!value || typeof value !== "object") {
    return validationError("Lead request body must be a JSON object.");
  }

  const body = value as {
    source?: unknown;
    originPageId?: unknown;
    workspaceId?: unknown;
    originPublicIdentity?: unknown;
    originMemberUserId?: unknown;
    originOfferingId?: unknown;
    contact?: unknown;
    commercialIntent?: unknown;
    conversationId?: unknown;
    idempotencyKey?: unknown;
  };

  const clientRoutingFields = [
    "assignee",
    "assigneeIdentityId",
    "assigneeUserId",
    "candidate",
    "candidates",
    "owner",
    "ownerIdentityId",
    "ownerUserId",
    "routingContext",
  ];
  const suppliedRoutingField = clientRoutingFields.find((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  if (suppliedRoutingField) {
    return validationError("Lead routing is server-assigned; client routing fields are not accepted.", suppliedRoutingField);
  }

  const source = trimString(body.source);
  if (source !== "visitor_ai" && source !== "direct_form") {
    return validationError("Current leads API only accepts visitor_ai or direct_form sources.", "source");
  }

  const originPageId = trimString(body.originPageId);
  if (!originPageId) {
    return validationError("originPageId is required.", "originPageId");
  }

  const workspaceId = trimString(body.workspaceId);
  if (!workspaceId) {
    return validationError("workspaceId is required.", "workspaceId");
  }

  const commercialIntent = trimString(body.commercialIntent);
  if (!commercialIntent) {
    return validationError("Explicit commercialIntent is required to create a qualified lead.", "commercialIntent");
  }

  return {
    ok: true,
    value: {
      source,
      originPageId,
      workspaceId,
      originPublicIdentity: trimString(body.originPublicIdentity)?.toLowerCase(),
      originMemberUserId: trimString(body.originMemberUserId),
      originOfferingId: trimString(body.originOfferingId),
      contact: parseContact(body.contact),
      commercialIntent: commercialIntent.slice(0, 2000),
      conversationId: trimString(body.conversationId),
      idempotencyKey: trimString(body.idempotencyKey),
    },
  };
}
