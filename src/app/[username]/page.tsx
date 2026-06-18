import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Globe } from "lucide-react";
import { BrandFooter } from "@/components/ProfilePreview";
import { db } from "@/lib/db";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string }>;
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

  if (!profile) {
    return null;
  }

  return profile;
}

type ThemeStyle = {
  outer: string;
  screen: string;
  card: string;
  cardText: string;
  cardSubtle: string;
  avatar: string;
  avatarText: string;
  link: string;
  linkIcon: string;
  linkText: string;
  linkBorder: string;
  footerText: string;
};

function getThemeStyle(theme: string | null | undefined): ThemeStyle {
  const name = (theme || "").trim();

  switch (name) {
    case "简约白":
      return {
        outer: "bg-white",
        screen: "bg-white",
        card: "bg-white",
        cardText: "text-[#2B241E]",
        cardSubtle: "text-[#7A6D5E]",
        avatar: "bg-[#F5F7FA]",
        avatarText: "text-[#2B241E]",
        link: "bg-white",
        linkIcon: "bg-[#F5F7FA] text-[#2B241E]",
        linkText: "text-[#2B241E]",
        linkBorder: "border-[#E0E0E0]",
        footerText: "text-[#8C8C8C]",
      };
    case "商务黑":
      return {
        outer: "bg-[#111827]",
        screen: "bg-[#111827]",
        card: "bg-[#1F2937]",
        cardText: "text-white",
        cardSubtle: "text-[#D1D5DB]",
        avatar: "bg-[#374151]",
        avatarText: "text-white",
        link: "bg-[#111827]",
        linkIcon: "bg-[#374151] text-white",
        linkText: "text-white",
        linkBorder: "border-[#374151]",
        footerText: "text-[#9CA3AF]",
      };
    case "蓝色科技":
      return {
        outer: "bg-[#EAF3FF]",
        screen: "bg-[#EAF3FF]",
        card: "bg-white",
        cardText: "text-[#0F172A]",
        cardSubtle: "text-[#64748B]",
        avatar: "bg-[#2563EB]",
        avatarText: "text-white",
        link: "bg-[#2563EB]",
        linkIcon: "bg-white/90 text-[#2563EB]",
        linkText: "text-white",
        linkBorder: "border-[#1D4ED8]",
        footerText: "text-[#64748B]",
      };
    case "橙色活力":
      return {
        outer: "bg-[#FFF3E6]",
        screen: "bg-[#FFF3E6]",
        card: "bg-white",
        cardText: "text-[#4A1C06]",
        cardSubtle: "text-[#9A3412]",
        avatar: "bg-[#F97316]",
        avatarText: "text-white",
        link: "bg-[#F97316]",
        linkIcon: "bg-white/90 text-[#F97316]",
        linkText: "text-white",
        linkBorder: "border-[#EA580C]",
        footerText: "text-[#9A3412]",
      };
    case "浅绿清新":
      return {
        outer: "bg-[#DDE8CD]",
        screen: "bg-[#DDE8CD]",
        card: "bg-[#FFFDF8]",
        cardText: "text-[#2B241E]",
        cardSubtle: "text-[#4A5A2F]",
        avatar: "bg-[#6F8F4E]",
        avatarText: "text-white",
        link: "bg-[#FFFDF8]",
        linkIcon: "bg-[#DDE8CD] text-[#3F5F31]",
        linkText: "text-[#3F5F31]",
        linkBorder: "border-[#E8DCCB]",
        footerText: "text-[#4A5A2F]",
      };
    case "Link168 草木默认":
    default:
      return {
        outer: "bg-[#F7F1E7]",
        screen: "bg-[#F7F1E7]",
        card: "bg-[#FFFDF8]",
        cardText: "text-[#2B241E]",
        cardSubtle: "text-[#7A6D5E]",
        avatar: "bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)]",
        avatarText: "text-[#3F5F31]",
        link: "bg-[#FFFDF8]",
        linkIcon: "bg-[#DDE8CD] text-[#3F5F31]",
        linkText: "text-[#2B241E]",
        linkBorder: "border-[#E8DCCB]",
        footerText: "text-[#7A6D5E]",
      };
  }
}

type I18nText = {
  noLinks: string;
  bioFallback: string;
  poweredBy: string;
  report: string;
  returnDashboard: string;
};

function getI18n(language: string | null | undefined): I18nText {
  const lang = (language || "zh").trim().toLowerCase();
  if (lang === "en") {
    return {
      noLinks: "No public links yet.",
      bioFallback: "This profile has no bio.",
      poweredBy: "Powered by Link168",
      report: "Report this profile",
      returnDashboard: "Back to dashboard",
    };
  }
  if (lang === "ja") {
    return {
      noLinks: "公開リンクはまだありません。",
      bioFallback: "このプロフィールには自己紹介がありません。",
      poweredBy: "Link168 提供",
      report: "このプロフィールを通報",
      returnDashboard: "管理画面に戻る",
    };
  }
  return {
    noLinks: "暂无公开链接",
    bioFallback: "这个主页还没有简介。",
    poweredBy: "Powered by Link168",
    report: "举报此主页",
    returnDashboard: "返回操作后台",
  };
}

