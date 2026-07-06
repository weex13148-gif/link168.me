import crypto from "crypto";
import { getConfig } from "@/lib/app-config";
import type { BillingOrder, PaymentChannel } from "./orders";

export type PaymentConfig = {
  enabled: boolean;
  wechatEnabled: boolean;
  alipayEnabled: boolean;
  merchantId: string;
  wechatAppId: string;
  apiKey: string;
  alipayAppId: string;
  alipayAppPrivateKey: string;
  alipayPublicKey: string;
  alipaySellerId: string;
  certPath: string;
  notifyUrl: string;
  alipayNotifyUrl: string;
  testMode: boolean;
};

export type PaymentAvailability = {
  paymentEnabled: boolean;
  wechatAvailable: boolean;
  alipayAvailable: boolean;
  wechatReason?: string;
  alipayReason?: string;
};

export type PaymentCreateResult = {
  success: boolean;
  payUrl?: string;
  qrCodeUrl?: string;
  prepayId?: string;
  orderInfo?: string;
  errorCode?: string;
  errorMessage?: string;
};

const DEFAULT_WECHAT_NOTIFY_PATH = "/api/payments/wechat/notify";
const DEFAULT_ALIPAY_NOTIFY_PATH = "/api/payments/alipay/notify";

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const config = await getConfig();

  return {
    enabled: config.paymentEnabled,
    wechatEnabled: config.paymentWechatEnabled,
    alipayEnabled: config.paymentAlipayEnabled,
    merchantId: config.paymentMerchantId,
    wechatAppId: config.paymentAppId,
    apiKey: config.paymentApiKey,
    alipayAppId: config.paymentAlipayAppId || config.paymentAppId,
    alipayAppPrivateKey: config.paymentAlipayAppPrivateKey,
    alipayPublicKey: config.paymentAlipayPublicKey,
    alipaySellerId: config.paymentAlipaySellerId,
    certPath: config.paymentCertPath,
    notifyUrl: config.paymentNotifyUrl,
    alipayNotifyUrl: config.paymentAlipayNotifyUrl || config.paymentNotifyUrl,
    testMode: config.paymentTestMode,
  };
}

export async function getPaymentAvailability(): Promise<PaymentAvailability> {
  const config = await getPaymentConfig();

  const result: PaymentAvailability = {
    paymentEnabled: config.enabled,
    wechatAvailable: false,
    alipayAvailable: false,
  };

  if (!config.enabled) {
    result.wechatReason = "支付功能已关闭";
    result.alipayReason = "支付功能已关闭";
    return result;
  }

  if (!config.merchantId || !config.wechatAppId || !config.apiKey) {
    result.wechatReason = "微信支付未完整配置";
  } else if (!config.wechatEnabled) {
    result.wechatReason = "微信支付已关闭";
  } else {
    result.wechatAvailable = true;
  }

  if (!config.alipayAppId || !config.alipayAppPrivateKey || !config.alipayPublicKey) {
    result.alipayReason = "支付宝未完整配置（缺少 AppId、应用私钥或支付宝公钥）";
  } else if (!config.alipayEnabled) {
    result.alipayReason = "支付宝已关闭";
  } else {
    result.alipayAvailable = true;
  }

  return result;
}

export async function isPaymentAvailable(): Promise<boolean> {
  const availability = await getPaymentAvailability();
  return availability.paymentEnabled && (availability.wechatAvailable || availability.alipayAvailable);
}

export async function isPaymentMethodAvailable(method: PaymentChannel): Promise<boolean> {
  const availability = await getPaymentAvailability();
  if (!availability.paymentEnabled) return false;
  if (method === "wechat") return availability.wechatAvailable;
  if (method === "alipay") return availability.alipayAvailable;
  return false;
}

export async function canCreatePayment(): Promise<{ can: boolean; reason?: string }> {
  const config = await getPaymentConfig();

  if (!config.enabled) {
    return { can: false, reason: "当前环境暂不支持在线支付" };
  }

  const availability = await getPaymentAvailability();
  if (!availability.wechatAvailable && !availability.alipayAvailable) {
    return { can: false, reason: "请至少配置一种支付方式（微信或支付宝）" };
  }

  return { can: true };
}

