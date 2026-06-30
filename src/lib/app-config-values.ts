// Client-safe configuration values — no server-only imports
// This file can be imported in both Server and Client Components

export const AI_ASSISTANTS = {
  tax: "财税 AI Agent",
  legal: "法务 AI Agent",
  market: "市场调研 AI Agent",
  design: "设计 AI Agent",
  social: "社媒运营 AI Agent",
} as const;

export type AiAssistantKey = keyof typeof AI_ASSISTANTS;

export type AiProvider =
  | "openai"
  | "deepseek"
  | "qwen"
  | "bailian"
  | "doubao"
  | "zhipu"
  | "openai-compatible";

export type StorageProvider = "local" | "aliyun-oss" | "tencent-cos";

export type SmtpSecureMode = "ssl" | "tls" | "none";

export type AppConfigValues = {
  aiEnabled: boolean;
  aiProvider: AiProvider;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiBailianAppId: string;
  aiBailianBaseUrl: string;
  aiBailianWorkspaceId: string;
  aiDailyLimitTotal: number;
  aiDailyLimitPerUser: number;
  aiTesterEmails: string[];
  aiRequestTimeout: number; // 请求超时（秒），默认45
  aiMaxOutputTokens: number; // 最大输出Token，默认1500
  aiTemperature: number; // 温度参数，默认0.3
  aiPublicEnabled: boolean; // 公众调用开关，默认false
  aiAssistantTaxEnabled: boolean;
  aiAssistantLegalEnabled: boolean;
  aiAssistantMarketEnabled: boolean;
  aiAssistantDesignEnabled: boolean;
  aiAssistantSocialEnabled: boolean;

  mailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  mailFrom: string;
  smtpSecureMode: SmtpSecureMode;
  mailAppUrl: string;

  paymentEnabled: boolean;
  paymentWechatEnabled: boolean;
  paymentAlipayEnabled: boolean;
  paymentMerchantId: string;
  paymentAppId: string;
  paymentApiKey: string;
  paymentAlipayAppId: string;
  paymentAlipayAppPrivateKey: string;
  paymentAlipayPublicKey: string;
  paymentAlipaySellerId: string;
  paymentCertPath: string;
  paymentNotifyUrl: string;
  paymentAlipayNotifyUrl: string;
  paymentTestMode: boolean;

  storageEnabled: boolean;
  storageProvider: StorageProvider;
  storageEndpoint: string;
  storageBucket: string;
  storageRegion: string;
  storageAccessKeyId: string;
  storageAccessKeySecret: string;
  storageUploadPrefix: string;

  smsEnabled: boolean;
  smsProvider: string;
  smsAccessKeyId: string;
  smsAccessKeySecret: string;
  smsSignName: string;
  smsTemplateId: string;

  mapApiKey: string;
  analyticsEnabled: boolean;
  analyticsProvider: string;
  analyticsKey: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  customApiConfig: string;
};

type ConfigValueType = "boolean" | "string" | "number" | "json";
type AppConfigKey = keyof AppConfigValues;
type ConfigDef<K extends AppConfigKey = AppConfigKey> = {
  key: K;
  dbKey: string;
  legacyKeys?: string[];
  type: ConfigValueType;
  sensitive?: boolean;
};

export const DEFAULT_CONFIG: AppConfigValues = {
  aiEnabled: false,
  aiProvider: "openai-compatible",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiApiKey: "",
  aiBailianAppId: "",
  aiBailianBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
  aiBailianWorkspaceId: "",
  aiDailyLimitTotal: 500,
  aiDailyLimitPerUser: 50,
  aiTesterEmails: [],
  aiAssistantTaxEnabled: false,
  aiAssistantLegalEnabled: false,
  aiAssistantMarketEnabled: false,
  aiAssistantDesignEnabled: false,
  aiAssistantSocialEnabled: false,
  aiRequestTimeout: 45,
  aiMaxOutputTokens: 1500,
  aiTemperature: 0.3,
  aiPublicEnabled: false,

  mailEnabled: false,
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  mailFrom: "",
  smtpSecureMode: "ssl",
  mailAppUrl: "",

  paymentEnabled: false,
  paymentWechatEnabled: false,
  paymentAlipayEnabled: false,
  paymentMerchantId: "",
  paymentAppId: "",
  paymentApiKey: "",
  paymentAlipayAppId: "",
  paymentAlipayAppPrivateKey: "",
  paymentAlipayPublicKey: "",
  paymentAlipaySellerId: "",
  paymentCertPath: "",
  paymentNotifyUrl: "",
  paymentAlipayNotifyUrl: "",
  paymentTestMode: true,

  storageEnabled: false,
  storageProvider: "local",
  storageEndpoint: "",
  storageBucket: "",
  storageRegion: "",
  storageAccessKeyId: "",
  storageAccessKeySecret: "",
  storageUploadPrefix: "uploads",

  smsEnabled: false,
  smsProvider: "",
  smsAccessKeyId: "",
  smsAccessKeySecret: "",
  smsSignName: "",
  smsTemplateId: "",

  mapApiKey: "",
  analyticsEnabled: false,
  analyticsProvider: "",
  analyticsKey: "",
  webhookEnabled: false,
  webhookUrl: "",
  customApiConfig: "",
};

