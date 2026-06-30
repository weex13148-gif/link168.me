import crypto from "crypto";

export const SMS_PURPOSE_BIND_PHONE = "bind-phone";
export const SMS_PURPOSE_LOGIN = "login";

const SMS_CODE_LENGTH = 6;
const SMS_CODE_EXPIRES_MINUTES = 5;
const SMS_60S_WINDOW_MS = 60 * 1000;
const SMS_24H_WINDOW_MS = 24 * 60 * 60 * 1000;
const SMS_PER_PHONE_24H_MAX = 10;
const SMS_PER_IP_24H_MAX = 50;

export type SmsSendResult =
  | { success: true; provider: string }
  | { success: false; provider: string; errorCode: string; error?: string };

export type SmsRateLimitResult = { ok: true } | { ok: false; waitSec: number; reason: string };

function hashIp(ip: string | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

function isValidChineseMobile(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

function generateSmsCode(): string {
  let code = "";
  for (let i = 0; i < SMS_CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

async function getSmsConfig(): Promise<{
  enabled: boolean;
  accessKeyId?: string;
  accessKeySecret?: string;
  signName?: string;
  templateCode?: string;
  endpoint?: string;
}> {
  try {
    const { getConfig } = await import("@/lib/app-config");
    const config = await getConfig().catch(() => null);
    if (config?.smsEnabled) {
      return {
        enabled: true,
        accessKeyId: config.smsAccessKeyId || process.env.ALIYUN_SMS_ACCESS_KEY_ID,
        accessKeySecret: config.smsAccessKeySecret || process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
        signName: config.smsSignName || process.env.ALIYUN_SMS_SIGN_NAME,
        templateCode: config.smsTemplateId || process.env.ALIYUN_SMS_TEMPLATE_CODE,
        endpoint: (config as Record<string, unknown>).smsEndpoint as string | undefined || process.env.ALIYUN_SMS_ENDPOINT || "dysmsapi.aliyuncs.com",
      };
    }
  } catch {
    // 配置读取失败
  }

  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (accessKeyId && accessKeySecret && signName && templateCode) {
    return { enabled: true, accessKeyId, accessKeySecret, signName, templateCode };
  }

  return { enabled: false };
}

async function checkSmsRateLimit(
  phone: string,
  _ipRaw: string | undefined,
  _purpose: string,
): Promise<SmsRateLimitResult> {
  // 频率限制检查（内存 Map 方式，不依赖数据库）
  const now = Date.now();
  const key60s = `sms_60s_${phone}`;
  const key24h = `sms_24h_${phone}`;

  // 60 秒窗口
  const last60s = smsRateMap.get(key60s);
  if (last60s && now - (last60s as number) < SMS_60S_WINDOW_MS) {
    const waitSec = Math.ceil((SMS_60S_WINDOW_MS - (now - (last60s as number))) / 1000);
    return { ok: false, waitSec, reason: "rate-limit-60s" };
  }

  // 24 小时窗口
  const count24h = smsRateMap.get(key24h);
  if (count24h && now - (count24h as number[]) [0] < SMS_24H_WINDOW_MS) {
    const count = (count24h as number[])[1] as number;
    if (count >= SMS_PER_PHONE_24H_MAX) {
      return { ok: false, waitSec: 60 * 60, reason: "rate-limit-24h-phone" };
    }
  }

  return { ok: true };
}

// 内存频率限制 Map
const smsRateMap = new Map<string, number | number[]>();

function recordSmsRate(phone: string): void {
  const now = Date.now();
  const key60s = `sms_60s_${phone}`;
  const key24h = `sms_24h_${phone}`;
  smsRateMap.set(key60s, now);

  const existing = smsRateMap.get(key24h);
  if (existing && now - (existing as number[])[0] < SMS_24H_WINDOW_MS) {
    smsRateMap.set(key24h, [now, ((existing as number[])[1] as number) + 1]);
  } else {
    smsRateMap.set(key24h, [now, 1]);
  }
}

async function sendAliyunSms(
  phone: string,
  code: string,
  config: { accessKeyId: string; accessKeySecret: string; signName: string; templateCode: string; endpoint?: string },
): Promise<SmsSendResult> {
  const accessKeyId = config.accessKeyId;
  const accessKeySecret = config.accessKeySecret;
  const signName = config.signName;
  const templateCode = config.templateCode;
  const endpoint = config.endpoint || "dysmsapi.aliyuncs.com";

  try {
    const { default: aliyunSdk } = await import("@alicloud/dysmsapi20170525");
    const { default: OpenApi } = await import("@alicloud/openapi-client");
    const { default: Util } = await import("@alicloud/tea-util");

    const client = new aliyunSdk.default({
      accessKeyId,
      accessKeySecret,
      endpoint,
    });

    const request = new OpenApi.OpenApiRequest({
      query: Util.toMap({
        PhoneNumbers: phone,
        SignName: signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ code }),
      }),
    });

    const response = await client.sendSms(request);
    if (response.body?.code === "OK") {
      return { success: true, provider: "aliyun" };
    }
    return {
      success: false,
      provider: "aliyun",
      errorCode: response.body?.code || "PROVIDER_REJECTED",
      error: response.body?.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[SMS ERROR] Failed sending to ${phone}: ${message}`);
    return { success: false, provider: "aliyun", errorCode: "PROVIDER_ERROR", error: message };
  }
}

export async function sendSmsVerificationCode(
  phoneRaw: string,
  purpose: string,
  ipRaw: string | undefined,
): Promise<
  | { success: true; codeHash: string; expiresAt: Date; provider: string }
  | { success: false; errorCode: string; error?: string; waitSec?: number }
> {
  const phone = normalizePhone(phoneRaw);

  if (!isValidChineseMobile(phone)) {
    return { success: false, errorCode: "INVALID_PHONE", error: "请输入正确的 +86 手机号" };
  }

  const rateLimit = await checkSmsRateLimit(phone, ipRaw, purpose);
  if (!rateLimit.ok) {
    return { success: false, errorCode: "RATE_LIMITED", waitSec: rateLimit.waitSec };
  }

  const config = await getSmsConfig();

  if (!config.enabled) {
    // 短信服务未配置时，不写 EmailSendLog，直接返回明确错误
    return { success: false, errorCode: "SMS_NOT_CONFIGURED", error: "短信服务暂未配置，请联系管理员。" };
  }

  const code = generateSmsCode();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MINUTES * 60 * 1000);

  let sendResult: SmsSendResult;

  if (config.accessKeyId && config.accessKeySecret && config.signName && config.templateCode) {
    sendResult = await sendAliyunSms(phone, code, {
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      signName: config.signName,
      templateCode: config.templateCode,
      endpoint: config.endpoint,
    });
  } else {
    sendResult = { success: false, provider: "none", errorCode: "SMS_NOT_CONFIGURED" };
  }

  if (!sendResult.success) {
    return { success: false, errorCode: sendResult.errorCode || "SEND_FAILED", error: sendResult.error };
  }

  recordSmsRate(phone);

  return { success: true, codeHash, expiresAt, provider: sendResult.provider };
}

export function verifySmsCode(inputCode: string, storedHash: string, expiresAt: Date): boolean {
  if (new Date() > expiresAt) {
    return false;
  }
  const inputHash = crypto.createHash("sha256").update(inputCode.trim()).digest("hex");
  return inputHash === storedHash;
}

export const SmsConstants = {
  CODE_LENGTH: SMS_CODE_LENGTH,
  CODE_EXPIRES_MINUTES: SMS_CODE_EXPIRES_MINUTES,
  RATE_LIMIT_60S_MS: SMS_60S_WINDOW_MS,
  RATE_LIMIT_24H_MS: SMS_24H_WINDOW_MS,
  MAX_PER_PHONE_24H: SMS_PER_PHONE_24H_MAX,
  MAX_PER_IP_24H: SMS_PER_IP_24H_MAX,
  PURPOSE_BIND_PHONE: SMS_PURPOSE_BIND_PHONE,
  PURPOSE_LOGIN: SMS_PURPOSE_LOGIN,
};