function renderIcon(
  iconType: string | null | undefined,
  iconValue: string | null | undefined,
  iconUrl: string | null | undefined,
  defaultIconClass: string,
  defaultTextClass: string,
): ReactNode {
  const type = (iconType || "default").toLowerCase();
  if (type === "emoji" && iconValue) {
    return (
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-2xl ${defaultIconClass}`}>
        {iconValue}
      </span>
    );
  }
  if (type === "custom" && iconUrl) {
    return (
      <span className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 ${defaultIconClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${defaultIconClass}`}>
      <Globe aria-hidden className="size-5" />
    </span>
  );
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

  if (!profile.isPublic) {
    return {
      title: `该主页暂不可访问 | Link168`,
      description: `该页面可能因违反平台规则、被用户举报或由管理员处理，当前已暂停展示。`,
    };
  }

  return {
    title: `${profile.displayName || `@${profile.username}`} | Link168`,
    description: profile.bio || `访问 @${profile.username} 的 link168.me 主页。`,
  };
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  const query = searchParams ? await searchParams : {};
  const isPreview = query.preview === "1";
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  if (!profile.isPublic) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-2xl border border-[#E0E0E0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#FFF7E6] text-[#AD6800]">
            <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
              <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#1A1A1A]">该主页暂不可访问</h1>
          <p className="mt-3 text-sm leading-7 text-[#4A4A4A]">
            该页面可能因违反平台规则、被用户举报或由管理员处理，当前已暂停展示。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#E0E0E0] bg-white px-5 text-sm font-black text-[#1A1A1A]"
            >
              返回首页
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5B6FFF] px-5 text-sm font-black text-white"
            >
              免费创建我的主页
            </Link>
          </div>
        </section>
        <BrandFooter />
      </main>
    );
  }

  const style = getThemeStyle(profile.theme || "Link168 草木默认");
  const i18n = getI18n(profile.language);
  const displayName = profile.displayName || `@${profile.username}`;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5 ${style.outer}`}>
      {isPreview ? (
        <Link
          href="/dashboard"
          className="mb-3 inline-flex w-fit items-center rounded-full bg-[#6F8F4E] px-4 py-2 text-sm font-black text-white shadow-sm"
        >
          {i18n.returnDashboard}
        </Link>
      ) : null}
      <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[#1A1A1A]/15 bg-[#1A1A1A] p-3 shadow-2xl shadow-[#5B6FFF]/20">
        <div className={`flex flex-1 flex-col overflow-hidden rounded-[20px] ${style.screen}`}>
          <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-[#2B241E]">
            <span className="text-xs font-black">9:41</span>
            <span className="h-1.5 w-20 rounded-full bg-black/15" />
            <span className="text-xs font-black">5G</span>
          </header>

          <div className="flex-1 px-4 pb-5 pt-6 text-[#2B241E]">
            <section className={`relative overflow-hidden rounded-[24px] p-4 shadow-sm ${style.card}`}>
              <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-[#F2E7D8]/70 blur-2xl" />
              <div className="pointer-events-none absolute bottom-2 right-3 h-16 w-12 rounded-full border border-[#C8A45D]/20" />
              <div className="flex items-start gap-4">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={`${displayName} 的头像`} className="size-20 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className={`grid size-20 shrink-0 place-items-center rounded-full ${style.avatar} text-2xl font-black ${style.avatarText}`}>
                    {initial}
                  </div>
                )}
                <div className="min-w-0 pt-1">
                  <h1 className={`truncate text-2xl font-black ${style.cardText}`}>{displayName}</h1>
                  <p className={`mt-0.5 text-xs font-bold ${style.cardSubtle}`}>@{profile.username}</p>
                  <p className={`mt-2 text-sm leading-5 ${style.cardSubtle}`}>{profile.bio || i18n.bioFallback}</p>
                </div>
              </div>
            </section>

            <div className="mt-4 space-y-2.5">
              {profile.links.length === 0 ? (
                <div className={`rounded-lg border border-dashed border-[#E0E0E0] ${style.card} px-4 py-5 text-center text-sm font-bold ${style.cardSubtle}`}>
                  {i18n.noLinks}
                </div>
              ) : null}
              {profile.links.map((item) => (
                <Link
                  key={item.id}
                  href={`/go/${item.id}`}
                  className={`link168-card-hover flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-sm shadow-sm transition active:scale-[0.99] ${style.link} ${style.linkBorder}`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    {renderIcon(item.iconType, item.iconValue, item.iconUrl, style.linkIcon, style.linkText)}
                    <span className="min-w-0">
                      <span className={`block truncate font-black ${style.linkText}`}>{item.title}</span>
                      {item.description ? <span className={`mt-0.5 block truncate text-xs ${style.cardSubtle}`}>{item.description}</span> : null}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden className={`size-5 shrink-0 opacity-70 ${style.linkText}`} />
                </Link>
              ))}
            </div>

            <BrandFooter textClass={style.footerText} />
            <Link
              href={`/report?url=${encodeURIComponent(`https://link168.me/${profile.username}`)}`}
              className={`mt-3 block text-center text-xs font-bold hover:text-[#5B6FFF] ${style.footerText}`}
            >
              {i18n.report}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
