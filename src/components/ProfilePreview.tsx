import Link from "next/link";
import { PhonePreview } from "@/components/PhonePreview";
import { BrandLogo } from "@/components/BrandLogo";

export type PreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

export function BrandFooter({ clickable = true }: { clickable?: boolean }) {
  const content = (
    <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-[#52624A] shadow-sm">
      <span>Powered by</span>
      <BrandLogo size="footer" className="w-[92px] max-w-[32vw]" />
    </div>
  );

  return clickable ? <Link href="/">{content}</Link> : content;
}

export function ProfilePreview({
  username = "",
  displayName,
  bio,
  avatarUrl,
  links = [],
}: {
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  links?: PreviewLink[];
}) {
  return (
    <PhonePreview
      variant="marketing"
      poweredLogoClickable
      username={username}
      displayName={displayName}
      bio={bio}
      avatarUrl={avatarUrl}
      links={links}
    />
  );
}
