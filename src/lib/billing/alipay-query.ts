import crypto from "crypto";
import { amountStringToCents, getPaymentConfig } from "@/lib/billing/payments";

const ALIPAY_GATEWAY = "https://openapi.alipay.com/gateway.do";

export type AlipayTradeQueryResult = {
  success: boolean;
  found: boolean;
  orderNo: string;
  tradeNo?: string;
  tradeStatus?: string;
  totalAmount?: string;
  totalAmountCents?: number;
  buyerUserId?: string;
  responseVerified?: boolean;
  errorCode?: string;
  errorMessage?: string;
  rawCode?: string;
};

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function wrapPem(value: string, begin: string, end: string) {
  const normalized = normalizePem(value);
  if (normalized.includes("-----BEGIN")) return normalized;
  const body = normalized.replace(/\s+/g, "");
  const chunks = body.match(/.{1,64}/g) ?? [body];
  return [begin, ...chunks, end].join("\n");
}

function privateKeyObject(value: string) {
  const normalized = normalizePem(value);
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
  throw lastError instanceof Error ? lastError : new Error("应用私钥格式不正确");
}

function publicKeyObject(value: string) {
  return crypto.createPublicKey(wrapPem(value, "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----"));
}

function buildSignContent(params: Record<string, string>) {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function signParams(params: Record<string, string>, privateKey: string) {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(buildSignContent(params), "utf8");
  signer.end();
  return signer.sign(privateKeyObject(privateKey)).toString("base64");
}

function verifyResponse(content: string, signature: string, publicKey: string) {
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(content, "utf8");
    verifier.end();
    return verifier.verify(publicKeyObject(publicKey), signature, "base64");
  } catch {
    return false;
  }
}

function fingerprint(key: crypto.KeyObject) {
  const publicKey = key.type === "public" ? key : crypto.createPublicKey(key);
  const der = publicKey.export({ type: "spki", format: "der" });
  return crypto.createHash("sha256").update(der).digest("hex").slice(0, 16).toUpperCase();
}

export async function testAlipayConfiguration() {
  const config = await getPaymentConfig();
  const missing: string[] = [];
  if (!config.alipayAppId) missing.push("支付宝 App ID");
  if (!config.alipayAppPrivateKey) missing.push("应用私钥");
  if (!config.alipayPublicKey) missing.push("支付宝公钥");
  if (!config.alipayNotifyUrl) missing.push("异步通知地址");
  if (missing.length) {
    return { success: false, error: `配置不完整：${missing.join("、")}` };
  }

  try {
    const privateKey = privateKeyObject(config.alipayAppPrivateKey);
    const publicKey = publicKeyObject(config.alipayPublicKey);
    const challenge = {
      app_id: config.alipayAppId,
      method: "alipay.trade.query",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: "2026-01-01 00:00:00",
      version: "1.0",
      biz_content: JSON.stringify({ out_trade_no: "LINK168_KEY_TEST" }),
    };
    const signature = signParams(challenge, config.alipayAppPrivateKey);
    if (!signature) throw new Error("签名结果为空");

    return {
      success: true,
      appId: config.alipayAppId,
      sellerIdConfigured: Boolean(config.alipaySellerId),
      privateKeyFingerprint: fingerprint(privateKey),
      alipayPublicKeyFingerprint: fingerprint(publicKey),
      notifyUrl: config.alipayNotifyUrl,
      testMode: config.testMode,
      message: "应用私钥可正常生成 RSA2 签名，支付宝公钥格式有效。",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "支付宝密钥测试失败。",
    };
  }
}

