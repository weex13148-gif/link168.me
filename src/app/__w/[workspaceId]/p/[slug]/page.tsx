import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfileClientWrapper } from "@/components/public-profile/PublicProfileClientWrapper";
import { StatePage, NotPublishedState, FrozenState, BannedState } from "@/components/public-profile/StatePage";
import { buildPublicProfileMetadata, buildRestrictedProfileMetadata } from "@/lib/seo/public-profile";
import { generatePersonSchema, generateProfilePageSchema, serializeSchema } from "@/lib/seo/json-ld";
import type { SharePageTemplate } from "@/components/share/SharePageRenderer";
import { getThemeClasses } from "@/components/theme/presetThemes";
import {
  canShowPublicProfile,
  getActiveRestrictions,
  syncEmailVerificationRestriction,
  type ActiveRestriction,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkspacePublicRequestHost } from "@/lib/workspace-public-host";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { resolveWorkspacePublicProfile } from "@/lib/domains";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workspaceId: string; slug: string }>;
};

async function requireVerifiedHost(workspaceId: string): Promise<string> {
  const { headers } = await import("next/headers");
  const verifiedHost = await validateWorkspacePublicRequestHost(
    workspaceId,
    (await headers()).get("host"),
  );
  if (!verifiedHost) notFound();
  return verifiedHost;
}

function resolveTemplate(profile: { template: string | null }, requested?: string): SharePageTemplate {
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
    return <FrozenState reason="管理员已暂停该员工名片展示。" />;
  }
  if (types.includes("SECURITY_RISK")) {
    return <FrozenState reason="为保障用户安全，该员工名片暂时停止公开展示。" />;
  }
  if (types.includes("EMAIL_UNVERIFIED")) {
    return (
      <StatePage
        title="该员工名片尚未完成邮箱验证"
        description="该员工账号尚未完成邮箱验证，名片暂不公开展示。"
      />
    );
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId, slug } = await params;
  const host = await requireVerifiedHost(workspaceId);
  const hostUrl = `https://${host}`;
  const resolved = await resolveWorkspacePublicProfile(workspaceId, slug);
  if (!resolved) {
    return { title: "员工名片不存在 | Link168" };
  }

  const profile = await db.profile.findUnique({
    where: { userId: resolved.userId },
    include: { links: { where: { isActive: true }, orderBy: { position: "asc" } } },
  });
  if (!profile) {
    return buildRestrictedProfileMetadata(resolved.slug, hostUrl);
  }

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

  const pageUrl = `${hostUrl}/${resolved.slug}`;

  return buildPublicProfileMetadata({
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl,
    isPublic: profile.isPublic,
    isIndexable: indexable,
    updatedAt: profile.updatedAt,
    pageUrl,
    appUrl: hostUrl,
  });
}

export default async function WorkspaceEmployeeProfilePage({ params, searchParams }: Props & { searchParams?: Promise<{ template?: string }> }) {
  const { workspaceId, slug } = await params;
  const query = searchParams ? await searchParams : {};
  const host = await requireVerifiedHost(workspaceId);

  const resolved = await resolveWorkspacePublicProfile(workspaceId, slug);
  if (!resolved) notFound();

  const profile = await db.profile.findUnique({
    where: { userId: resolved.userId },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!profile) {
    return (
      <StatePage
        title="该员工尚未创建个人名片"
        description="员工账号尚未配置个人资料，暂无可展示的内容。"
      />
    );
  }

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
    return <StatePage title="服务暂时不可用" description="系统暂时无法确认该员工名片状态，请稍后再试。" />;
  }

  const visibility = canShowPublicProfile(restrictions);
  if (!visibility.ok) {
    return restrictionPage(restrictions) || <FrozenState />;
  }

  if (!profile.isPublic) {
    return <NotPublishedState />;
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

  const hostUrl = `https://${host}`;
  const pageUrl = `${hostUrl}/${resolved.slug}`;
  const reportUrl = `/report?url=${encodeURIComponent(pageUrl)}`;
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
    pageUrl,
    jobTitle: profile.jobTitle,
    company: profile.company,
    email: contactIsPublic ? profile.email : null,
    phone: contactIsPublic ? profile.phone : null,
    city: contactIsPublic ? profile.city : null,
    address: contactIsPublic ? profile.address : null,
    website: contactIsPublic ? profile.website : null,
    socialLinks: contactIsPublic ? (profile.socialLinks as Record<string, string> | null) : null,
  });

  const profilePageSchema = generateProfilePageSchema({
    person: personSchema,
    pageUrl,
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
          isPreview={false}
        />
        {/* 返回企业官网入口 */}
        <div className="mt-6 border-t border-gray-200 pt-4 text-center">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-[#6F8F4E]"
          >
            ← 返回企业官网首页
          </Link>
        </div>
      </main>
    </>
  );
}