function buildAlipayContent(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== "" && params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

function wrapPem(value: string, begin: string, end: string): string {
  const normalized = normalizePem(value);
  if (normalized.includes("-----BEGIN")) {
    return normalized;
  }

  const body = normalized.replace(/\s+/g, "");
  const chunks = body.match(/.{1,64}/g) ?? [body];
  return [begin, ...chunks, end].join("\n");
}

function createAlipayPrivateKey(privateKey: string) {
  const normalized = normalizePem(privateKey);
  const candidates = normalized.includes("-----BEGIN")
    ? [normalized]
    : [
        wrapPem(normalized, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----"),
        wrapPem(normalized, "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----"),
      ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return crypto.createPrivateKey(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Invalid Alipay private key");
}

function normalizeAlipayAmount(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const normalizedFraction = `${fraction}00`.slice(0, 2);
  return `${whole}.${normalizedFraction}`;
}

export function amountStringToCents(value: string): number | null {
  const normalized = normalizeAlipayAmount(value);
  if (!normalized) return null;

  const [whole, fraction] = normalized.split(".");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction, 10);
  return Number.isSafeInteger(cents) ? cents : null;
}

function centsToAmountString(value: number): string {
  return (value / 100).toFixed(2);
}

function resolveNotifyUrl(explicitUrl: string, fallbackPath: string): string {
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return `${baseUrl}${fallbackPath}`;
}

export function wechatVerifySignature(
  params: Record<string, string>,
  apiKey: string,
  signType: "MD5" | "HMAC-SHA256" = "HMAC-SHA256",
): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const sortedKeys = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "" && params[key] !== undefined && params[key] !== null)
    .sort();

  const stringA = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  const stringSignTemp = `${stringA}&key=${apiKey}`;

  const calculatedSign =
    signType === "HMAC-SHA256"
      ? crypto.createHmac("sha256", apiKey).update(stringSignTemp).digest("hex").toUpperCase()
      : crypto.createHash("md5").update(stringSignTemp).digest("hex").toUpperCase();

  return calculatedSign === sign.toUpperCase();
}

export function alipayVerifySignature(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const signType = params.sign_type || "RSA2";
  const content = buildAlipayContent(params);

  try {
    const verifier = crypto.createVerify(signType === "RSA2" ? "RSA-SHA256" : "RSA-SHA1");
    verifier.update(content, "utf8");
    verifier.end();
    return verifier.verify(wrapPem(publicKey, "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----"), sign, "base64");
  } catch {
    return false;
  }
}

export function generateWechatSign(
  params: Record<string, string>,
  apiKey: string,
  signType: "MD5" | "HMAC-SHA256" = "HMAC-SHA256",
): string {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== "" && params[key] !== undefined && params[key] !== null)
    .sort();

  const stringA = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  const stringSignTemp = `${stringA}&key=${apiKey}`;

  if (signType === "HMAC-SHA256") {
    return crypto.createHmac("sha256", apiKey).update(stringSignTemp).digest("hex").toUpperCase();
  }

  return crypto.createHash("md5").update(stringSignTemp).digest("hex").toUpperCase();
}

function generateAlipaySign(params: Record<string, string>, privateKey: string): string {
  const content = buildAlipayContent(params);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(content, "utf8");
  signer.end();

  const signature = signer.sign(createAlipayPrivateKey(privateKey));

  return signature.toString("base64");
}

export async function createPayment(order: BillingOrder, method: PaymentChannel): Promise<PaymentCreateResult> {
  const canCreate = await canCreatePayment();
  if (!canCreate.can) {
    return { success: false, errorCode: "PAYMENT_UNAVAILABLE", errorMessage: canCreate.reason };
  }

  const config = await getPaymentConfig();

  if (method === "wechat") {
    const availability = await getPaymentAvailability();
    if (!availability.wechatAvailable) {
      return { success: false, errorCode: "WECHAT_NOT_AVAILABLE", errorMessage: availability.wechatReason };
    }

    return createWechatPayment(order, config);
  }

  if (method === "alipay") {
    const availability = await getPaymentAvailability();
    if (!availability.alipayAvailable) {
      return { success: false, errorCode: "ALIPAY_NOT_AVAILABLE", errorMessage: availability.alipayReason };
    }

    return createAlipayPayment(order, config);
  }

  return { success: false, errorCode: "INVALID_METHOD", errorMessage: "不支持的支付方式" };
}

async function createWechatPayment(order: BillingOrder, config: PaymentConfig): Promise<PaymentCreateResult> {
  const params: Record<string, string> = {
    appid: config.wechatAppId,
    mch_id: config.merchantId,
    nonce_str: crypto.randomBytes(16).toString("hex"),
    body: `Link168 ${order.planName}`,
    out_trade_no: order.orderNo,
    total_fee: String(order.payableAmount),
    spbill_create_ip: "127.0.0.1",
    notify_url: resolveNotifyUrl(config.notifyUrl, DEFAULT_WECHAT_NOTIFY_PATH),
    trade_type: "NATIVE",
  };

  params.sign = generateWechatSign(params, config.apiKey, "HMAC-SHA256");

  if (config.testMode) {
    return {
      success: true,
      qrCodeUrl: "",
      prepayId: `test_${order.orderNo}`,
    };
  }

  try {
    const xmlBody = objectToXml(params);
    const response = await fetch("https://api.mch.weixin.qq.com/pay/unifiedorder", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xmlBody,
      signal: AbortSignal.timeout(10000),
    });
    const xmlText = await response.text();
    const result = xmlToObject(xmlText);

    if (result.return_code === "SUCCESS" && result.result_code === "SUCCESS") {
      return {
        success: true,
        qrCodeUrl: result.code_url,
        prepayId: result.prepay_id,
      };
    }

    return {
      success: false,
      errorCode: result.err_code || "WECHAT_PAY_ERROR",
      errorMessage: result.err_code_des || result.return_msg || "微信支付下单失败",
    };
  } catch (error) {
    console.error("[payment] 微信支付请求失败:", error);
    return {
      success: false,
      errorCode: "WECHAT_PAY_NETWORK_ERROR",
      errorMessage: error instanceof Error ? error.message : "微信支付请求失败",
    };
  }
}

