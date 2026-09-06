import type { CurrentProviderStatus, CurrentPublishedFacts } from "@/lib/current/contracts";
import type { CurrentVisitorAiChatRequest } from "@/lib/current/ai/request";
import type { CurrentVisitorAiProviderRequest, CurrentVisitorAiProviderResponse } from "@/lib/current/ai/provider";

export interface CurrentVisitorAiAuditHooks {
  onRequestParsed?(request: CurrentVisitorAiChatRequest): Promise<void> | void;
  onPublishedFactsLoaded?(facts: CurrentPublishedFacts): Promise<void> | void;
  onProviderAttempt?(input: {
    request: CurrentVisitorAiChatRequest;
    providerStatus: CurrentProviderStatus;
    providerRequest: CurrentVisitorAiProviderRequest;
  }): Promise<void> | void;
  onProviderSuccess?(input: {
    request: CurrentVisitorAiChatRequest;
    providerStatus: CurrentProviderStatus;
    providerResponse: CurrentVisitorAiProviderResponse;
  }): Promise<void> | void;
  onProviderFailure?(input: {
    request: CurrentVisitorAiChatRequest;
    providerStatus: CurrentProviderStatus;
    code: string;
    message: string;
  }): Promise<void> | void;
  onFallbackIssued?(input: {
    request: CurrentVisitorAiChatRequest;
    providerStatus: CurrentProviderStatus;
    reason: string;
  }): Promise<void> | void;
}

export const noopCurrentVisitorAiAuditHooks: CurrentVisitorAiAuditHooks = {};