export async function queryAlipayTrade(orderNo: string): Promise<AlipayTradeQueryResult> {
  const normalizedOrderNo = orderNo.trim();
  if (!normalizedOrderNo) {
    return { success: false, found: false, orderNo: "", errorCode: "BAD_ORDER_NO", errorMessage: "订单号不能为空。" };
  }

  const config = await getPaymentConfig();
  if (!config.enabled || !config.alipayEnabled) {
    return { success: false, found: false, orderNo: normalizedOrderNo, errorCode: "ALIPAY_DISABLED", errorMessage: "支付宝支付尚未开启。" };
  }
  if (!config.alipayAppId || !config.alipayAppPrivateKey || !config.alipayPublicKey) {
    return { success: false, found: false, orderNo: normalizedOrderNo, errorCode: "ALIPAY_INCOMPLETE", errorMessage: "支付宝配置不完整。" };
  }
  if (config.testMode) {
    return { success: false, found: false, orderNo: normalizedOrderNo, errorCode: "TEST_MODE", errorMessage: "当前处于支付测试模式，不能查询支付宝真实订单。" };
  }

  const params: Record<string, string> = {
    app_id: config.alipayAppId,
    method: "alipay.trade.query",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no: normalizedOrderNo }),
  };

  try {
    params.sign = signParams(params, config.alipayAppPrivateKey);
    const query = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");
    const response = await fetch(`${ALIPAY_GATEWAY}?${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const rawText = await response.text();
    if (!response.ok) {
      return { success: false, found: false, orderNo: normalizedOrderNo, errorCode: `HTTP_${response.status}`, errorMessage: "支付宝查单接口请求失败。" };
    }

    const payload = JSON.parse(rawText) as {
      alipay_trade_query_response?: Record<string, unknown>;
      sign?: string;
    };
    const data = payload.alipay_trade_query_response ?? {};
    const rawCode = String(data.code ?? "");
    const subCode = String(data.sub_code ?? "");
    const message = String(data.sub_msg ?? data.msg ?? "支付宝查单失败");

    if (rawCode !== "10000") {
      const notFound = subCode === "ACQ.TRADE_NOT_EXIST";
      return {
        success: notFound,
        found: false,
        orderNo: normalizedOrderNo,
        rawCode,
        errorCode: subCode || rawCode || "ALIPAY_QUERY_FAILED",
        errorMessage: notFound ? "支付宝尚未查询到该交易。" : message,
      };
    }

    const responseContent = JSON.stringify(data);
    const responseVerified = Boolean(payload.sign) && verifyResponse(responseContent, payload.sign || "", config.alipayPublicKey);
    if (!responseVerified) {
      return {
        success: false,
        found: true,
        orderNo: normalizedOrderNo,
        rawCode,
        errorCode: "BAD_RESPONSE_SIGNATURE",
        errorMessage: "支付宝查单响应签名验证失败。",
        responseVerified: false,
      };
    }

    const returnedOrderNo = String(data.out_trade_no ?? normalizedOrderNo);
    if (returnedOrderNo !== normalizedOrderNo) {
      return {
        success: false,
        found: true,
        orderNo: returnedOrderNo,
        rawCode,
        errorCode: "ORDER_NO_MISMATCH",
        errorMessage: "支付宝返回的订单号与查询订单不一致。",
        responseVerified: true,
      };
    }

    const totalAmount = String(data.total_amount ?? "");
    const totalAmountCents = totalAmount ? amountStringToCents(totalAmount) : null;
    return {
      success: true,
      found: true,
      orderNo: returnedOrderNo,
      tradeNo: String(data.trade_no ?? ""),
      tradeStatus: String(data.trade_status ?? ""),
      totalAmount: totalAmount || undefined,
      totalAmountCents: totalAmountCents ?? undefined,
      buyerUserId: String(data.buyer_user_id ?? "") || undefined,
      responseVerified: true,
      rawCode,
    };
  } catch (error) {
    return {
      success: false,
      found: false,
      orderNo: normalizedOrderNo,
      errorCode: "ALIPAY_QUERY_EXCEPTION",
      errorMessage: error instanceof Error ? error.message : "支付宝主动查单失败。",
    };
  }
}
