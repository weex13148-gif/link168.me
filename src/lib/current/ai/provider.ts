import "server-only";

import type {
  CurrentError,
  CurrentProviderStatus,
  CurrentPublishedFacts,
  CurrentResult,
} from "@/lib/current/contracts";

export interface CurrentVisitorAiProviderConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxTokens: number;
  retryMax: number;
  retryBackoffMs: number;
}

export interface CurrentVisitorAiProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CurrentVisitorAiProviderRequest {
  facts: CurrentPublishedFacts;
  messages: readonly CurrentVisitorAiProviderMessage[];
}

export interface CurrentVisitorAiProviderResponse {
  answer: string;
  provider: string;
  model: string;
  attemptCount: number;
}

export interface CurrentVisitorAiProvider {
  getStatus(): CurrentProviderStatus;
  answer(request: CurrentVisitorAiProviderRequest): Promise<CurrentResult<CurrentVisitorAiProviderResponse>>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_TOKENS = 600;
const DEFAULT_RETRY_MAX = 1;
const DEFAULT_RETRY_BACKOFF_MS = 250;

function currentError(
  code: CurrentError["code"],
  message: string,
  retryable = false,
): CurrentResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable,
    },
  };
}

function readPositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseProviderConfig(env: NodeJS.ProcessEnv): CurrentResult<CurrentVisitorAiProviderConfig> {
  const provider = env.CURRENT_VISITOR_AI_PROVIDER?.trim() || "openai-compatible";
  const baseUrl = env.CURRENT_VISITOR_AI_BASE_URL?.trim();
  const model = env.CURRENT_VISITOR_AI_MODEL?.trim();
  const apiKey = env.CURRENT_VISITOR_AI_API_KEY?.trim();

  if (!apiKey) {
    return currentError("PROVIDER_UNAVAILABLE", "Visitor AI provider unavailable: CURRENT_VISITOR_AI_API_KEY is not configured.");
  }

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    return currentError("PROVIDER_UNAVAILABLE", "Visitor AI provider unavailable: CURRENT_VISITOR_AI_BASE_URL is missing or invalid.");
  }

  if (!model) {
    return currentError("PROVIDER_UNAVAILABLE", "Visitor AI provider unavailable: CURRENT_VISITOR_AI_MODEL is not configured.");
  }

  return {
    ok: true,
    value: {
      provider,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      model,
      apiKey,
      timeoutMs: readPositiveInteger(env.CURRENT_VISITOR_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
      maxTokens: readPositiveInteger(env.CURRENT_VISITOR_AI_MAX_TOKENS, DEFAULT_MAX_TOKENS),
      retryMax: readPositiveInteger(env.CURRENT_VISITOR_AI_RETRY_MAX, DEFAULT_RETRY_MAX),
      retryBackoffMs: readPositiveInteger(env.CURRENT_VISITOR_AI_RETRY_BACKOFF_MS, DEFAULT_RETRY_BACKOFF_MS),
    },
  };
}

function statusFromConfig(result: CurrentResult<CurrentVisitorAiProviderConfig>): CurrentProviderStatus {
  if (result.ok) {
    return {
      provider: result.value.provider,
      state: "configured",
    };
  }

  return {
    provider: "visitor_ai",
    state: "missing",
    reason: result.error.message,
  };
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProviderMessages(messages: readonly CurrentVisitorAiProviderMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function extractProviderText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = record.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  return trimmed ? trimmed : null;
}

export function createEnvCurrentVisitorAiProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): CurrentVisitorAiProvider {
  const configResult = parseProviderConfig(env);

  return {
    getStatus() {
      return statusFromConfig(configResult);
    },

    async answer(request) {
      if (!configResult.ok) {
        return configResult;
      }

      const config = configResult.value;
      const endpoint = `${config.baseUrl}/chat/completions`;
      let attempt = 0;
      const maxAttempts = config.retryMax + 1;

      while (attempt < maxAttempts) {
        attempt += 1;
        const abortController = new AbortController();
        const timer = setTimeout(() => abortController.abort(), config.timeoutMs);

        try {
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: buildProviderMessages(request.messages),
              temperature: 0.2,
              max_tokens: config.maxTokens,
              stream: false,
            }),
            signal: abortController.signal,
            cache: "no-store",
          });

          clearTimeout(timer);

          if (!response.ok) {
            const errorText = (await response.text().catch(() => "")).slice(0, 200);
            if (attempt < maxAttempts && shouldRetry(response.status)) {
              await sleep(config.retryBackoffMs * attempt);
              continue;
            }

            if (response.status === 408) {
              return currentError("TIMEOUT", `Visitor AI provider timed out after ${attempt} attempt(s).`, true);
            }

            return currentError(
              "PROVIDER_UNAVAILABLE",
              `Visitor AI provider unavailable (${response.status})${errorText ? `: ${errorText}` : "."}`,
              shouldRetry(response.status),
            );
          }

          const payload = await response.json().catch(() => null);
          const answer = extractProviderText(payload);
          if (!answer) {
            return currentError("PROVIDER_UNAVAILABLE", "Visitor AI provider returned no usable answer.");
          }

          return {
            ok: true,
            value: {
              answer,
              provider: config.provider,
              model: config.model,
              attemptCount: attempt,
            },
          };
        } catch (error) {
          clearTimeout(timer);
          const aborted = error instanceof Error && error.name === "AbortError";
          if (attempt < maxAttempts) {
            await sleep(config.retryBackoffMs * attempt);
            continue;
          }

          return currentError(
            aborted ? "TIMEOUT" : "PROVIDER_UNAVAILABLE",
            aborted
              ? `Visitor AI provider timed out after ${attempt} attempt(s).`
              : `Visitor AI provider unavailable: ${error instanceof Error ? error.message : String(error)}`,
            true,
          );
        }
      }

      return currentError("PROVIDER_UNAVAILABLE", "Visitor AI provider unavailable after retry exhaustion.", true);
    },
  };
}
