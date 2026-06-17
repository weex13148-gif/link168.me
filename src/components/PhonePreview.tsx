import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Globe, Search, Share2 } from "lucide-react";

export type PhonePreviewVariant = "marketing" | "auth" | "public";

export type PhonePreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

export type PhonePreviewAppearance = {
  surfaceClassName?: string;
  cardClassName?: string;
  linkClassName?: string;
  nameStyle?: CSSProperties;
  bioStyle?: CSSProperties;
  linkStyle?: CSSProperties;
  linkAlign?: "left" | "center" | "right";
  linkIcon?: "arrow" | "share" | "hidden";
  showSearch?: boolean;
  showPowered?: boolean;
};

type PhonePreviewProps = {
  variant?: PhonePreviewVariant;
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
  { id: "channels", label: "视频号", caption: "直播和视频动态" },
  { id: "site", label: "我的网站", caption: "作品、服务和介绍" },
  { id: "shop", label: "商品橱窗", caption: "精选商品入口" },
  { id: "booking", label: "预约咨询", caption: "快速预约时间" },
  { id: "service", label: "微信客服", caption: "一对一沟通" },
  { id: "email", label: "官方邮箱", caption: "商务合作联系" },
];

const shellByVariant: Record<PhonePreviewVariant, string> = {
  marketing: "shadow-[0_28px_90px_rgba(86,68,46,0.22)]",
  auth: "shadow-[0_22px_60px_rgba(86,68,46,0.16)]",
  public: "shadow-[0_20px_70px_rgba(86,68,46,0.18)]",
};

const alignByValue: Record<NonNullable<PhonePreviewAppearance["linkAlign"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function PhonePreview({
  variant = "marketing",
  poweredLogoClickable = true,
  username = "yourname",
  displayName,
  bio,
  avatarUrl,
  links = defaultLinks,
  appearance,
  className = "",
}: PhonePreviewProps) {
  const activeLinks = links.filter((link) => link.isActive !== false);
  const name = displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const profileBio = bio || "一个人，一个链接，连接全网";
  const linkAlign = appearance?.linkAlign || "left";
  const showPowered = appearance?.showPowered !== false;

  const footer = (
    <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-[10px] font-semibold tracking-wide text-[#A69A8A]">
      <Image src="/brand/link168-logo.png" alt="Link168" width={1536} height={864} className="h-3.5 w-auto object-contain opacity-90" />
      <span>Powered by Link168</span>
    </div>
  );

  return (
    <div
      className={`phone-preview link168-phone-shell mx-auto w-full max-w-[390px] p-2.5 ${shellByVariant[variant]} ${className}`}
    >
      <div className={`link168-phone-screen flex h-full flex-col overflow-hidden ${appearance?.surfaceClassName || "bg-[#F7F1E7]"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#E8DCCB]/70 px-4 py-3 text-[#2B241E]">
          <span className="text-xs font-black">9:41</span>
          <div className="h-1.5 w-20 rounded-full bg-[#2B241E]/10" />
          <span className="text-xs font-black">5G</span>
        </div>

        <div className="phone-preview-scroll flex-1 overflow-y-auto px-4 pb-5 pt-6 text-[#2B241E]">
          {appearance?.showSearch ? (
            <div className="mb-3 flex min-h-10 items-center gap-2 rounded-2xl bg-[#FFFDF8]/86 px-3 text-xs font-bold text-[#7A6D5E] shadow-sm">
              <Search aria-hidden className="size-4 text-[#6F8F4E]" />
              搜索主页内容
            </div>
          ) : null}

          <section className={`relative overflow-hidden rounded-[24px] p-4 shadow-sm ${appearance?.cardClassName || "bg-[#FFFDF8]"}`}>
            <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-[#F2E7D8]/70 blur-2xl" />
            <div className="pointer-events-none absolute bottom-2 right-3 h-16 w-12 rounded-full border border-[#C8A45D]/20" />
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${name} 的头像`} className="size-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid size-20 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)] text-2xl font-black text-[#3F5F31]">
                  {initial}
                </div>
              )}
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-2xl font-black" style={appearance?.nameStyle}>
                  {name}
                </h2>
                <p className="mt-0.5 text-xs font-bold text-[#7A6D5E]">@{username || "yourname"}</p>
                <p className="mt-2 text-sm leading-5 text-[#7A6D5E]" style={appearance?.bioStyle}>
                  {profileBio}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-2.5 text-sm">
            {activeLinks.map(({ id, label, caption, href }) => (
              <a
                key={id || label}
                href={href || "#"}
                className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${appearance?.linkClassName || ""}`}
                style={appearance?.linkStyle}
              >
                <span className={`flex min-w-0 flex-1 items-center gap-3 ${linkAlign === "right" ? "justify-end" : linkAlign === "center" ? "justify-center" : ""}`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#DDE8CD]">
                    <Globe aria-hidden className="link168-phone-link-icon text-[#3F5F31]" />
                  </span>
                  <span className={`min-w-0 ${alignByValue[linkAlign]}`}>
                    <span className="block truncate font-black">{label}</span>
                    {caption ? <span className="mt-0.5 block truncate text-xs opacity-70">{caption}</span> : null}
                  </span>
                </span>
                {appearance?.linkIcon === "hidden" ? null : appearance?.linkIcon === "share" ? (
                  <Share2 aria-hidden className="size-5 shrink-0 opacity-70" />
                ) : (
                  <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
                )}
              </a>
            ))}
          </div>

          {showPowered ? poweredLogoClickable ? <Link href="/">{footer}</Link> : footer : null}
        </div>
      </div>
    </div>
  );
}
