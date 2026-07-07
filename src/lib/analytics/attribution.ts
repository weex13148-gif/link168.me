/**
 * 访问归因工具库
 * 处理来源识别、UTM参数解析、渠道归因等
 */

// 渠道来源枚举
export type ChannelSource =
  | "xiaohongshu"    // 小红书
  | "douyin"         // 抖音
  | "wechat_official" // 微信公众号
  | "wechat_friend"   // 微信好友
  | "wechat_group"    // 微信群
  | "wechat_moments"  // 朋友圈
  | "search"          // 搜索引擎
  | "direct"          // 直接访问
  | "offline_qr"      // 线下二维码
  | "custom"          // 自定义渠道
  | "other";          // 其他

// UTM参数结构
export interface UTMParams {
  source?: string;    // utm_source
  medium?: string;    // utm_medium
  campaign?: string;  // utm_campaign
  content?: string;   // utm_content
  term?: string;      // utm_term
}

// 归因结果
export interface AttributionResult {
  channel: ChannelSource;
  channelLabel: string;
  utm: UTMParams;
  referer: string | null;
  isPaid: boolean;     // 是否付费流量
  isSocial: boolean;    // 是否社交媒体
  isOrganic: boolean;  // 是否自然流量
}

// 渠道标签映射
const CHANNEL_LABELS: Record<ChannelSource, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat_official: "微信公众号",
  wechat_friend: "微信好友",
  wechat_group: "微信群",
  wechat_moments: "朋友圈",
  search: "搜索引擎",
  direct: "直接访问",
  offline_qr: "线下二维码",
  custom: "自定义渠道",
  other: "其他",
};

/**
 * 解析UTM参数
 */
export function parseUTMParams(searchParams: URLSearchParams): UTMParams {
  return {
    source: searchParams.get("utm_source") || undefined,
    medium: searchParams.get("utm_medium") || undefined,
    campaign: searchParams.get("utm_campaign") || undefined,
    content: searchParams.get("utm_content") || undefined,
    term: searchParams.get("utm_term") || undefined,
  };
}

/**
 * 从 referer 和 UTM 参数推断渠道
 */
export function inferChannel(
  referer: string | null,
  utm: UTMParams,
  customChannel?: string
): AttributionResult {
  // 如果有自定义渠道标签，优先使用
  if (customChannel && customChannel.trim()) {
    return {
      channel: "custom",
      channelLabel: customChannel.trim(),
      utm,
      referer,
      isPaid: false,
      isSocial: false,
      isOrganic: false,
    };
  }

  // 如果有 UTM source，优先使用
  if (utm.source) {
    const source = utm.source.toLowerCase();
    return {
      channel: mapSourceToChannel(source, utm),
      channelLabel: CHANNEL_LABELS[mapSourceToChannel(source, utm)],
      utm,
      referer,
      isPaid: utm.medium === "cpc" || utm.medium === "paid",
      isSocial: isSocialSource(source),
      isOrganic: utm.medium === "organic" || !utm.medium,
    };
  }

  // 从 referer 推断
  if (referer) {
    return {
      channel: inferChannelFromReferer(referer),
      channelLabel: CHANNEL_LABELS[inferChannelFromReferer(referer)],
      utm,
      referer,
      isPaid: false,
      isSocial: inferChannelFromReferer(referer).startsWith("wechat") ||
               inferChannelFromReferer(referer) === "xiaohongshu" ||
               inferChannelFromReferer(referer) === "douyin",
      isOrganic: inferChannelFromReferer(referer) === "search",
    };
  }

  // 默认直接访问
  return {
    channel: "direct",
    channelLabel: "直接访问",
    utm,
    referer,
    isPaid: false,
    isSocial: false,
    isOrganic: true,
  };
}

/**
 * 将 UTM source 映射到渠道枚举
 */
function mapSourceToChannel(source: string, utm: UTMParams): ChannelSource {
  // 社交媒体
  if (source.includes("xiaohongshu") || source.includes("小红书") || source.includes("xhs")) {
    return "xiaohongshu";
  }
  if (source.includes("douyin") || source.includes("抖音")) {
    return "douyin";
  }
  if (source.includes("wechat") || source.includes("微信")) {
    if (utm.medium === "official_account" || utm.medium === "公众号") {
      return "wechat_official";
    }
    if (utm.medium === "friend") {
      return "wechat_friend";
    }
    if (utm.medium === "group") {
      return "wechat_group";
    }
    if (utm.medium === "moments") {
      return "wechat_moments";
    }
    return "wechat_friend";
  }

  // 搜索引擎
  if (["google", "baidu", "bing", "sogou", "so"].some(s => source.includes(s))) {
    return "search";
  }

  // 付费
  if (utm.medium === "cpc" || utm.medium === "paid" || utm.medium === "sem") {
    return "search";
  }

  return "other";
}

/**
 * 判断是否为社交媒体来源
 */
function isSocialSource(source: string): boolean {
  const socialDomains = [
    "xiaohongshu.com", "xhs.cn", "RED.cn",
    "douyin.com", "tiktok.com",
    "weixin.qq.com", "wechat.com",
    "weibo.com", "twitter.com", "twitter.jp",
    "instagram.com", "facebook.com",
    "zhihu.com", "bilibili.com",
  ];
  try {
    const url = new URL(source.startsWith("http") ? source : `https://${source}`);
    return socialDomains.some(d => url.hostname.includes(d));
  } catch {
    return false;
  }
}

/**
 * 从 referer 推断渠道
 */
function inferChannelFromReferer(referer: string): ChannelSource {
  try {
    const url = new URL(referer);
    const hostname = url.hostname.toLowerCase();

    // 小红书
    if (hostname.includes("xiaohongshu.com") || hostname.includes("xhs.cn")) {
      return "xiaohongshu";
    }

    // 抖音
    if (hostname.includes("douyin.com") || hostname.includes("tiktok.com")) {
      return "douyin";
    }

    // 微信
    if (hostname.includes("weixin.qq.com") || hostname.includes("wechat.com")) {
      return "wechat_friend";
    }

    // 搜索引擎
    if (["google", "baidu", "bing", "sogou", "so.com"].some(s => hostname.includes(s))) {
      return "search";
    }

    // 社交媒体
    if (["weibo.com", "zhihu.com", "bilibili.com", "instagram.com", "facebook.com", "twitter.com"].some(s => hostname.includes(s))) {
      return "other";
    }

  } catch {
    // 无效 URL
  }

  return "other";
}

/**
 * 获取渠道的显示标签
 */
export function getChannelLabel(channel: ChannelSource | string): string {
  return CHANNEL_LABELS[channel as ChannelSource] || channel;
}
