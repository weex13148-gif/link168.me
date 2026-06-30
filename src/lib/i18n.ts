export const SUPPORTED_LANGUAGES = ["zh", "en", "ja"] as const;
export const DEFAULT_LANGUAGE = "zh";

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

type TranslationKey =
  | "theme"
  | "links"
  | "stats"
  | "createHomepage"
  | "appearance"
  | "language"
  | "myAccount"
  | "shareHomepage"
  | "shareTip"
  | "copyLink"
  | "qrCode"
  | "preview"
  | "totalClicks"
  | "totalLinks"
  | "today"
  | "last7Days"
  | "byDevice"
  | "topLinks"
  | "shortLinks"
  | "createShortLink"
  | "targetUrl"
  | "customSlug"
  | "yourLinks"
  | "slug"
  | "visits"
  | "createdAt"
  | "delete"
  | "profileName"
  | "bio"
  | "avatar"
  | "upload"
  | "addLink"
  | "linkTitle"
  | "linkUrl"
  | "linkIcon"
  | "defaultIcon"
  | "emoji"
  | "customImage"
  | "save"
  | "cancel"
  | "close"
  | "edit"
  | "publicPage"
  | "backToTop"
  | "poweredBy"
  | "customTheme"
  | "bgColor"
  | "cardColor"
  | "textColor"
  | "accentColor"
  | "linkColor"
  | "linkText"
  | "footerText"
  | "vipRequired"
  | "previewLive";

type TranslationRecord = Record<TranslationKey, string>;

export const translations: Record<Language, TranslationRecord> = {
  zh: {
    theme: "主题",
    links: "链接",
    stats: "数据统计",
    createHomepage: "主页制作",
    appearance: "外观设置",
    language: "语言",
    myAccount: "我的",
    shareHomepage: "分享主页",
    shareTip: "把你的主页链接分享给朋友",
    copyLink: "复制链接",
    qrCode: "二维码",
    preview: "预览",
    totalClicks: "总点击量",
    totalLinks: "链接总数",
    today: "今日点击",
    last7Days: "近7天点击",
    byDevice: "按设备分布",
    topLinks: "热门链接",
    shortLinks: "短码管理",
    createShortLink: "创建短码",
    targetUrl: "目标URL",
    customSlug: "自定义短码(可选)",
    yourLinks: "我的短码",
    slug: "短码",
    visits: "访问量",
    createdAt: "创建时间",
    delete: "删除",
    profileName: "昵称",
    bio: "简介",
    avatar: "头像",
    upload: "上传",
    addLink: "添加链接",
    linkTitle: "链接标题",
    linkUrl: "链接地址",
    linkIcon: "链接图标",
    defaultIcon: "默认图标",
    emoji: "Emoji 图标",
    customImage: "自定义图片",
    save: "保存",
    cancel: "取消",
    close: "关闭",
    edit: "编辑",
    publicPage: "公开主页",
    backToTop: "返回首页",
    poweredBy: "由 Link168 提供支持",
    customTheme: "自定义主题",
    bgColor: "背景色",
    cardColor: "卡片色",
    textColor: "文字色",
    accentColor: "强调色",
    linkColor: "按钮色",
    linkText: "按钮文字色",
    footerText: "底部文字色",
    vipRequired: "会员专享",
    previewLive: "实时预览",
  },
  en: {
    theme: "Theme",
    links: "Links",
    stats: "Analytics",
    createHomepage: "Create Homepage",
    appearance: "Appearance",
    language: "Language",
    myAccount: "My Account",
    shareHomepage: "Share Homepage",
    shareTip: "Share your homepage with friends",
    copyLink: "Copy Link",
    qrCode: "QR Code",
    preview: "Preview",
    totalClicks: "Total Clicks",
    totalLinks: "Total Links",
    today: "Today",
    last7Days: "Last 7 Days",
    byDevice: "By Device",
    topLinks: "Top Links",
    shortLinks: "Short Links",
    createShortLink: "Create Short Link",
    targetUrl: "Target URL",
    customSlug: "Custom Slug (optional)",
    yourLinks: "Your Links",
    slug: "Slug",
    visits: "Visits",
    createdAt: "Created",
    delete: "Delete",
    profileName: "Display Name",
    bio: "Bio",
    avatar: "Avatar",
    upload: "Upload",
    addLink: "Add Link",
    linkTitle: "Link Title",
    linkUrl: "Link URL",
    linkIcon: "Link Icon",
    defaultIcon: "Default Icon",
    emoji: "Emoji Icon",
    customImage: "Custom Image",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    publicPage: "Public Page",
    backToTop: "Back to Top",
    poweredBy: "Link168.me",
    customTheme: "Custom Theme",
    bgColor: "Background",
    cardColor: "Card",
    textColor: "Text",
    accentColor: "Accent",
    linkColor: "Button",
    linkText: "Button Text",
    footerText: "Footer Text",
    vipRequired: "VIP Only",
    previewLive: "Live Preview",
  },
  ja: {
    theme: "テーマ",
    links: "リンク",
    stats: "データ",
    createHomepage: "ホームページ作成",
    appearance: "外観設定",
    language: "言語",
    myAccount: "アカウント",
    shareHomepage: "ホームページをシェア",
    shareTip: "あなたのホームページを友達にシェアしよう",
    copyLink: "リンクをコピー",
    qrCode: "QRコード",
    preview: "プレビュー",
    totalClicks: "総クリック数",
    totalLinks: "リンク数",
    today: "今日のクリック",
    last7Days: "過去7日間",
    byDevice: "デバイス別",
    topLinks: "人気リンク",
    shortLinks: "短縮URL",
    createShortLink: "短縮URL作成",
    targetUrl: "リンク先URL",
    customSlug: "カスタムスラッグ（任意）",
    yourLinks: "あなたの短縮URL",
    slug: "スラッグ",
    visits: "アクセス数",
    createdAt: "作成日時",
    delete: "削除",
    profileName: "名前",
    bio: "自己紹介",
    avatar: "アバター",
    upload: "アップロード",
    addLink: "リンク追加",
    linkTitle: "リンクタイトル",
    linkUrl: "リンクURL",
    linkIcon: "リンクアイコン",
    defaultIcon: "デフォルトアイコン",
    emoji: "絵文字",
    customImage: "カスタム画像",
    save: "保存",
    cancel: "キャンセル",
    close: "閉じる",
    edit: "編集",
    publicPage: "公開ページ",
    backToTop: "トップへ戻る",
    poweredBy: "Link168 提供",
    customTheme: "カスタムテーマ",
    bgColor: "背景色",
    cardColor: "カード色",
    textColor: "文字色",
    accentColor: "アクセント色",
    linkColor: "ボタン色",
    linkText: "ボタン文字色",
    footerText: "フッター文字色",
    vipRequired: "VIP限定",
    previewLive: "ライブプレビュー",
  },
};

export function getTranslation(lang: string | null | undefined): TranslationRecord {
  if (lang && lang in translations) {
    return translations[lang as Language];
  }
  return translations[DEFAULT_LANGUAGE];
}
