export type PlatformDefinition = {
  key: string;
  name: string;
  aliases: string[];
  domains: string[];
  iconPath: string;
  enabled: boolean;
  sortOrder: number;
};

export type PlatformIcon = {
  iconType: "emoji" | "platform";
  iconValue: string;
  label: string;
};

export const PLATFORMS: PlatformDefinition[] = [
  { key: "wechat", name: "微信", aliases: ["微信", "wechat"], domains: ["weixin.qq.com", "mp.weixin.qq.com"], iconPath: "/platform-icons/wechat.svg", enabled: true, sortOrder: 1 },
  { key: "wechat-work", name: "企业微信", aliases: ["企业微信", "wework"], domains: ["work.weixin.qq.com"], iconPath: "/platform-icons/wechat-work.svg", enabled: true, sortOrder: 2 },
  { key: "qq", name: "QQ", aliases: ["qq"], domains: ["qq.com", "qzone.qq.com"], iconPath: "/platform-icons/qq.svg", enabled: true, sortOrder: 3 },
  { key: "wechat-id", name: "微信号", aliases: ["微信号"], domains: [], iconPath: "/platform-icons/wechat-id.svg", enabled: true, sortOrder: 4 },
  { key: "douyin", name: "抖音", aliases: ["抖音", "douyin"], domains: ["douyin.com", "v.douyin.com", "iesdouyin.com"], iconPath: "/platform-icons/douyin.svg", enabled: true, sortOrder: 5 },
  { key: "xiaohongshu", name: "小红书", aliases: ["小红书", "xiaohongshu"], domains: ["xiaohongshu.com", "xhslink.com"], iconPath: "/platform-icons/xiaohongshu.svg", enabled: true, sortOrder: 6 },
  { key: "kuaishou", name: "快手", aliases: ["快手", "kuaishou"], domains: ["kuaishou.com", "gifshow.com"], iconPath: "/platform-icons/kuaishou.svg", enabled: true, sortOrder: 7 },
  { key: "weibo", name: "微博", aliases: ["微博", "weibo"], domains: ["weibo.com", "weibo.cn"], iconPath: "/platform-icons/weibo.svg", enabled: true, sortOrder: 8 },
  { key: "bilibili", name: "哔哩哔哩", aliases: ["哔哩哔哩", "bilibili", "B站"], domains: ["bilibili.com", "b23.tv"], iconPath: "/platform-icons/bilibili.svg", enabled: true, sortOrder: 9 },
  { key: "zhihu", name: "知乎", aliases: ["知乎", "zhihu"], domains: ["zhihu.com"], iconPath: "/platform-icons/zhihu.svg", enabled: true, sortOrder: 10 },
  { key: "taobao", name: "淘宝", aliases: ["淘宝", "taobao"], domains: ["taobao.com", "2.taobao.com"], iconPath: "/platform-icons/taobao.svg", enabled: true, sortOrder: 11 },
  { key: "tmall", name: "天猫", aliases: ["天猫", "tmall"], domains: ["tmall.com"], iconPath: "/platform-icons/tmall.svg", enabled: true, sortOrder: 12 },
  { key: "jd", name: "京东", aliases: ["京东", "jd"], domains: ["jd.com"], iconPath: "/platform-icons/jd.svg", enabled: true, sortOrder: 13 },
  { key: "pinduoduo", name: "拼多多", aliases: ["拼多多", "pinduoduo"], domains: ["pinduoduo.com", "yangkeduo.com"], iconPath: "/platform-icons/pinduoduo.svg", enabled: true, sortOrder: 14 },
  { key: "xianyu", name: "闲鱼", aliases: ["闲鱼", "xianyu"], domains: ["2.taobao.com", "goofish.com"], iconPath: "/platform-icons/xianyu.svg", enabled: true, sortOrder: 15 },
  { key: "meituan", name: "美团", aliases: ["美团", "meituan"], domains: ["meituan.com"], iconPath: "/platform-icons/meituan.svg", enabled: true, sortOrder: 16 },
  { key: "dianping", name: "大众点评", aliases: ["大众点评", "dianping"], domains: ["dianping.com"], iconPath: "/platform-icons/dianping.svg", enabled: true, sortOrder: 17 },
  { key: "alipay", name: "支付宝", aliases: ["支付宝", "alipay"], domains: ["alipay.com"], iconPath: "/platform-icons/alipay.svg", enabled: true, sortOrder: 18 },
  { key: "amap", name: "高德地图", aliases: ["高德地图", "amap", "gaode"], domains: ["amap.com", "gaode.com"], iconPath: "/platform-icons/amap.svg", enabled: true, sortOrder: 19 },
  { key: "baidu-map", name: "百度地图", aliases: ["百度地图", "baidu map"], domains: ["map.baidu.com"], iconPath: "/platform-icons/baidu-map.svg", enabled: true, sortOrder: 20 },
  { key: "dingtalk", name: "钉钉", aliases: ["钉钉", "dingtalk"], domains: ["dingtalk.com"], iconPath: "/platform-icons/dingtalk.svg", enabled: true, sortOrder: 21 },
  { key: "feishu", name: "飞书", aliases: ["飞书", "feishu", "lark"], domains: ["feishu.cn", "larksuite.com"], iconPath: "/platform-icons/feishu.svg", enabled: true, sortOrder: 22 },
  { key: "github", name: "GitHub", aliases: ["github"], domains: ["github.com", "github.io"], iconPath: "/platform-icons/github.svg", enabled: true, sortOrder: 23 },
  { key: "gitee", name: "Gitee", aliases: ["gitee", "码云"], domains: ["gitee.com"], iconPath: "/platform-icons/gitee.svg", enabled: true, sortOrder: 24 },
  { key: "phone", name: "电话", aliases: ["电话", "phone"], domains: [], iconPath: "/platform-icons/phone.svg", enabled: true, sortOrder: 25 },
  { key: "email", name: "邮箱", aliases: ["邮箱", "email", "mail"], domains: [], iconPath: "/platform-icons/email.svg", enabled: true, sortOrder: 26 },
  { key: "address", name: "地址", aliases: ["地址", "address"], domains: [], iconPath: "/platform-icons/address.svg", enabled: true, sortOrder: 27 },
  { key: "website", name: "通用网站", aliases: ["网站", "website"], domains: [], iconPath: "/platform-icons/website.svg", enabled: true, sortOrder: 99 },
];

