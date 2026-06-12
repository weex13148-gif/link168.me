import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export type PhonePreviewVariant = "marketing" | "auth" | "public";

export type PhonePreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

type PhonePreviewProps = {
  variant?: PhonePreviewVariant;
  poweredLogoClickable?: boolean;
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  links?: PhonePreviewLink[];
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
  marketing: "shadow-[0_28px_90px_rgba(11,107,43,0.28)]",
  auth: "shadow-[0_22px_60px_rgba(17,58,29,0.18)]",
  public: "shadow-[0_20px_70px_rgba(17,58,29,0.2)]",
};

export function PhonePreview({
  variant = "marketing",
  poweredLogoClickable = true,
  username = "yourname",
  displayName,
  bio,
  avatarUrl,
  links = defaultLinks,
  className = "",
}: PhonePreviewProps) {
  const activeLinks = links.filter((link) => link.isActive !== false);
  const name = displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const profileBio = bio || "一个人，一个链接，连接全网";

  const footer = (
    <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[11px] font-black text-[#52624A] shadow-sm">
      <span>Powered by</span>
      <BrandLogo size="footer" className="w-[92px] max-w-[32vw]" />
    </div>
  );

  return (
    <div
      className={`phone-preview mx-auto aspect-[390/760] w-full max-w-[390px] rounded-[32px] border border-[#0B6B2B]/20 bg-[#102E1B] p-3 ${shellByVariant[variant]} ${className}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-[#F7F6EA]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#DDE8CF] px-4 py-3 text-[#113A1D]">
          <span className="text-xs font-black">9:41</span>
          <div className="h-1.5 w-20 rounded-full bg-[#DDE8CF]" />
          <span className="text-xs font-black">5G</span>
        </div>

        <div className="phone-preview-scroll flex-1 overflow-y-auto px-4 pb-5 pt-6 text-[#113A1D]">
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${name} 的头像`} className="size-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid size-20 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#16A34A,#FACC15)] text-2xl font-black text-[#113A1D]">
                  {initial}
                </div>
              )}
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-2xl font-black">{name}</h2>
                <p className="mt-0.5 text-xs font-bold text-[#6B7A5F]">@{username || "yourname"}</p>
                <p className="mt-2 text-sm leading-5 text-[#52624A]">{profileBio}</p>
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-2.5 text-sm">
            {activeLinks.map(({ id, label, caption, href }) => (
              <a
                key={id || label}
                href={href || "#"}
                className="link168-card-hover flex min-h-14 items-center justify-between rounded-2xl border border-[#DDE8CF] bg-white px-3.5 py-3 shadow-sm active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F7F6EA]">
                    <Globe aria-hidden className="size-5 text-[#16A34A]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-black">{label}</span>
                    {caption ? <span className="mt-0.5 block truncate text-xs text-[#6B7A5F]">{caption}</span> : null}
                  </span>
                </span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-[#6B7A5F]" />
              </a>
            ))}
          </div>

          {poweredLogoClickable ? <Link href="/">{footer}</Link> : footer}
        </div>
      </div>
    </div>
  );
}