const CONFIG_DEFS: ConfigDef[] = [
  { key: "aiEnabled", dbKey: "ai.enabled", legacyKeys: ["aiEnabled"], type: "boolean" },
  { key: "aiProvider", dbKey: "ai.provider", type: "string" },
  { key: "aiBaseUrl", dbKey: "ai.baseUrl", legacyKeys: ["aiBaseUrl"], type: "string" },
  { key: "aiModel", dbKey: "ai.model", legacyKeys: ["aiModel"], type: "string" },
  { key: "aiApiKey", dbKey: "ai.apiKey", legacyKeys: ["aiApiKey"], type: "string", sensitive: true },
  { key: "aiBailianAppId", dbKey: "ai.bailianAppId", type: "string" },
  { key: "aiBailianBaseUrl", dbKey: "ai.bailianBaseUrl", type: "string" },
  { key: "aiBailianWorkspaceId", dbKey: "ai.bailianWorkspaceId", type: "string" },
  { key: "aiDailyLimitTotal", dbKey: "ai.dailyLimit", type: "number" },
  { key: "aiDailyLimitPerUser", dbKey: "ai.userDailyLimit", legacyKeys: ["aiDailyLimitPerUser"], type: "number" },
  { key: "aiTesterEmails", dbKey: "ai.testWhitelist", legacyKeys: ["aiTesterEmails"], type: "json" },
  { key: "aiAssistantTaxEnabled", dbKey: "ai.assistant.tax.enabled", type: "boolean" },
  { key: "aiAssistantLegalEnabled", dbKey: "ai.assistant.legal.enabled", type: "boolean" },
  { key: "aiAssistantMarketEnabled", dbKey: "ai.assistant.market.enabled", type: "boolean" },
  { key: "aiAssistantDesignEnabled", dbKey: "ai.assistant.design.enabled", type: "boolean" },
  { key: "aiAssistantSocialEnabled", dbKey: "ai.assistant.social.enabled", type: "boolean" },
  { key: "aiRequestTimeout", dbKey: "ai.requestTimeout", type: "number" },
  { key: "aiMaxOutputTokens", dbKey: "ai.maxOutputTokens", type: "number" },
  { key: "aiTemperature", dbKey: "ai.temperature", type: "number" },
  { key: "aiPublicEnabled", dbKey: "ai.publicEnabled", type: "boolean" },

  { key: "mailEnabled", dbKey: "mail.enabled", legacyKeys: ["emailEnabled"], type: "boolean" },
  { key: "smtpHost", dbKey: "mail.smtpHost", type: "string" },
  { key: "smtpPort", dbKey: "mail.smtpPort", type: "number" },
  { key: "smtpUser", dbKey: "mail.smtpUser", type: "string" },
  { key: "smtpPassword", dbKey: "mail.smtpPassword", type: "string", sensitive: true },
  { key: "mailFrom", dbKey: "mail.from", type: "string" },
  { key: "smtpSecureMode", dbKey: "mail.secure", type: "string" },
  { key: "mailAppUrl", dbKey: "mail.appUrl", type: "string" },

  { key: "paymentEnabled", dbKey: "payment.enabled", legacyKeys: ["paymentEnabled"], type: "boolean" },
  { key: "paymentWechatEnabled", dbKey: "payment.wechat.enabled", type: "boolean" },
  { key: "paymentAlipayEnabled", dbKey: "payment.alipay.enabled", type: "boolean" },
  { key: "paymentMerchantId", dbKey: "payment.merchantId", type: "string", sensitive: true },
  { key: "paymentAppId", dbKey: "payment.appId", type: "string" },
  { key: "paymentApiKey", dbKey: "payment.apiKey", type: "string", sensitive: true },
  { key: "paymentAlipayAppId", dbKey: "payment.alipay.appId", legacyKeys: ["payment.appId"], type: "string" },
  { key: "paymentAlipayAppPrivateKey", dbKey: "payment.alipay.appPrivateKey", type: "string", sensitive: true },
  { key: "paymentAlipayPublicKey", dbKey: "payment.alipay.publicKey", type: "string", sensitive: true },
  { key: "paymentAlipaySellerId", dbKey: "payment.alipay.sellerId", type: "string", sensitive: true },
  { key: "paymentCertPath", dbKey: "payment.certPath", type: "string" },
  { key: "paymentNotifyUrl", dbKey: "payment.notifyUrl", type: "string" },
  { key: "paymentAlipayNotifyUrl", dbKey: "payment.alipay.notifyUrl", legacyKeys: ["payment.notifyUrl"], type: "string" },
  { key: "paymentTestMode", dbKey: "payment.testMode", type: "boolean" },

  { key: "storageEnabled", dbKey: "storage.enabled", type: "boolean" },
  { key: "storageProvider", dbKey: "storage.provider", legacyKeys: ["storageProvider"], type: "string" },
  { key: "storageEndpoint", dbKey: "storage.endpoint", type: "string" },
  { key: "storageBucket", dbKey: "storage.bucket", type: "string" },
  { key: "storageRegion", dbKey: "storage.region", type: "string" },
  { key: "storageAccessKeyId", dbKey: "storage.accessKeyId", type: "string", sensitive: true },
  { key: "storageAccessKeySecret", dbKey: "storage.accessKeySecret", type: "string", sensitive: true },
  { key: "storageUploadPrefix", dbKey: "storage.uploadPrefix", type: "string" },

  { key: "smsEnabled", dbKey: "sms.enabled", type: "boolean" },
  { key: "smsProvider", dbKey: "sms.provider", type: "string" },
  { key: "smsAccessKeyId", dbKey: "sms.accessKeyId", type: "string", sensitive: true },
  { key: "smsAccessKeySecret", dbKey: "sms.accessKeySecret", type: "string", sensitive: true },
  { key: "smsSignName", dbKey: "sms.signName", type: "string" },
  { key: "smsTemplateId", dbKey: "sms.templateId", type: "string" },

  { key: "mapApiKey", dbKey: "map.apiKey", type: "string", sensitive: true },
  { key: "analyticsEnabled", dbKey: "analytics.enabled", type: "boolean" },
  { key: "analyticsProvider", dbKey: "analytics.provider", type: "string" },
  { key: "analyticsKey", dbKey: "analytics.key", type: "string", sensitive: true },
  { key: "webhookEnabled", dbKey: "webhook.enabled", type: "boolean" },
  { key: "webhookUrl", dbKey: "webhook.url", type: "string", sensitive: true },
  { key: "customApiConfig", dbKey: "custom.apiConfig", type: "string" },
];

