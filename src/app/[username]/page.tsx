import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SharePageWithContact } from "@/components/share/SharePageWithContact";
import type { SharePageTemplate } from "@/components/share/SharePageRenderer";
import { getThemeClasses } from "@/components/theme/presetThemes";
import {
  canShowPublicProfile,
  getActiveRestrictions,
  syncEmailVerificationRestriction,
  type ActiveRestriction,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string; template?: string }>;
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

async function loadProfileByUserId(userId: string) {
  return db.profile.findUnique({
    where: { userId },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

async function resolveUsername(rawUsername: string) {
  const normalized = normalizeUsername(rawUsername);
  if (!normalized) return { type: "missing" as const };

  const direct = await db.profile.findUnique({
    where: { username: normalized },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  }).catch(() => null);
  if (direct) return { type: "current" as const, profile: direct };

  const registry = await db.usernameRegistry.findUnique({
    where: { normalizedUsername: normalized },
    select: { userId: true, status: true, reservedUntil: true },
  }).catch(() => null);

  if (registry?.status === "CURRENT" && registry.userId) {
    const profile = await loadProfileByUserId(registry.userId).catch(() => null);
    if (profile) return { type: "current" as const, profile };
  }

  if (registry?.status === "PERMANENTLY_RESERVED") {
    return { type: "reserved" as const };
  }

  if (
    registry?.status === "RESERVED_90_DAYS" &&
    registry.userId &&
    registry.reservedUntil &&
    registry.reservedUntil > new Date()
  ) {
    const currentProfile = await db.profile.findUnique({
      where: { userId: registry.userId },
      select: { username: true },
    }).catch(() => null);
    if (currentProfile && normalizeUsername(currentProfile.username) !== normalized) {
      return { type: "redirect" as const, username: currentProfile.username };
    }
  }

  const history = await db.usernameHistory.findFirst({
    where: { normalizedUsername: normalized },
    orderBy: { createdAt: "desc" },
  }).catch(() => null);
  if (history?.replacedBy && history.reservedUntil && history.reservedUntil > new Date()) {
    return { type: "redirect" as const, username: history.replacedBy };
  }

  return { type: "missing" as const };
}

type CurrentProfile = Extract<Awaited<ReturnType<typeof resolveUsername>>, { type: "current" }>["profile"];

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await resolveUsername(username);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");

  if (result.type !== "current") {
    return {
      title: `@${username}`,
      description: `访问 @${username} 的 Link168 公开主页。`,
      robots: { index: false, follow: false },
    };
  }

  const profile = result.profile;
  const title = profile.displayName || `@${profile.username}`;
  const description = profile.bio || `访问 @${profile.username} 的 Link168 公开主页。`;
  const canonicalPath = `/${profile.username}`;
  const avatarUrl = profile.avatarUrl
    ? `${profile.avatarUrl.split("?")[0]}?v=${profile.updatedAt.getTime()}`
    : null;

  let indexable = profile.isPublic;
  try {
    const [owner, restrictions] = await Promise.all([
      db.user.findUnique({ where: { id: profile.userId }, select: { emailVerified: true } }),
      getActiveRestrictions(profile.userId),
    ]);
    indexable = Boolean(profile.isPublic && owner?.emailVerified && canShowPublicProfile(restrictions).ok);
  } catch {
    indexable = false;
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: "profile",
      locale: "zh_CN",
      siteName: "Link168",
      title,
      description,
      url: `${appUrl}${canonicalPath}`,
      images: avatarUrl ? [{ url: avatarUrl, alt: `${title} 的头像` }] : undefined,
    },
    twitter: {
      card: avatarUrl ? "summary" : "summary_large_image",
      title,
      description,
      images: avatarUrl ? [avatarUrl] : undefined,
    },
  };
}

function resolveTemplate(profile: CurrentProfile, requested?: string): SharePageTemplate {
  if (requested === "business" || requested === "creator" || requested === "conversion") return requested;
  const stored = String(profile.template || "").trim().toLowerCase();
  if (stored === "business" || stored === "creator" || stored === "conversion") return stored;
  return "business";
}

function BrandFooter() {
  return (
    <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 py-2 text-xs font-black text-[#4F6D37] shadow-sm">
      <span className="grid size-6 place-items-center rounded-lg bg-[#6F8F4E] text-[10px] text-white">L</span>
      由 Link168 提供
    </Link>
  );
}

function StatePage({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-[#2B241E]">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>
      <BrandFooter />
    </main>
  );
}

function restrictionPage(restrictions: ActiveRestriction[]) {
  const types = restrictions.map((item) => item.type);
  if (types.includes("BANNED")) {
    return <StatePage title="该账号已被封禁" description="该账号因违反平台规则，公开主页已停止展示。" />;
  }
  if (types.includes("ADMIN_FREEZE")) {
    return <StatePage title="该主页暂不可访问" description="管理员已暂停该主页展示。" />;
  }
  if (types.includes("SECURITY_RISK")) {
    return <StatePage title="该主页正在安全审核" description="为保障用户安全，该主页暂时停止公开展示。" />;
  }
  if (types.includes("EMAIL_UNVERIFIED")) {
    return (
      <StatePage
        title="该主页尚未完成邮箱验证"
        description="注册超过 30 天仍未验证邮箱的主页会暂停公开展示。请主页所有者登录后台完成验证。"
        action={<Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white">登录后台验证</Link>}
      />
    );
  }
  return null;
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  const query = searchParams ? await searchParams : {};
  const result = await resolveUsername(username);

  if (result.type === "missing") notFound();
  if (result.type === "reserved") {
    return <StatePage title={`@${username} 已被保留`} description="该公开地址由系统保留，当前没有可展示的用户主页。" />;
  }
  if (result.type === "redirect") {
    return (
      <StatePage
        title="该主页地址已更新"
        description={`新的公开主页地址是 link168.me/${result.username}`}
        action={<Link href={`/${result.username}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white">前往新主页</Link>}
      />
    );
  }

  const profile = result.profile;
  let restrictions: ActiveRestriction[] = [];
  try {
    const user = await db.user.findUnique({
      where: { id: profile.userId },
      select: { emailVerified: true },
    });
    if (user && !user.emailVerified) {
      await syncEmailVerificationRestriction(profile.userId).catch(() => undefined);
    }
    restrictions = await getActiveRestrictions(profile.userId);
  } catch {
    return <StatePage title="服务暂时不可用" description="系统暂时无法确认该主页状态，请稍后再试。" />;
  }

  const visibility = canShowPublicProfile(restrictions);
  if (!visibility.ok) {
    return restrictionPage(restrictions) || <StatePage title="该主页暂不可访问" description="该主页当前处于限制状态。" />;
  }

  if (!profile.isPublic) {
    return (
      <StatePage
        title="该主页暂未公开"
        description="主页所有者尚未公开此页面。"
        action={<Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white">免费创建我的主页</Link>}
      />
    );
  }

  const links = profile.links.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || null,
    url: item.url?.trim() || null,
    icon: item.iconUrl || item.iconValue || null,
    type: item.iconType || null,
    componentType: item.type || null,
    payload: item.payloadJson || null,
  }));

  const rawProducts = await db.product.findMany({
    where: { userId: profile.userId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      priceText: true,
      coverImageUrl: true,
      ctaLabel: true,
      ctaUrl: true,
    },
  }).catch(() => []);

  const products = rawProducts.map((product) => {
    const checked = product.ctaUrl ? sanitizePublicUrl(product.ctaUrl) : null;
    return {
      ...product,
      ctaUrl: checked?.safe ? checked.url : null,
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://link168.me";
  const reportUrl = `/report?url=${encodeURIComponent(`${appUrl}/${profile.username}`)}`;
  const themeName = profile.theme || "Link168 草木默认";
  const surfaceClass = getThemeClasses(themeName).surfaceClassName;

  const rawAvatarUrl = profile.avatarUrl || null;
  const avatarUrlWithCacheBust = rawAvatarUrl
    ? `${rawAvatarUrl.split("?")[0]}?t=${profile.updatedAt.getTime()}`
    : null;

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10 ${surfaceClass}`}>
      {query.preview === "1" ? (
        <Link href="/dashboard" className="mb-4 inline-flex w-fit items-center rounded-full bg-[#6F8F4E] px-4 py-2 text-sm font-black text-white shadow-sm">返回操作后台</Link>
      ) : null}
      <div className="mx-auto w-full max-w-md">
        <SharePageWithContact
          template={resolveTemplate(profile, query.template)}
          username={profile.username}
          displayName={profile.displayName || `@${profile.username}`}
          bio={profile.bio}
          avatarUrl={avatarUrlWithCacheBust}
          links={links}
          themeName={themeName}
          showBrandFoot
          reportUrl={reportUrl}
          products={products}
        />
      </div>
    </main>
  );
}
