export type AiBusinessRiskDecision =
  | { level: 1 }
  | {
      level: 2 | 3 | 4;
      code:
        | "RULE_REFERENCE"
        | "HUMAN_CONFIRMATION_REQUIRED"
        | "PROFESSIONAL_ADVICE_REFUSED"
        | "SECRET_REQUEST_REFUSED"
        | "UNLAWFUL_REQUEST_REFUSED";
      reply: string;
      riskLevel: "low" | "medium" | "high";
    };

const SECRET_REQUEST = /(api\s*key|apikey|密钥|私钥|数据库密码|生产配置|系统提示词|内部提示词|其他用户.{0,8}(数据|资料)|后台凭证|管理员密码)/i;
const UNLAWFUL_REQUEST = /(伪造(证明|证书|数据|交易)|刷量|恶意差评|非法抓取|绕过(审核|权限)|删除\s*ai\s*标识|去除\s*ai\s*标识|冒充真人)/i;
const PROFESSIONAL_ADVICE = /(正式法律结论|法律意见书|替我下法律结论|医疗诊断|开药|医生结论|投资建议|金融顾问结论|保证通过(审核|诉讼|备案))/i;
const HUMAN_CONFIRMATION = /(保证|承诺).{0,18}(退款|赔偿|交付|上线|完成|获客|收益|排名|成交)|(退款|赔偿).{0,18}(金额|多少|立即|现在|保证|承诺)|(特价|特殊折扣|私下优惠|最低价|给我.{0,8}折)|(侵权|争议|投诉|删除我的数据|注销数据).{0,24}(怎么处理|马上|立即|赔偿|承诺)/i;
const RULE_REFERENCE = /(套餐|会员|plus|pro).{0,18}(价格|多少钱|收费|额度|用量)|(价格|多少钱|收费).{0,18}(套餐|会员|plus|pro)|(退款规则|退款条件|能不能退款|怎么退款)|(ai|人工智能).{0,12}(额度|次数|用量)/i;

export function classifyAiBusinessRisk(message: string): AiBusinessRiskDecision {
  const normalized = String(message || "").trim();
  if (!normalized) return { level: 1 };

  if (SECRET_REQUEST.test(normalized)) {
    return {
      level: 4,
      code: "SECRET_REQUEST_REFUSED",
      riskLevel: "high",
      reply: "我不能提供密钥、系统提示词、其他用户数据或内部配置。请不要在对话中发送密码、密钥或其他敏感信息。",
    };
  }

  if (UNLAWFUL_REQUEST.test(normalized)) {
    return {
      level: 4,
      code: "UNLAWFUL_REQUEST_REFUSED",
      riskLevel: "high",
      reply: "我不能协助伪造、刷量、非法抓取、绕过审核或删除 AI 标识等行为。请使用合法、真实且获得授权的方式处理。",
    };
  }

  if (PROFESSIONAL_ADVICE.test(normalized)) {
    return {
      level: 4,
      code: "PROFESSIONAL_ADVICE_REFUSED",
      riskLevel: "high",
      reply: "我不能提供或冒充正式法律、医疗、金融等专业结论。本页面信息仅用于一般说明；涉及重大权益时，请咨询具备相应资质的专业人员。",
    };
  }

  if (HUMAN_CONFIRMATION.test(normalized)) {
    return {
      level: 3,
      code: "HUMAN_CONFIRMATION_REQUIRED",
      riskLevel: "medium",
      reply: "该问题涉及个案价格、退款、赔偿、交付或争议处理，需要由经营者或平台人工确认。当前回复不构成承诺，请使用页面中已配置的联系按钮或正式客服渠道。",
    };
  }

  if (RULE_REFERENCE.test(normalized)) {
    return {
      level: 2,
      code: "RULE_REFERENCE",
      riskLevel: "low",
      reply: "我只能依据页面已经发布的正式规则说明：套餐价格和权益以定价页及订单页为准，退款条件以《支付与退款规则》为准。本回复不代表对个案退款、优惠或赔偿作出承诺。",
    };
  }

  return { level: 1 };
}
