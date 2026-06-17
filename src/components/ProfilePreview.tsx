import Image from "next/image";
import Link from "next/link";
import { PhonePreview } from "@/components/PhonePreview";

export type PreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

export function BrandFooter({ clickable = true }: { clickable?: boolean }) {
  const content = (
    <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-[10px] font-semibold tracking-wide text-[#7A8673]">
      <Image src="/brand/link168-logo.png" alt="Link168" width={1536} height={864} className="h-3.5 w-auto object-contain opacity-90" />
      <span>Powered by Link168</span>
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
