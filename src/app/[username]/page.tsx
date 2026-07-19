import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfileClientWrapper } from "@/components/public-profile/PublicProfileClientWrapper";
import {
  StatePage,
  NotPublishedState,
  FrozenState,
  BannedState,
} from "@/components/public-profile/StatePage";
import {
  buildPublicProfileMetadata,
  buildRestrictedProfileMetadata,
} from "@/lib/seo/public-profile";
import {
  generatePersonSchema,
  generateProfilePageSchema,
  serializeSchema,
} from "@/lib/seo/json-ld";
import type { SharePageTemplate } from "@/components/share/SharePageRenderer";
import { getThemeClasses } from "@/components/theme/presetThemes";
import type { PublicProfileAccessReason } from "@/domains/profile/public-profile-access";
import { resolvePublicProfileAccess } from "@/infrastructure/profile/prisma-public-profile-access";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";

export const dynamic = "force-dynamic";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string; template?: string }>;
};

type CurrentProfile = Extract<
  Awaited<ReturnType<typeof resolvePublicProfileAccess>>,
  { type: "current" }
>["profile"];

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await resolvePublicProfileAccess(username);

  if (result.type !== "current" || !result.access.allowed) {
    return buildRestrictedProfileMetadata(username, appUrl);
  }

  const profile = result.profile;
  const avatarUrl = profile.avatarUrl
    ? `${profile.avatarUrl.split("?")[0]}?v=${profile.updatedAt.getTime()}`
    : null;

  return buildPublicProfileMetadata({
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl,
    isPublic: true,
    isIndexable: true,
    updatedAt: profile.updatedAt,
    pageUrl: `${appUrl}/${profile.username}`,
    appUrl,
  });
}

function resolveTemplate(profile: CurrentProfile, requested?: string): SharePageTemplate {
  if (requested === "business" || requested === "creator" || requested === "conversion") return requested;
  const stored = String(profile.template || "").trim().toLowerCase();
  if (stored === "business" || stored === "creator" || stored === "conversion") return stored;
  return "business";
}

function restrictionPage(reason: PublicProfileAccessReason | null) {
  if (reason === "BANNED") {
    return <BannedState />;
  }
  if (reason === "ADMIN_FREEZE") {
    return <FrozenState reason="管理员已暂停该主页展示。" />;
  }
  if (reason === "SECURITY_RISK") {
    return <FrozenState reason="为保障用户安全，该主页暂时停止公开展示。" />;
  }
  if (reason === "EMAIL_UNVERIFIED") {
    return (
      <StatePage
        title="该主页尚未完成邮箱验证"
        description="主页所有者完成邮箱验证并重新发布后，访客即可访问该主页。"
        action={
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            登录后台验证
          </Link>
        }
      />
    );
  }
  if (reason === "ACCOUNT_INACTIVE") {
    return <StatePage title="该主页当前不可用" description="主页所有者账号当前不可用，页面已停止公开展示。" />;
  }
  if (reason === "PROFILE_NOT_PUBLIC") {
    return <NotPublishedState />;
  }
  return <FrozenState />;
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  const query = searchParams ? await searchParams : {};
  const result = await resolvePublicProfileAccess(username);

  if (result.type === "missing") notFound();
  if (result.type === "unavailable") {
    return <StatePage title="服务暂时不可用" description="系统暂时无法确认该主页状态，请稍后再试。" />;
  }
  if (result.type === "reserved") {
    return (
      <StatePage
        title={`@${username} 已被保留`}
        description="该公开地址由系统保留，当前没有可展示的用户主页。"
      />
    );
  }
  if (result.type === "redirect") {
    return (
      <StatePage
        title="该主页地址已更新"
        description={`新的公开主页地址是 link168.me/${result.username}`}
        action={
          <Link
            href={`/${result.username}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            前往新主页
          </Link>
        }
      />
    );
  }

  const profile = result.profile;
  if (!result.access.allowed) {
    return restrictionPage(result.access.reason);
  }

  const links = profile.links.map((item) => {
    const iconModerationApproved =
      !item.iconModerationStatus ||
      item.iconModerationStatus === "approved" ||
      item.iconModerationStatus === "legacy_approved";
    return {
      id: item.id,
      title: item.title,
      description: item.description || null,
      url: item.url?.trim() || null,
      icon: iconModerationApproved
        ? item.iconUrl || item.iconValue || null
        : item.iconValue || null,
      iconType: item.iconType || null,
      type: item.iconType || null,
      componentType: item.type || null,
      payload: item.payloadJson || null,
    };
  });

  const rawProducts = await db.product
    .findMany({
      where: { userId: profile.userId, status: "published" },
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
    })
    .catch(() => []);

  const products = rawProducts.map((product) => {
    const checked = product.ctaUrl ? sanitizePublicUrl(product.ctaUrl) : null;
    return {
      ...product,
      ctaUrl: checked?.safe ? checked.url : null,
    };
  });

  const reportUrl = `/report?url=${encodeURIComponent(`${appUrl}/${profile.username}`)}`;
  const themeName = profile.theme || "Link168 草木默认";
  const surfaceClass = getThemeClasses(themeName).surfaceClassName;

  const rawAvatarUrl = profile.avatarUrl || null;
  const avatarUrlWithCacheBust = rawAvatarUrl
    ? `${rawAvatarUrl.split("?")[0]}?t=${profile.updatedAt.getTime()}`
    : null;
  const contactIsPublic = profile.contactVisibility === "public";

  const personSchema = generatePersonSchema({
    name: profile.displayName || `@${profile.username}`,
    username: profile.username,
    bio: profile.bio,
    avatarUrl: avatarUrlWithCacheBust,
    pageUrl: `${appUrl}/${profile.username}`,
    jobTitle: profile.jobTitle,
    company: profile.company,
    email: contactIsPublic ? profile.email : null,
    phone: contactIsPublic ? profile.phone : null,
    city: contactIsPublic ? profile.city : null,
    address: contactIsPublic ? profile.address : null,
    website: contactIsPublic ? profile.website : null,
    socialLinks: contactIsPublic ? profile.socialLinks as Record<string, string> | null : null,
  });

  const profilePageSchema = generateProfilePageSchema({
    person: personSchema,
    pageUrl: `${appUrl}/${profile.username}`,
    updatedAt: profile.updatedAt,
    createdAt: profile.createdAt,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(profilePageSchema) }}
      />
      <main className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10 ${surfaceClass}`}>
        <PublicProfileClientWrapper
          profileId={profile.id}
          template={resolveTemplate(profile, query.template)}
          username={profile.username}
          displayName={profile.displayName || `@${profile.username}`}
          bio={profile.bio}
          avatarUrl={avatarUrlWithCacheBust}
          links={links}
          themeName={themeName}
          customTheme={profile.customTheme}
          showBrandFoot={true}
          reportUrl={reportUrl}
          products={products}
          company={profile.company}
          jobTitle={profile.jobTitle}
          phone={contactIsPublic ? profile.phone : null}
          email={contactIsPublic ? profile.email : null}
          wechat={contactIsPublic ? profile.wechat : null}
          city={contactIsPublic ? profile.city : null}
          address={contactIsPublic ? profile.address : null}
          website={contactIsPublic ? profile.website : null}
          contactVisibility={profile.contactVisibility}
          isPreview={query.preview === "1"}
        />
      </main>
    </>
  );
}