async function createAlipayPayment(order: BillingOrder, config: PaymentConfig): Promise<PaymentCreateResult> {
  const params: Record<string, string> = {
    app_id: config.alipayAppId,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    version: "1.0",
    notify_url: resolveNotifyUrl(config.alipayNotifyUrl, DEFAULT_ALIPAY_NOTIFY_PATH),
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/workbench/membership`,
    biz_content: JSON.stringify({
      out_trade_no: order.orderNo,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: centsToAmountString(order.payableAmount),
      subject: `Link168 ${order.planName}`,
    }),
  };

  try {
    params.sign = generateAlipaySign(params, config.alipayAppPrivateKey);
  } catch (error) {
    console.error("[payment] 支付宝签名失败:", error);
    return {
      success: false,
      errorCode: "ALIPAY_SIGN_ERROR",
      errorMessage: "支付宝签名失败",
    };
  }

  if (config.testMode) {
    return {
      success: true,
      payUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/payments/alipay/test?orderNo=${order.orderNo}`,
      orderInfo: `test_${order.orderNo}`,
    };
  }

  try {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    return {
      success: true,
      payUrl: `https://openapi.alipay.com/gateway.do?${queryString}`,
      orderInfo: queryString,
    };
  } catch (error) {
    console.error("[payment] 支付宝下单失败:", error);
    return {
      success: false,
      errorCode: "ALIPAY_ERROR",
      errorMessage: error instanceof Error ? error.message : "支付宝下单失败",
    };
  }
}

export async function parseWechatNotify(body: string): Promise<Record<string, string>> {
  return xmlToObject(body);
}

export async function parseAlipayNotify(formData: FormData): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}

function objectToXml(obj: Record<string, string>): string {
  const xml = Object.entries(obj)
    .map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`)
    .join("");
  return `<xml>${xml}</xml>`;
}

function xmlToObject(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];
    result[key] = value;
  }
  return result;
}

export type WechatNotifyValidation = {
  valid: boolean;
  orderNo?: string;
  tradeNo?: string;
  totalFee?: number;
  error?: string;
};

export type AlipayNotifyValidation = {
  valid: boolean;
  orderNo?: string;
  tradeNo?: string;
  totalAmount?: string;
  totalAmountCents?: number;
  tradeStatus?: string;
  appId?: string;
  sellerId?: string;
  error?: string;
};

export function validateWechatNotify(params: Record<string, string>, apiKey: string): WechatNotifyValidation {
  if (params.return_code !== "SUCCESS") {
    return { valid: false, error: params.return_msg || "微信返回失败" };
  }

  if (!wechatVerifySignature(params, apiKey)) {
    return { valid: false, error: "签名验证失败" };
  }

  if (params.result_code !== "SUCCESS") {
    return { valid: false, error: params.err_code_des || params.err_msg || "业务处理失败" };
  }

  if (!params.out_trade_no || !params.transaction_id || !params.total_fee) {
    return { valid: false, error: "微信回调缺少必要字段" };
  }

  const totalFee = Number.parseInt(params.total_fee, 10);
  if (!Number.isSafeInteger(totalFee) || totalFee < 0) {
    return { valid: false, error: "微信回调金额格式非法" };
  }

  return {
    valid: true,
    orderNo: params.out_trade_no,
    tradeNo: params.transaction_id,
    totalFee,
  };
}

export function validateAlipayNotify(params: Record<string, string>, publicKey: string): AlipayNotifyValidation {
  if (!alipayVerifySignature(params, publicKey)) {
    return { valid: false, error: "签名验证失败" };
  }

  if (!params.out_trade_no) {
    return { valid: false, error: "缺少 out_trade_no" };
  }

  if (!params.trade_no) {
    return { valid: false, error: "缺少 trade_no" };
  }

  const tradeStatus = params.trade_status;
  if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
    return { valid: false, error: `交易状态不是成功：${tradeStatus || "UNKNOWN"}` };
  }

  if (!params.app_id) {
    return { valid: false, error: "缺少 app_id" };
  }

  if (!params.total_amount) {
    return { valid: false, error: "缺少 total_amount" };
  }

  const totalAmount = normalizeAlipayAmount(params.total_amount);
  if (!totalAmount) {
    return { valid: false, error: "total_amount 格式非法" };
  }

  const totalAmountCents = amountStringToCents(totalAmount);
  if (totalAmountCents === null) {
    return { valid: false, error: "total_amount 无法转换为分" };
  }

  return {
    valid: true,
    orderNo: params.out_trade_no,
    tradeNo: params.trade_no,
    totalAmount,
    totalAmountCents,
    tradeStatus,
    appId: params.app_id,
    sellerId: params.seller_id || params.seller_email || undefined,
  };
}
