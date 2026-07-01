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
  { id: "wechat", label: "微信公众号", caption: "最新文章和观点" },
  { id: "rednote", label: "小红书", caption: "生活方式和灵感" },
  { id: "douyin", label: "抖音", caption: "短视频内容合集" },
  { id: "site", label: "我的网站", caption: "作品、服务和介绍" },
];

export function PhonePreview({
  variant = "marketing",
  poweredLogoClickable: _poweredLogoClickable,
  username = "abao",
  displayName,
  bio,
  avatarUrl,
  links = defaultLinks,
  appearance,
  className = "",
}: PhonePreviewProps) {
  // 首页和注册页只是产品样机，不应因为示例链接没有真实目标而显示红色风控提示。
  // 真实公开主页仍必须通过服务端与渲染器的 URL 校验。
  const exampleFallbackUrl = variant === "public" ? null : "https://link168.me";

  const activeLinks: SharePageLink[] = links
    .filter((link) => link.isActive !== false)
    .map((link, index) => ({
      id: link.id || `link-${index}`,
      title: (link.label || link.title || "链接") as string,
      description: link.caption || link.description || null,
      url: link.href || link.url || exampleFallbackUrl,
      icon: link.icon || null,
      type: link.type || null,
    }));

  return (
    <PreviewShell
      variant={variant}
      className={className}
      surfaceClassName={appearance?.surfaceClassName}
    >
      <SharePageRenderer
        template={appearance?.template || "business"}
        username={username}
        displayName={displayName || "阿宝的名片"}
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
