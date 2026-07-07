import { PhonePreview } from "@/components/PhonePreview";

export type PreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

export function BrandFooter({ clickable = true, textClass = "text-[#3F5F31]" }: { clickable?: boolean; textClass?: string }) {
  const content = (
    <div className="mx-auto mt-5 flex justify-center">
      <span
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-base font-bold shadow-sm ${textClass}`}
      >
        Link168.me
      </span>
    </div>
  );

  return clickable ? (
    <a
      href={process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}
      aria-label="访问 Link168.me 首页"
      className="link168-card-hover block transition hover:opacity-80 active:scale-[0.98]"
    >
      {content}
    </a>
  ) : (
    content
  );
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
