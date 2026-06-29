import { getConfig } from "@/lib/app-config";

export type ShowcaseHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProviderResult = {
  ok: boolean;
  text?: string;
  error?: string;
  status?: number;
};

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

function normalizeApplicationEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (!url.hostname || url.username || url.password || isBlockedHostname(url.hostname)) return "";
    if (!/\/apps\/[^/]+\/completion\/?$/i.test(url.pathname)) return "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function buildPrompt(message: string, history: ShowcaseHistoryMessage[]) {
  const recentHistory = history
    .slice(-8)
    .map((item) => `${item.role === "user" ? "用户" : "助手"}：${item.content.slice(0, 3000)}`)
    .join("\n\n");

  return [recentHistory, `用户：${message}`].filter(Boolean).join("\n\n").slice(0, 16_000);
}

export async function callShowcaseChatProvider(
  message: string,
  history: ShowcaseHistoryMessage[],
): Promise<ProviderResult> {
  const config = await getConfig();
  const endpoint = normalizeApplicationEndpoint(config.aiBaseUrl.trim());
  const apiKey = config.aiApiKey.trim();

  if (!endpoint || !apiKey) {
    return {
      ok: false,
      error: "聊天服务尚未完成配置。",
      status: 503,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: {
          prompt: buildPrompt(message, history),
        },
        parameters: {},
        debug: {},
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return {
        ok: false,
        error: `聊天服务暂时不可用（HTTP ${response.status}）。`,
        status: 502,
      };
    }

    const data = (await response.json()) as {
      output?: {
        text?: string;
      };
    };
    const text = data.output?.text?.trim();
    if (!text) {
      return {
        ok: false,
        error: "聊天服务没有返回有效内容。",
        status: 502,
      };
    }

    return {
      ok: true,
      text: text.slice(0, 30_000),
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: timedOut ? "聊天请求超时，请稍后重试。" : "聊天服务连接失败，请稍后重试。",
      status: 502,
    };
  } finally {
    clearTimeout(timeout);
  }
}
