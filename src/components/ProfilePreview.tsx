import { ArrowUpRight, Globe } from "lucide-react";

export type PreviewLink = {
  id?: string;
  label: string;
  caption?: string | null;
  href?: string;
  isActive?: boolean;
};

export function BrandFooter() {
  return (
    <a
      href="https://link168.me"
      className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-black text-[#4A4A4A] shadow-sm transition hover:text-[#5B6FFF]"
    >
      <span className="grid size-6 place-items-center rounded-md bg-[#5B6FFF] text-[10px] text-white">L</span>
      Powered by Link168
    </a>
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
  const activeLinks = links.filter((link) => link.isActive !== false);
  const displayUsername = username || "yourname";
  const name = displayName || (username ? `@${username}` : "你的主页");
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[28px] border border-[#1A1A1A]/15 bg-[#1A1A1A] p-3 shadow-2xl shadow-[#5B6FFF]/20">
      <div className="overflow-hidden rounded-[20px] bg-[#F5F7FA]">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <span className="text-xs font-black">9:41</span>
          <div className="h-1.5 w-20 rounded-full bg-black/15" />
          <span className="text-xs font-black">5G</span>
        </div>

        <div className="px-4 pb-5 pt-6">
          <section className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${name} 的头像`} className="size-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid size-20 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#5B6FFF,#FF6B35)] text-2xl font-black text-white">
                  {initial}
                </div>
              )}
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-2xl font-black">{name}</h2>
                <p className="mt-0.5 text-xs font-bold text-[#8C8C8C]">@{displayUsername}</p>
                <p className="mt-2 text-sm leading-5 text-[#4A4A4A]">
                  {bio || "保存资料后，这里会显示你的主页简介。"}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-2.5">
            {activeLinks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E0E0E0] bg-white px-4 py-5 text-center text-sm font-bold text-[#8C8C8C]">
                还没有公开链接
              </div>
            ) : null}
            {activeLinks.map(({ id, label, caption, href }) => (
              <a
                key={id || label}
                href={href || "#"}
                className="flex min-h-16 items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F5F7FA]">
                    <Globe aria-hidden className="size-5 text-[#5B6FFF]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-black">{label}</span>
                    {caption ? <span className="mt-0.5 block truncate text-xs text-[#8C8C8C]">{caption}</span> : null}
                  </span>
                </span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-[#8C8C8C]" />
              </a>
            ))}
          </div>

          <BrandFooter />
        </div>
      </div>
    </div>
  );
}
