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
    <div className="mx-auto mt-5 flex w-fit items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#7A8673]">
      <span className="size-1.5 rounded-full bg-[#16A34A]" />
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