const PLATFORM_EMOJI_FALLBACK: Record<string, string> = {
  wechat: "💬",
  "wechat-work": "🏢",
  qq: "🐧",
  "wechat-id": "💬",
  douyin: "🎵",
  xiaohongshu: "📕",
  kuaishou: "🎬",
  weibo: "📢",
  bilibili: "📺",
  zhihu: "❓",
  taobao: "🛒",
  tmall: "🛍️",
  jd: "📦",
  pinduoduo: "🏪",
  xianyu: "♻️",
  meituan: "🍜",
  dianping: "⭐",
  alipay: "💳",
  amap: "📍",
  "baidu-map": "🗺️",
  dingtalk: "🔔",
  feishu: "🐦",
  github: "💻",
  gitee: "🇨🇳",
  phone: "☎️",
  email: "📧",
  address: "🏠",
  website: "🔗",
};

export const DEFAULT_LINK_ICON: PlatformIcon = {
  iconType: "platform",
  iconValue: "website",
  label: "默认链接",
};

export function getPlatformByKey(key: string): PlatformDefinition | undefined {
  return PLATFORMS.find((p) => p.key === key);
}

export function getPlatformIconUrl(key: string): string {
  const platform = getPlatformByKey(key);
  return platform?.iconPath || "/platform-icons/website.svg";
}

export function getPlatformEmoji(key: string): string {
  return PLATFORM_EMOJI_FALLBACK[key] || "🔗";
}

export function detectPlatformFromUrl(url: string): PlatformDefinition | undefined {
  if (!url) return undefined;

  let hostname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    hostname = url.toLowerCase();
  }

  for (const platform of PLATFORMS) {
    if (!platform.enabled) continue;

    for (const domain of platform.domains) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return platform;
      }
    }

    for (const alias of platform.aliases) {
      if (url.toLowerCase().includes(alias.toLowerCase())) {
        return platform;
      }
    }
  }

  return undefined;
}

export function getDefaultIconForUrl(url: string): PlatformIcon {
  const platform = detectPlatformFromUrl(url);
  if (platform) {
    return { iconType: "platform", iconValue: platform.key, label: platform.name };
  }
  return DEFAULT_LINK_ICON;
}

export function searchPlatforms(query: string): PlatformDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return PLATFORMS.filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  return PLATFORMS.filter((p) => {
    if (!p.enabled) return false;
    return (
      p.key.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.aliases.some((a) => a.toLowerCase().includes(q)) ||
      p.domains.some((d) => d.toLowerCase().includes(q))
    );
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllPlatformIcons(): PlatformIcon[] {
  return PLATFORMS.filter((p) => p.enabled).map((p) => ({
    iconType: "platform" as const,
    iconValue: p.key,
    label: p.name,
  }));
}