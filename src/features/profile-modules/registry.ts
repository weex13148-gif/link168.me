import type { ProfileModuleDefinition, ProfileModuleType, ProfileModuleCategory } from "./types";

const MODULES: ProfileModuleDefinition[] = [
  {
    type: "link",
    label: "普通链接",
    description: "添加外部链接按钮",
    iconName: "Link",
    category: "basic",
    free: true,
  },
  {
    type: "text",
    label: "纯文本说明",
    description: "展示一段文字",
    iconName: "FileText",
    category: "content",
    free: true,
  },
  {
    type: "group-title",
    label: "内容分组",
    description: "为内容添加分组标题",
    iconName: "Hash",
    category: "content",
    free: true,
  },
  {
    type: "qr",
    label: "二维码",
    description: "展示扫码二维码",
    iconName: "QrCode",
    category: "basic",
    free: true,
  },
  {
    type: "wechat",
    label: "微信号",
    description: "展示并复制微信号",
    iconName: "MessageCircle",
    category: "contact",
    free: true,
  },
  {
    type: "phone",
    label: "电话拨号",
    description: "点击直接拨打电话",
    iconName: "Phone",
    category: "contact",
    free: true,
  },
  {
    type: "shop",
    label: "商品服务",
    description: "展示商品或服务卡片",
    iconName: "ShoppingBag",
    category: "commerce",
    free: false,
  },
  {
    type: "product-card",
    label: "产品卡片",
    description: "展示产品信息并收集咨询线索",
    iconName: "Package",
    category: "commerce",
    free: true,
  },
  {
    type: "service-card",
    label: "服务卡片",
    description: "展示服务信息并支持咨询或预约",
    iconName: "ConciergeBell",
    category: "commerce",
    free: true,
  },
  {
    type: "offer",
    label: "优惠活动",
    description: "展示优惠或报价咨询入口",
    iconName: "Gift",
    category: "commerce",
    free: true,
  },
  {
    type: "booking",
    label: "在线预约",
    description: "接受预约咨询",
    iconName: "Calendar",
    category: "commerce",
    free: true,
  },
  {
    type: "quote",
    label: "报价咨询",
    description: "接受报价咨询并生成线索",
    iconName: "ClipboardList",
    category: "commerce",
    free: true,
  },
  {
    type: "contact-form",
    label: "联系表单",
    description: "收集客户联系信息",
    iconName: "FileEdit",
    category: "contact",
    free: true,
  },
  {
    type: "map",
    label: "地图位置",
    description: "展示门店或地址",
    iconName: "MapPin",
    category: "contact",
    free: true,
  },
  {
    type: "copy-text",
    label: "复制文本",
    description: "一键复制指定文本",
    iconName: "Copy",
    category: "basic",
    free: true,
  },
  {
    type: "divider",
    label: "分隔线",
    description: "在内容之间添加分隔",
    iconName: "Minus",
    category: "other",
    free: true,
  },
  {
    type: "cover-image",
    label: "图片",
    description: "展示单张图片",
    iconName: "Image",
    category: "image",
    free: false,
  },
  {
    type: "popup-image",
    label: "弹窗图片",
    description: "缩略图点击放大查看",
    iconName: "Maximize2",
    category: "image",
    free: false,
  },
  {
    type: "carousel",
    label: "图片轮播",
    description: "多张图片轮播展示",
    iconName: "Images",
    category: "image",
    free: false,
  },
  {
    type: "bilibili-video",
    label: "Bilibili 视频",
    description: "嵌入哔哩哔哩视频",
    iconName: "Play",
    category: "video",
    free: false,
  },
  {
    type: "youtube-video",
    label: "YouTube 视频",
    description: "嵌入 YouTube 视频",
    iconName: "Play",
    category: "video",
    free: false,
  },
  {
    type: "video-link",
    label: "视频链接",
    description: "通用视频链接展示",
    iconName: "Video",
    category: "video",
    free: false,
  },
  {
    type: "netease-music",
    label: "网易云音乐",
    description: "嵌入网易云音乐歌曲",
    iconName: "Music",
    category: "audio",
    free: false,
  },
  {
    type: "music-link",
    label: "音乐链接",
    description: "通用音乐链接展示",
    iconName: "Music2",
    category: "audio",
    free: false,
  },
  {
    type: "ai-chat",
    label: "AI 接待助手",
    description: "添加 AI 智能对话窗口",
    iconName: "Bot",
    category: "ai",
    free: false,
  },
];

const MODULE_MAP = new Map<ProfileModuleType, ProfileModuleDefinition>(
  MODULES.map((m) => [m.type, m])
);

export function getModuleDefinition(type: string): ProfileModuleDefinition | undefined {
  return MODULE_MAP.get(type as ProfileModuleType);
}

export function listModulesByCategory(): Record<ProfileModuleCategory, ProfileModuleDefinition[]> {
  const result = {} as Record<ProfileModuleCategory, ProfileModuleDefinition[]>;
  for (const mod of MODULES) {
    if (!result[mod.category]) {
      result[mod.category] = [];
    }
    result[mod.category].push(mod);
  }
  return result;
}

export function listFreeModules(): ProfileModuleDefinition[] {
  return MODULES.filter((m) => m.free);
}

export function listAllModules(): ProfileModuleDefinition[] {
  return [...MODULES];
}
