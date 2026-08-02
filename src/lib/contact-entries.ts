import { sanitizePublicUrl } from "@/lib/public-url-security";

export const CONTACT_ENTRY_TYPE = "contact-entry";
export const CONTACT_CHANNELS = ["wechat", "wecom"] as const;

export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export type ContactEntryPayload = {
  version: 1;
  channel: ContactChannel;
  targetUrl: string;
};

export type ParsedContactEntry = ContactEntryPayload & {
  isTeam: boolean;
};

export function isContactChannel(value: unknown): value is ContactChannel {
  return typeof value === "string" && CONTACT_CHANNELS.includes(value as ContactChannel);
}

export function createContactEntryPayload(input: {
  channel: unknown;
  targetUrl: unknown;
}): { payload: ContactEntryPayload | null; error: string | null } {
  if (!isContactChannel(input.channel)) {
    return { payload: null, error: "请选择微信或企业微信。" };
  }

  const checked = sanitizePublicUrl(typeof input.targetUrl === "string" ? input.targetUrl : "");
  if (!checked.safe || !checked.url) {
    return { payload: null, error: "请填写安全的微信或企业微信添加链接。" };
  }

  return {
    payload: {
      version: 1,
      channel: input.channel,
      targetUrl: checked.url,
    },
    error: null,
  };
}

export function parseContactEntryPayload(
  raw: string | null | undefined,
  workspaceId?: string | null,
): ParsedContactEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = createContactEntryPayload({
      channel: parsed.channel,
      targetUrl: parsed.targetUrl,
    });
    return result.payload ? { ...result.payload, isTeam: Boolean(workspaceId) } : null;
  } catch {
    return null;
  }
}

export function contactChannelLabel(channel: ContactChannel): string {
  return channel === "wecom" ? "企业微信" : "微信";
}
