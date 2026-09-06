import "server-only";

import type {
  CurrentError,
  CurrentPageRepository,
  CurrentProviderStatus,
  CurrentPublishedFacts,
  CurrentResult,
} from "@/lib/current/contracts";
import type { CurrentVisitorAiAuditHooks } from "@/lib/current/ai/audit";
import { noopCurrentVisitorAiAuditHooks } from "@/lib/current/ai/audit";
import type { CurrentVisitorAiChatRequest } from "@/lib/current/ai/request";
import type {
  CurrentVisitorAiProvider,
  CurrentVisitorAiProviderMessage,
} from "@/lib/current/ai/provider";

export interface CurrentVisitorAiResponse {
  pageId: string;
  factsVersionId: string;
  answer: string;
  provider: CurrentProviderStatus & {
    model?: string;
    attempts?: number;
  };
}

interface CurrentVisitorAiServiceDeps {
  pageRepository: CurrentPageRepository;
  provider: CurrentVisitorAiProvider;
  audit?: CurrentVisitorAiAuditHooks;
}

function currentError(code: CurrentError["code"], message: string, retryable = false): CurrentResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable,
    },
  };
}

function isBlockedFactKey(key: string): boolean {
  return /(draft|private|internal|secret|hidden|unpublished)/i.test(key);
}

function looksUnpublishedOffering(record: Record<string, unknown>): boolean {
  if (record.published === false || record.isPublished === false) return true;
  if (typeof record.status === "string" && record.status.toLowerCase() !== "published") return true;
  return false;
}

function sanitizeFactsValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFactsValue(item))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (looksUnpublishedOffering(record)) {
    return undefined;
  }

  const entries = Object.entries(record)
    .filter(([key]) => !isBlockedFactKey(key))
    .map(([key, nested]) => [key, sanitizeFactsValue(nested)] as const)
    .filter(([, nested]) => nested !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function buildFactsPrompt(facts: CurrentPublishedFacts): string {
  const safeFacts = sanitizeFactsValue({
    pageId: facts.pageId,
    workspaceId: facts.workspaceId,
    versionId: facts.versionId,
    publishedAt: facts.publishedAt,
    profile: facts.profile,
    sections: facts.sections,
    offerings: facts.offerings,
    publicContact: facts.publicContact,
    responsibleMembers: facts.responsibleMembers,
  });

  return [
    "You are Link168 Visitor AI.",
    "Answer only from the published facts below.",
    "Never use draft data, private fields, internal notes, unpublished offerings, or guessed information.",
    "If the answer is not present in published facts, say you cannot confirm it from the published page and suggest direct contact.",
    "",
    "[Published Facts]",
    JSON.stringify(safeFacts ?? {}, null, 2),
  ].join("\n");
}

function buildProviderMessages(
  request: CurrentVisitorAiChatRequest,
  facts: CurrentPublishedFacts,
): readonly CurrentVisitorAiProviderMessage[] {
  const history = request.history.map((message) => ({
    role: message.role,
    content: message.content,
  })) satisfies CurrentVisitorAiProviderMessage[];

  return [
    {
      role: "system",
      content: buildFactsPrompt(facts),
    },
    ...history,
    {
      role: "user",
      content: request.message,
    },
  ];
}

async function loadFacts(
  repository: CurrentPageRepository,
  request: CurrentVisitorAiChatRequest,
): Promise<CurrentResult<CurrentPublishedFacts>> {
  if (request.pageId) {
    return repository.readPublishedFacts(request.pageId);
  }

  if (request.publicIdentity && repository.readPublishedFactsByPublicIdentity) {
    return repository.readPublishedFactsByPublicIdentity(request.publicIdentity);
  }

  return currentError(
    "DEPENDENCY_UNAVAILABLE",
    "Current published-facts repository cannot resolve visitor requests by publicIdentity.",
  );
}

export function createCurrentVisitorAiService(deps: CurrentVisitorAiServiceDeps) {
  const audit = deps.audit ?? noopCurrentVisitorAiAuditHooks;

  return {
    async chat(request: CurrentVisitorAiChatRequest): Promise<CurrentResult<CurrentVisitorAiResponse>> {
      await audit.onRequestParsed?.(request);

      let factsResult: CurrentResult<CurrentPublishedFacts>;
      try {
        factsResult = await loadFacts(deps.pageRepository, request);
      } catch {
        factsResult = currentError("DEPENDENCY_UNAVAILABLE", "Current published-facts repository is unavailable.");
      }
      if (!factsResult.ok) {
        await audit.onFallbackIssued?.({
          request,
          providerStatus: deps.provider.getStatus(),
          reason: factsResult.error.message,
        });
        return factsResult;
      }

      const facts = factsResult.value;
      await audit.onPublishedFactsLoaded?.(facts);

      const providerStatus = deps.provider.getStatus();
      const providerRequest = {
        facts,
        messages: buildProviderMessages(request, facts),
      };

      await audit.onProviderAttempt?.({
        request,
        providerStatus,
        providerRequest,
      });

      const providerResult = await deps.provider.answer(providerRequest);
      if (!providerResult.ok) {
        await audit.onProviderFailure?.({
          request,
          providerStatus,
          code: providerResult.error.code,
          message: providerResult.error.message,
        });
        await audit.onFallbackIssued?.({
          request,
          providerStatus,
          reason: providerResult.error.message,
        });
        return providerResult;
      }

      await audit.onProviderSuccess?.({
        request,
        providerStatus,
        providerResponse: providerResult.value,
      });

      return {
        ok: true,
        value: {
          pageId: facts.pageId,
          factsVersionId: facts.versionId,
          answer: providerResult.value.answer,
          provider: {
            ...providerStatus,
            model: providerResult.value.model,
            attempts: providerResult.value.attemptCount,
          },
        },
      };
    },
  };
}
