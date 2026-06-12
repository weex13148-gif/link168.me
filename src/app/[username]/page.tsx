import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Globe } from "lucide-react";
import { BrandFooter } from "@/components/ProfilePreview";
import { db } from "@/lib/db";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

async function getPublicProfile(username: string) {
  const profile = await db.profile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!profile || !profile.isPublic) {
    return null;
  }

  return profile;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return {
      title: `@${username} | Link168`,
      description: `访问 @${username} 的 link168.me 主页。`,
    };
  }

  return {
    title: `${profile.displayName || `@${profile.username}`} | Link168`,
    description: profile.bio || `访问 @${profile.username} 的 link168.me 主页。`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const displayName = profile.displayName || `@${profile.username}`;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5">
      <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[#1A1A1A]/15 bg-[#1A1A1A] p-3 shadow-2xl shadow-[#5B6FFF]/20">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-[#F5F7FA]">
          <header className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <span className="text-xs font-black">9:41</span>
            <span className="h-1.5 w-20 rounded-full bg-black/15" />
            <span className="text-xs font-black">5G</span>
          </header>

          <div className="flex-1 px-4 pb-5 pt-6">
            <section className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={`${displayName} 的头像`} className="size-20 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="grid size-20 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#5B6FFF,#FF6B35)] text-2xl font-black text-white">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 pt-1">
                  <h1 className="truncate text-2xl font-black">{displayName}</h1>
                  <p className="mt-0.5 text-xs font-bold text-[#8C8C8C]">@{profile.username}</p>
                  <p className="mt-2 text-sm leading-5 text-[#4A4A4A]">{profile.bio || "这个主页还没有简介。"}</p>
                </div>
              </div>
            </section>

            <div className="mt-4 space-y-2.5">
              {profile.links.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E0E0E0] bg-white px-4 py-5 text-center text-sm font-bold text-[#8C8C8C]">
                  暂无公开链接
                </div>
              ) : null}
              {profile.links.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                  className="flex min-h-16 items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-3 text-sm shadow-sm transition active:scale-[0.99]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F5F7FA]">
                      <Globe aria-hidden className="size-5 text-[#5B6FFF]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-black">{item.title}</span>
                      {item.description ? <span className="mt-0.5 block truncate text-xs text-[#8C8C8C]">{item.description}</span> : null}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-[#8C8C8C]" />
                </a>
              ))}
            </div>

            <BrandFooter />
            <Link
              href={`/report?url=${encodeURIComponent(`https://link168.me/${profile.username}`)}`}
              className="mt-3 block text-center text-xs font-bold text-[#8C8C8C] hover:text-[#5B6FFF]"
            >
              举报此主页
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