export const SENSITIVE_KEYS = new Set(CONFIG_DEFS.filter((item) => item.sensitive).map((item) => item.key));

const ASSISTANT_ENABLE_KEY_MAP: Record<string, keyof Pick<
  AppConfigValues,
  | "aiAssistantTaxEnabled"
  | "aiAssistantLegalEnabled"
  | "aiAssistantMarketEnabled"
  | "aiAssistantDesignEnabled"
  | "aiAssistantSocialEnabled"
>> = {
  [AI_ASSISTANTS.tax]: "aiAssistantTaxEnabled",
  [AI_ASSISTANTS.legal]: "aiAssistantLegalEnabled",
  [AI_ASSISTANTS.market]: "aiAssistantMarketEnabled",
  [AI_ASSISTANTS.design]: "aiAssistantDesignEnabled",
  [AI_ASSISTANTS.social]: "aiAssistantSocialEnabled",
};

// Re-export for use in server-only config functions
export { ASSISTANT_ENABLE_KEY_MAP, CONFIG_DEFS };
export type { ConfigDef, ConfigValueType, AppConfigKey };

export function normalizeConfigValue<K extends AppConfigKey>(key: K, value: unknown): AppConfigValues[K] {
  switch (key) {
    case "aiProvider": {
      const allowed: AiProvider[] = ["openai", "deepseek", "qwen", "bailian", "doubao", "zhipu", "openai-compatible"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.aiProvider;
      return (allowed.includes(normalized as AiProvider) ? normalized : DEFAULT_CONFIG.aiProvider) as AppConfigValues[K];
    }
    case "storageProvider": {
      const allowed: StorageProvider[] = ["local", "aliyun-oss", "tencent-cos"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.storageProvider;
      return (allowed.includes(normalized as StorageProvider) ? normalized : DEFAULT_CONFIG.storageProvider) as AppConfigValues[K];
    }
    case "smtpSecureMode": {
      const allowed: SmtpSecureMode[] = ["ssl", "tls", "none"];
      const normalized = typeof value === "string" ? value : DEFAULT_CONFIG.smtpSecureMode;
      return (allowed.includes(normalized as SmtpSecureMode) ? normalized : DEFAULT_CONFIG.smtpSecureMode) as AppConfigValues[K];
    }
    case "aiTesterEmails":
      return (Array.isArray(value) ? value : DEFAULT_CONFIG.aiTesterEmails) as AppConfigValues[K];
    default:
      return value as AppConfigValues[K];
  }
}

export function maskSensitiveValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return `****${value.slice(-4)}`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function serializeValue(value: unknown, type: ConfigValueType): string {
  if (type === "boolean") return value === true ? "true" : "false";
  if (type === "number") return String(value ?? 0);
  if (type === "json") return JSON.stringify(value ?? []);
  return String(value ?? "");
}

export function deserializeValue(raw: string, type: ConfigValueType): unknown {
  if (type === "boolean") return raw === "true";
  if (type === "number") {
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (type === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw;
}
