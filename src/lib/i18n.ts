export const SUPPORTED_LANGUAGES = ["zh", "en"] as const;
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
  | "previewLive"
  | "analytics"
  | "dataCenter"
  | "profileViews"
  | "uniqueVisitors"
  | "clickRate"
  | "dailyTrend"
  | "weeklyTrend"
  | "noData"
  | "loadingData"
  | "company"
  | "jobTitle"
  | "phone"
  | "email"
  | "wechat"
  | "address"
  | "website"
  | "saveToContacts"
  | "copyWechat"
  | "phoneCall"
  | "emailUs"
  | "addModule"
  | "basicModules"
  | "contactModules"
  | "contentModules"
  | "commerceModules"
  | "externalLink"
  | "textContent"
  | "groupTitle"
  | "wechatOfficial"
  | "phoneNumber"
  | "productService"
  | "onlineBooking"
  | "mapLocation"
  | "memberOnly"
  | "aiAssistant"
  | "customerService"
  | "salesAgent"
  | "aiReception"
  | "leaveMessage"
  | "contactPerson"
  | "sendMessage"
  | "confirm"
  | "deleteConfirm"
  | "areYouSure"
  | "deleteWarning"
  | "success"
  | "error"
  | "pleaseFill"
  | "required";

type TranslationRecord = Record<TranslationKey, string>;

export const translations: Record<string, TranslationRecord> = {
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
    analytics: "数据分析",
    dataCenter: "数据中心",
    profileViews: "主页访问",
    uniqueVisitors: "独立访客",
    clickRate: "点击率",
    dailyTrend: "每日趋势",
    weeklyTrend: "周趋势",
    noData: "暂无数据",
    loadingData: "加载数据中",
    company: "公司",
    jobTitle: "职位",
    phone: "电话",
    email: "邮箱",
    wechat: "微信",
    address: "地址",
    website: "网站",
    saveToContacts: "保存到通讯录",
    copyWechat: "复制微信号",
    phoneCall: "拨打电话",
    emailUs: "发送邮件",
    addModule: "添加模块",
    basicModules: "基础模块",
    contactModules: "联系模块",
    contentModules: "内容模块",
    commerceModules: "商业模块",
    externalLink: "外部链接",
    textContent: "文字内容",
    groupTitle: "分组标题",
    wechatOfficial: "微信公众号",
    phoneNumber: "电话号码",
    productService: "产品服务",
    onlineBooking: "在线预约",
    mapLocation: "地图位置",
    memberOnly: "会员专享",
    aiAssistant: "AI 助手",
    customerService: "客服助手",
    salesAgent: "销售助手",
    aiReception: "AI 接待",
    leaveMessage: "留言",
    contactPerson: "联系人",
    sendMessage: "发送消息",
    confirm: "确认",
    deleteConfirm: "确认删除",
    areYouSure: "确定要执行此操作吗？",
    deleteWarning: "此操作无法撤销",
    success: "成功",
    error: "错误",
    pleaseFill: "请填写",
    required: "必填",
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
    analytics: "Analytics",
    dataCenter: "Data Center",
    profileViews: "Profile Views",
    uniqueVisitors: "Unique Visitors",
    clickRate: "Click Rate",
    dailyTrend: "Daily Trend",
    weeklyTrend: "Weekly Trend",
    noData: "No Data",
    loadingData: "Loading Data",
    company: "Company",
    jobTitle: "Job Title",
    phone: "Phone",
    email: "Email",
    wechat: "WeChat",
    address: "Address",
    website: "Website",
    saveToContacts: "Save to Contacts",
    copyWechat: "Copy WeChat",
    phoneCall: "Call",
    emailUs: "Email Us",
    addModule: "Add Module",
    basicModules: "Basic Modules",
    contactModules: "Contact Modules",
    contentModules: "Content Modules",
    commerceModules: "Commerce Modules",
    externalLink: "External Link",
    textContent: "Text Content",
    groupTitle: "Group Title",
    wechatOfficial: "WeChat Official",
    phoneNumber: "Phone Number",
    productService: "Product Service",
    onlineBooking: "Online Booking",
    mapLocation: "Map Location",
    memberOnly: "Members Only",
    aiAssistant: "AI Assistant",
    customerService: "Customer Service",
    salesAgent: "Sales Agent",
    aiReception: "AI Reception",
    leaveMessage: "Leave Message",
    contactPerson: "Contact Person",
    sendMessage: "Send Message",
    confirm: "Confirm",
    deleteConfirm: "Confirm Delete",
    areYouSure: "Are you sure?",
    deleteWarning: "This action cannot be undone",
    success: "Success",
    error: "Error",
    pleaseFill: "Please fill",
    required: "Required",
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
    analytics: "分析",
    dataCenter: "データセンター",
    profileViews: "プロフィール閲覧",
    uniqueVisitors: "ユニークビジター",
    clickRate: "クリック率",
    dailyTrend: "日次トレンド",
    weeklyTrend: "週次トレンド",
    noData: "データなし",
    loadingData: "データ読み込み中",
    company: "会社",
    jobTitle: "職位",
    phone: "電話",
    email: "メール",
    wechat: "微信",
    address: "住所",
    website: "ウェブサイト",
    saveToContacts: "連絡先に保存",
    copyWechat: "微信IDをコピー",
    phoneCall: "電話をかける",
    emailUs: "メールを送信",
    addModule: "モジュール追加",
    basicModules: "基本モジュール",
    contactModules: "連絡先モジュール",
    contentModules: "コンテンツモジュール",
    commerceModules: "商業モジュール",
    externalLink: "外部リンク",
    textContent: "テキストコンテンツ",
    groupTitle: "グループタイトル",
    wechatOfficial: "微信公式アカウント",
    phoneNumber: "電話番号",
    productService: "製品サービス",
    onlineBooking: "オンライン予約",
    mapLocation: "地図位置",
    memberOnly: "メンバー限定",
    aiAssistant: "AIアシスタント",
    customerService: "カスタマーサービス",
    salesAgent: "セールスエージェント",
    aiReception: "AI受付",
    leaveMessage: "メッセージを残す",
    contactPerson: "連絡担当者",
    sendMessage: "メッセージを送信",
    confirm: "確認",
    deleteConfirm: "削除確認",
    areYouSure: "本当によろしいですか？",
    deleteWarning: "この操作は元に戻せません",
    success: "成功",
    error: "エラー",
    pleaseFill: "入力してください",
    required: "必須",
  },
};

export function getTranslation(lang: string | null | undefined): TranslationRecord {
  if (lang && lang in translations) {
    return translations[lang as Language];
  }
  return translations[DEFAULT_LANGUAGE];
}

export type { TranslationKey, TranslationRecord };
