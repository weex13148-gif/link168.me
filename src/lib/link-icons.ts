export type PlatformIcon = {
  iconType: "emoji";
  iconValue: string;
  label: string;
};

const PLATFORM_ICONS: Array<{ patterns: RegExp[]; icon: PlatformIcon }> = [
  {
    patterns: [/weixin\.qq\.com/i, /mp\.weixin\.qq\.com/i, /wechat/i, /微信/i],
    icon: { iconType: "emoji", iconValue: "💬", label: "微信" },
  },
  {
    patterns: [/weibo\.com/i, /weibo\.cn/i, /微博/i],
    icon: { iconType: "emoji", iconValue: "📢", label: "微博" },
  },
  {
    patterns: [/douyin\.com/i, /iesdouyin\.com/i, /抖音/i],
    icon: { iconType: "emoji", iconValue: "🎵", label: "抖音" },
  },
  {
    patterns: [/xiaohongshu\.com/i, /xhslink\.com/i, /小红书/i],
    icon: { iconType: "emoji", iconValue: "📕", label: "小红书" },
  },
  {
    patterns: [/bilibili\.com/i, /b23\.tv/i, /B站/i, /哔哩哔哩/i],
    icon: { iconType: "emoji", iconValue: "📺", label: "B站" },
  },
  {
    patterns: [/zhihu\.com/i, /知乎/i],
    icon: { iconType: "emoji", iconValue: "❓", label: "知乎" },
  },
  {
    patterns: [/github\.com/i, /github\.io/i],
    icon: { iconType: "emoji", iconValue: "💻", label: "GitHub" },
  },
  {
    patterns: [/taobao\.com/i, /tmall\.com/i, /淘宝/i, /天猫/i],
    icon: { iconType: "emoji", iconValue: "🛒", label: "淘宝/天猫" },
  },
  {
    patterns: [/jd\.com/i, /京东/i],
    icon: { iconType: "emoji", iconValue: "📦", label: "京东" },
  },
  {
    patterns: [/pinduoduo\.com/i, /yangkeduo\.com/i, /拼多多/i],
    icon: { iconType: "emoji", iconValue: "🏪", label: "拼多多" },
  },
  {
    patterns: [/meituan\.com/i, /美团/i],
    icon: { iconType: "emoji", iconValue: "🍜", label: "美团" },
  },
  {
    patterns: [/dianping\.com/i, /大众点评/i],
    icon: { iconType: "emoji", iconValue: "⭐", label: "大众点评" },
  },
  {
    patterns: [/baidu\.com/i, /百度/i],
    icon: { iconType: "emoji", iconValue: "🔍", label: "百度" },
  },
  {
    patterns: [/amap\.com/i, /gaode\.com/i, /高德/i],
    icon: { iconType: "emoji", iconValue: "📍", label: "高德地图" },
  },
  {
    patterns: [/v\.qq\.com/i, /腾讯视频/i],
    icon: { iconType: "emoji", iconValue: "🎬", label: "腾讯视频" },
  },
  {
    patterns: [/iqiyi\.com/i, /爱奇艺/i],
    icon: { iconType: "emoji", iconValue: "🎞️", label: "爱奇艺" },
  },
  {
    patterns: [/youku\.com/i, /优酷/i],
    icon: { iconType: "emoji", iconValue: "🎥", label: "优酷" },
  },
  {
    patterns: [/mp\.weixin\.qq\.com/i, /公众号/i],
    icon: { iconType: "emoji", iconValue: "📰", label: "公众号" },
  },
  {
    patterns: [/channels\.weixin\.qq\.com/i, /视频号/i],
    icon: { iconType: "emoji", iconValue: "📹", label: "视频号" },
  },
  {
    patterns: [/miniprogram/i, /小程序/i],
    icon: { iconType: "emoji", iconValue: "🧩", label: "小程序" },
  },
  {
    patterns: [/work\.weixin\.qq\.com/i, /企业微信/i, /wework/i],
    icon: { iconType: "emoji", iconValue: "🏢", label: "企业微信" },
  },
  {
    patterns: [/dingtalk\.com/i, /钉钉/i],
    icon: { iconType: "emoji", iconValue: "🔔", label: "钉钉" },
  },
  {
    patterns: [/feishu\.cn/i, /larksuite\.com/i, /飞书/i, /lark/i],
    icon: { iconType: "emoji", iconValue: "🐦", label: "飞书" },
  },
  {
    patterns: [/slack\.com/i],
    icon: { iconType: "emoji", iconValue: "💼", label: "Slack" },
  },
  {
    patterns: [/twitter\.com/i, /x\.com/i, /t\.co/i],
    icon: { iconType: "emoji", iconValue: "🐦", label: "Twitter/X" },
  },
  {
    patterns: [/facebook\.com/i, /fb\.com/i],
    icon: { iconType: "emoji", iconValue: "👤", label: "Facebook" },
  },
  {
    patterns: [/instagram\.com/i, /instagr\.am/i],
    icon: { iconType: "emoji", iconValue: "📷", label: "Instagram" },
  },
  {
    patterns: [/linkedin\.com/i],
    icon: { iconType: "emoji", iconValue: "💼", label: "LinkedIn" },
  },
  {
    patterns: [/youtube\.com/i, /youtu\.be/i],
    icon: { iconType: "emoji", iconValue: "▶️", label: "YouTube" },
  },
  {
    patterns: [/whatsapp\.com/i, /wa\.me/i],
    icon: { iconType: "emoji", iconValue: "💚", label: "WhatsApp" },
  },
  {
    patterns: [/telegram\.org/i, /t\.me/i],
    icon: { iconType: "emoji", iconValue: "✈️", label: "Telegram" },
  },
];

export const DEFAULT_LINK_ICON: PlatformIcon = {
  iconType: "emoji",
  iconValue: "🔗",
  label: "默认链接",
};

export function getDefaultIconForUrl(url: string): PlatformIcon {
  if (!url) return DEFAULT_LINK_ICON;

  let hostname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    hostname = url.toLowerCase();
  }

  for (const platform of PLATFORM_ICONS) {
    for (const pattern of platform.patterns) {
      if (pattern.test(hostname) || pattern.test(url)) {
        return platform.icon;
      }
    }
  }

  return DEFAULT_LINK_ICON;
}

export function getAllPlatformIcons(): PlatformIcon[] {
  return PLATFORM_ICONS.map((p) => p.icon);
}
