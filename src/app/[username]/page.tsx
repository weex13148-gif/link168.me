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
import {
  canShowPublicProfile,
  getActiveRestrictions,
  syncEmailVerificationRestriction,
  type ActiveRestriction,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";

export const dynamic = "force-dynamic";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");

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

  const direct = await db.profile
    .findUnique({
      where: { username: normalized },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { position: "asc" },
        },
      },
    })
    .catch(() => null);
  if (direct) return { type: "current" as const, profile: direct };

  const registry = await db.usernameRegistry
    .findUnique({
      where: { normalizedUsername: normalized },
      select: { userId: true, status: true, reservedUntil: true },
    })
    .catch(() => null);

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
    const currentProfile = await db.profile
      .findUnique({
        where: { userId: registry.userId },
        select: { username: true },
      })
      .catch(() => null);
    if (currentProfile && normalizeUsername(currentProfile.username) !== normalized) {
      return { type: "redirect" as const, username: currentProfile.username };
    }
  }

  const history = await db.usernameHistory
    .findFirst({
      where: { normalizedUsername: normalized },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);
  if (history?.replacedBy && history.reservedUntil && history.reservedUntil > new Date()) {
    return { type: "redirect" as const, username: history.replacedBy };
  }

  return { type: "missing" as const };
}

type CurrentProfile = Extract<
  Awaited<ReturnType<typeof resolveUsername>>,
  { type: "current" }
>["profile"];

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  if (normalizeUsername(username) === "showcase") notFound();
  const result = await resolveUsername(username);

  if (result.type !== "current") {
    return buildRestrictedProfileMetadata(username, appUrl);
  }

  const profile = result.profile;
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

  const avatarUrl = profile.avatarUrl
    ? `${profile.avatarUrl.split("?")[0]}?v=${profile.updatedAt.getTime()}`
    : null;

  return buildPublicProfileMetadata({
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl,
    isPublic: profile.isPublic,
    isIndexable: indexable,
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

function restrictionPage(restrictions: ActiveRestriction[]) {
  const types = restrictions.map((item) => item.type);
  if (types.includes("BANNED")) {
    return <BannedState />;
  }
  if (types.includes("ADMIN_FREEZE")) {
    return <FrozenState reason="管理员已暂停该主页展示。" />;
  }
  if (types.includes("SECURITY_RISK")) {
    return <FrozenState reason="为保障用户安全，该主页暂时停止公开展示。" />;
  }
  if (types.includes("EMAIL_UNVERIFIED")) {
    return (
      <StatePage
        title="该主页尚未完成邮箱验证"
        description="注册超过 30 天仍未验证邮箱的主页会暂停公开展示。请主页所有者登录后台完成验证。"
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
  return null;
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  if (normalizeUsername(username) === "showcase") notFound();
  const query = searchParams ? await searchParams : {};
  const result = await resolveUsername(username);

  if (result.type === "missing") notFound();
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
    return restrictionPage(restrictions) || <FrozenState />;
  }

  if (!profile.isPublic) {
    return <NotPublishedState />;
  }

  const links = profile.links.map((item) => {
    // D7 读取侧：图标 moderationStatus !== "approved" 时显示占位（不显示原图）
    // 历史兼容：null / "legacy_approved" 视为 approved
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

  const rawAvatarUrl = profile.avatarUrl || null;
  const avatarUrlWithCacheBust = rawAvatarUrl
    ? `${rawAvatarUrl.split("?")[0]}?t=${profile.updatedAt.getTime()}`
    : null;
  const contactIsPublic = profile.contactVisibility === "public";

  // JSON-LD 结构化数据
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
      <main className="min-h-dvh w-full bg-[#F4EEE5] sm:px-4 sm:py-8">
        <PublicProfileClientWrapper
          profileId={profile.id}
          template={resolveTemplate(profile, query.template)}
          username={profile.username}
          displayName={profile.displayName || profile.company || "经营主页"}
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
