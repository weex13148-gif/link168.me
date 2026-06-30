import { PreviewShell, type PreviewShellVariant } from "@/components/preview/PreviewShell";
import {
  SharePageRenderer,
  type SharePageTemplate,
  type SharePageLink,
} from "@/components/share/SharePageRenderer";

export type PhonePreviewLink = {
  id?: string;
  title?: string | null;
  description?: string | null;
  label?: string | null;
  caption?: string | null;
  url?: string | null;
  href?: string | null;
  icon?: string | null;
  type?: string | null;
  isActive?: boolean;
};

export type PhonePreviewAppearance = {
  surfaceClassName?: string;
  cardClassName?: string;
  linkClassName?: string;
  template?: SharePageTemplate;
  themeName?: string | null;
  // 向后兼容：后台 dashboard 仍会传入以下字段，新的渲染器已不再使用它们
  nameStyle?: unknown;
  bioStyle?: unknown;
  linkStyle?: unknown;
  linkAlign?: unknown;
  linkIcon?: unknown;
  showSearch?: unknown;
  showPowered?: unknown;
};

type PhonePreviewProps = {
  variant?: PreviewShellVariant;
  poweredLogoClickable?: boolean;
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  links?: PhonePreviewLink[];
  appearance?: PhonePreviewAppearance;
  className?: string;
};

const defaultLinks: PhonePreviewLink[] = [
  { id: "wechat", label: "微信公众号", caption: "最新文章和观点", url: null },
  { id: "rednote", label: "小红书", caption: "生活方式和灵感", url: null },
  { id: "douyin", label: "抖音", caption: "短视频内容合集", url: null },
  { id: "channels", label: "视频号", caption: "直播和视频动态", url: null },
  { id: "site", label: "我的网站", caption: "作品、服务和介绍", url: null },
  { id: "shop", label: "商品橱窗", caption: "精选商品入口", url: null },
];

export function PhonePreview({
  variant = "marketing",
  poweredLogoClickable: _poweredLogoClickable,
  username = "yourname",
  displayName,
  bio,
  avatarUrl,
  links = defaultLinks,
  appearance,
  className = "",
}: PhonePreviewProps) {
  const activeLinks: SharePageLink[] = links
    .filter((link) => link.isActive !== false)
    .map((link, idx) => ({
      id: link.id || `link-${idx}`,
      title: (link.label || link.title || "链接") as string,
      description: link.caption || link.description || null,
      url: link.href || link.url || null,
      icon: link.icon || null,
      type: link.type || null,
    }));
  const name = displayName || "Link168 名片";

  return (
    <PreviewShell
      variant={variant}
      className={className}
      surfaceClassName={appearance?.surfaceClassName}
    >
      <SharePageRenderer
        template={appearance?.template || "business"}
        username={username}
        displayName={name}
        bio={bio}
        avatarUrl={avatarUrl}
        links={activeLinks}
        themeName={appearance?.themeName}
        surfaceClassName={appearance?.surfaceClassName}
        cardClassName={appearance?.cardClassName}
        linkClassName={appearance?.linkClassName}
        showBrandFoot
      />
    </PreviewShell>
  );
}
