export type BailianApplicationConfig = {
  appId: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  workspaceId?: string;
};

export type BailianApplicationUsage = {
  modelId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type BailianApplicationResult =
  | {
      ok: true;
      reply: string;
      sessionId: string;
      requestId: string;
      usage: BailianApplicationUsage | null;
    }
  | {
      ok: false;
      error: string;
      status: number;
      requestId?: string;
    };

type BailianApplicationResponse = {
  request_id?: string;
  output?: {
    text?: string;
    result?: string;
    message?: string;
    session_id?: string;
    sessionId?: string;
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  usage?: {
    models?: Array<{
      model_id?: string;
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    }>;
    model_id?: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function extractReply(payload: BailianApplicationResponse | null): string {
  const output = payload?.output;
  if (!output) return "";
  const candidates = [output.text, output.result, output.message, output.choices?.[0]?.message?.content];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function extractSessionId(payload: BailianApplicationResponse | null): string {
  const output = payload?.output;
  if (!output) return "";
  const sessionId = output.session_id ?? output.sessionId;
  return typeof sessionId === "string" ? sessionId : "";
}

function extractUsage(payload: BailianApplicationResponse | null): BailianApplicationUsage | null {
  const usage = payload?.usage;
  if (!usage) return null;

  const model = Array.isArray(usage.models) && usage.models.length > 0 ? usage.models[0] : null;
  if (model) {
    return {
      modelId: typeof model.model_id === "string" ? model.model_id : null,
      inputTokens: typeof model.input_tokens === "number" ? model.input_tokens : null,
      outputTokens: typeof model.output_tokens === "number" ? model.output_tokens : null,
      totalTokens: typeof model.total_tokens === "number" ? model.total_tokens : null,
    };
  }

  return {
    modelId: typeof usage.model_id === "string" ? usage.model_id : null,
    inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
    outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.message, obj.error && typeof obj.error === "object" ? (obj.error as { message?: unknown }).message : null];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return fallback;
}

export function isBailianApplicationConfigured(config: BailianApplicationConfig): boolean {
  return Boolean(config.appId) && Boolean(config.apiKey) && Boolean(config.baseUrl);
}

export async function callBailianApplication(
  config: BailianApplicationConfig,
  prompt: string,
  sessionId?: string,
): Promise<BailianApplicationResult> {
  if (!isBailianApplicationConfigured(config)) {
    return {
      ok: false,
      error: "百炼应用配置不完整：缺少 App ID / API Key / Base URL。",
      status: 400,
    };
  }

  const endpoint = `${normalizeBaseUrl(config.baseUrl)}/apps/${encodeURIComponent(config.appId)}/completion`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.workspaceId ? { "X-DashScope-WorkSpace": config.workspaceId } : {}),
      },
      body: JSON.stringify({
        input: {
          prompt,
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        parameters: {},
        debug: {},
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    const payload = (await response.json().catch(() => null)) as BailianApplicationResponse | null;
    if (!response.ok) {
      return {
        ok: false,
        error: extractErrorMessage(payload, `百炼应用接口请求失败（HTTP ${response.status}）。`),
        status: response.status,
        requestId: payload?.request_id,
      };
    }

    const reply = extractReply(payload);
    if (!reply) {
      return {
        ok: false,
        error: "百炼应用接口未返回有效内容。",
        status: 502,
        requestId: payload?.request_id,
      };
    }

    return {
      ok: true,
      reply,
      sessionId: extractSessionId(payload),
      requestId: payload?.request_id || "",
      usage: extractUsage(payload),
    };
  } catch (error) {
    clearTimeout(timer);
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `调用百炼应用接口失败：${message}`,
      status: message.toLowerCase().includes("aborted") ? 408 : 502,
    };
  }
}
