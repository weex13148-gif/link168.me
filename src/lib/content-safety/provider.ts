export type RiskLevel = "low" | "medium" | "high";

export type ModerationStatus = "pending" | "approved" | "rejected" | "pending_manual_review";

export type AppealStatus = "none" | "pending" | "approved" | "rejected";

export interface ModerateTextInput {
  text: string;
  scene?: string;
}

export interface ModerateTextResult {
  ok: boolean;
  passed: boolean;
  riskLevel?: RiskLevel;
  reason?: string;
  hits?: string[];
}

export interface ModerateImageInput {
  url?: string;
  localPath?: string;
  mimeType: string;
  size: number;
  fileName?: string;
}

export interface ModerateImageResult {
  ok: boolean;
  passed: boolean;
  riskLevel?: RiskLevel;
  reason?: string;
  label?: string;
}

export interface ContentSafetyProvider {
  readonly name: string;
  moderateText(input: ModerateTextInput): Promise<ModerateTextResult>;
  moderateImage(input: ModerateImageInput): Promise<ModerateImageResult>;
}

const SENSITIVE_CATEGORIES: Record<string, string[]> = {
  violence: ["暴力破解", "黑产", "博彩", "1040阳光工程"],
  adult: ["色情", "裸聊"],
  drug: ["冰毒", "大麻", "枪支"],
  fraud: ["刷单刷量", "代开发票", "假证"],
  political: ["法轮"],
};

const HIGH_RISK_WORDS = new Set([
  ...SENSITIVE_CATEGORIES.violence.slice(0, 2),
  ...SENSITIVE_CATEGORIES.adult,
  ...SENSITIVE_CATEGORIES.drug,
  ...SENSITIVE_CATEGORIES.political,
]);

const MEDIUM_RISK_WORDS = new Set([
  ...SENSITIVE_CATEGORIES.fraud,
  SENSITIVE_CATEGORIES.violence[2],
  SENSITIVE_CATEGORIES.violence[3],
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export class LocalHeuristicProvider implements ContentSafetyProvider {
  readonly name = "local_heuristic";

  async moderateText(input: ModerateTextInput): Promise<ModerateTextResult> {
    const { text } = input;
    if (!text || !text.trim()) {
      return { ok: true, passed: true, riskLevel: "low", hits: [] };
    }

    const normalized = text.toLowerCase();
    const highHits: string[] = [];
    const mediumHits: string[] = [];

    for (const word of HIGH_RISK_WORDS) {
      if (normalized.includes(word.toLowerCase())) {
        highHits.push(word);
      }
    }

    for (const word of MEDIUM_RISK_WORDS) {
      if (normalized.includes(word.toLowerCase())) {
        mediumHits.push(word);
      }
    }

    const allHits = [...highHits, ...mediumHits];

    if (highHits.length > 0) {
      return {
        ok: true,
        passed: false,
        riskLevel: "high",
        reason: "命中高风险敏感词",
        hits: allHits,
      };
    }

    if (mediumHits.length > 0) {
      return {
        ok: true,
        passed: false,
        riskLevel: "medium",
        reason: "命中中风险敏感词，需人工复核",
        hits: allHits,
      };
    }

    return {
      ok: true,
      passed: true,
      riskLevel: "low",
      hits: [],
    };
  }

  async moderateImage(input: ModerateImageInput): Promise<ModerateImageResult> {
    const { mimeType, size } = input;

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return {
        ok: true,
        passed: false,
        riskLevel: "high",
        reason: `不支持的图片格式: ${mimeType}`,
        label: "invalid_format",
      };
    }

    if (size <= 0 || size > MAX_IMAGE_SIZE) {
      return {
        ok: true,
        passed: false,
        riskLevel: "high",
        reason: `图片尺寸不符合要求: ${size} bytes`,
        label: "invalid_size",
      };
    }

    if (process.env.NODE_ENV !== "production") {
      return {
        ok: true,
        passed: true,
        riskLevel: "low",
        reason: "local development image checks passed",
        label: "local_approved",
      };
    }

    return {
      ok: true,
      passed: false,
      riskLevel: "medium",
      reason: "本地启发式无法完成图片内容审核，需人工复核",
      label: "pending_manual_review",
    };
  }
}

export class AliyunContentSafetyProvider implements ContentSafetyProvider {
  readonly name = "aliyun";

  private accessKeyId: string;
  private accessKeySecret: string;
  private endpoint?: string;

  constructor(config: { accessKeyId: string; accessKeySecret: string; endpoint?: string }) {
    this.accessKeyId = config.accessKeyId;
    this.accessKeySecret = config.accessKeySecret;
    this.endpoint = config.endpoint;
  }

  async moderateText(input: ModerateTextInput): Promise<ModerateTextResult> {
    throw new Error("AliyunContentSafetyProvider.moderateText not implemented");
  }

  async moderateImage(input: ModerateImageInput): Promise<ModerateImageResult> {
    throw new Error("AliyunContentSafetyProvider.moderateImage not implemented");
  }
}

export class TencentContentSafetyProvider implements ContentSafetyProvider {
  readonly name = "tencent";

  private secretId: string;
  private secretKey: string;
  private region?: string;

  constructor(config: { secretId: string; secretKey: string; region?: string }) {
    this.secretId = config.secretId;
    this.secretKey = config.secretKey;
    this.region = config.region;
  }

  async moderateText(input: ModerateTextInput): Promise<ModerateTextResult> {
    throw new Error("TencentContentSafetyProvider.moderateText not implemented");
  }

  async moderateImage(input: ModerateImageInput): Promise<ModerateImageResult> {
    throw new Error("TencentContentSafetyProvider.moderateImage not implemented");
  }
}

let cachedProvider: ContentSafetyProvider | null = null;

export function getContentSafetyProvider(): ContentSafetyProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = (process.env.CONTENT_SAFETY_PROVIDER || "").trim().toLowerCase();

  if (providerName === "aliyun") {
    const accessKeyId = (process.env.ALIYUN_CSAK_ID || "").trim();
    const accessKeySecret = (process.env.ALIYUN_CSAK_SECRET || "").trim();
    const endpoint = (process.env.ALIYUN_CS_ENDPOINT || "").trim() || undefined;

    if (accessKeyId && accessKeySecret) {
      cachedProvider = new AliyunContentSafetyProvider({
        accessKeyId,
        accessKeySecret,
        endpoint,
      });
      return cachedProvider;
    }
  }

  if (providerName === "tencent") {
    const secretId = (process.env.TENCENT_CS_SECRET_ID || "").trim();
    const secretKey = (process.env.TENCENT_CS_SECRET_KEY || "").trim();
    const region = (process.env.TENCENT_CS_REGION || "").trim() || undefined;

    if (secretId && secretKey) {
      cachedProvider = new TencentContentSafetyProvider({
        secretId,
        secretKey,
        region,
      });
      return cachedProvider;
    }
  }

  cachedProvider = new LocalHeuristicProvider();
  return cachedProvider;
}

export function resetContentSafetyProvider(): void {
  cachedProvider = null;
}
