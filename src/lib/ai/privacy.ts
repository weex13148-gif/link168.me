export type AiChatPrivacyNotice = {
  noticeText: string;
  collectLead: boolean;
  allowReport: boolean;
  allowTransferToHuman: boolean;
};

const DEFAULT_NOTICE_TEXT =
  "为了更好地为您服务，对话内容可能会被记录用于服务改进。我们将严格保护您的隐私信息，未经您的许可不会向第三方泄露。";

export function getDefaultAiPrivacyNotice(): AiChatPrivacyNotice {
  return {
    noticeText: DEFAULT_NOTICE_TEXT,
    collectLead: true,
    allowReport: true,
    allowTransferToHuman: true,
  };
}

export function buildPrivacyNoticeFromConfig(config: {
  collectLead?: boolean;
  allowReport?: boolean;
  allowTransferToHuman?: boolean;
  privacyNoticeText?: string | null;
}): AiChatPrivacyNotice {
  const defaults = getDefaultAiPrivacyNotice();
  return {
    noticeText: config.privacyNoticeText?.trim() || defaults.noticeText,
    collectLead: config.collectLead ?? defaults.collectLead,
    allowReport: config.allowReport ?? defaults.allowReport,
    allowTransferToHuman: config.allowTransferToHuman ?? defaults.allowTransferToHuman,
  };
}
