import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getActiveRestrictions,
  canShowPublicProfile,
  syncEmailVerificationRestriction,
  RestrictionQueryError,
  type ActiveRestriction,
} from "@/lib/auth";
import {
  SharePageWithContact,
} from "@/components/share/SharePageWithContact";
import {
  type SharePageTemplate,
} from "@/components/share/SharePageRenderer";
import { getThemeClasses } from "@/components/theme/presetThemes";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ preview?: string; template?: string }>;
};

function normalizeUsername(handle: string) {
  return handle.trim().toLowerCase();
}

// V2-002：从用户名 -> userId 解析。优先查 Profile，失败时查 UsernameRegistry / History。
// History 保留期内 → 重定向到当前用户名。永久保留/封禁 → 展示规则冻结页。
async function resolveUsernameToProfile(rawUsername: string) {
  const normalized = normalizeUsername(rawUsername);

  // 1. 当前 Profile
  try {
    const profile = await db.profile.findUnique({
      where: { username: normalized },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (profile) return { type: "current", profile } as const;
  } catch {
    // 继续尝试其它路径
  }

  // 2. Registry：当前占用（CURRENT）→ 返回 profile；RESERVED_90_DAYS 在有效期 → 重定向到当前 username
  try {
    const registry = await db.usernameRegistry.findUnique({
      where: { normalizedUsername: normalized },
      select: { userId: true, status: true, reservedUntil: true, displayUsername: true },
    });

    if (registry) {
      if (registry.status === "CURRENT" && registry.userId) {
        const profile = await db.profile.findUnique({
          where: { userId: registry.userId },
          include: { links: { where: { isActive: true }, orderBy: { position: "asc" } } },
        });
        if (profile) return { type: "current", profile } as const;
      }
      if (registry.status === "RESERVED_90_DAYS" && registry.reservedUntil && registry.reservedUntil > new Date() && registry.userId) {
        // 旧 Username → 查找该用户的当前 Profile.username
        const currentProfile = await db.profile.findUnique({
          where: { userId: registry.userId },
          select: { username: true },
        });
        if (currentProfile && normalizeUsername(currentProfile.username) !== normalized) {
          return { type: "reserved-redirect", newUsername: currentProfile.username } as const;
        }
      }
      if (registry.status === "PERMANENTLY_RESERVED") {
        return { type: "permanently-reserved" } as const;
      }
    }
  } catch {
    // 表未迁移：降级，继续后续路径
  }

  // 3. History：保留期内 → 重定向到 replacedBy
  try {
    const historyEntry = await db.usernameHistory.findFirst({
      where: { normalizedUsername: normalized },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    if (historyEntry) {
      if (historyEntry.reservedUntil && historyEntry.reservedUntil > new Date()) {
        if (historyEntry.replacedBy && normalizeUsername(historyEntry.replacedBy) !== normalized) {
          return { type: "reserved-redirect", newUsername: historyEntry.replacedBy } as const;
        }
      }
    }
  } catch {
    // 表未迁移：降级
  }

  return { type: "not-found" } as const;
}

type FoundProfile = Extract<Awaited<ReturnType<typeof resolveUsernameToProfile>>, { type: "current" }>["profile"];
type PublicProfile = FoundProfile;

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await resolveUsernameToProfile(username);

  if (result.type === "not-found" || result.type === "permanently-reserved") {
    return {
      title: `@${username} | Link168`,
      description: `访问 @${username} 的 link168.me 主页。`,
    };
  }

  if (result.type === "reserved-redirect") {
    return {
      title: `@${username} → @${result.newUsername} | Link168`,
      description: `该地址已更新，请访问新的主页 @${result.newUsername}。`,
    };
  }

  const profile = result.profile;
  if (!profile.isPublic) {
    return {
      title: `该主页暂不可访问 | Link168`,
      description: `该页面可能因隐私设置或平台规则已暂停展示。`,
    };
  }

  return {
    title: `${profile.displayName || `@${profile.username}`} | Link168`,
    description: profile.bio || `访问 @${profile.username} 的 link168.me 主页。`,
  };
}

function resolveTemplate(profile: PublicProfile & { template?: string | null }, queryTemplate?: string): SharePageTemplate {
  if (queryTemplate === "creator" || queryTemplate === "conversion" || queryTemplate === "business") {
    return queryTemplate;
  }
  const stored = String(profile.template || "").trim().toLowerCase();
  if (stored === "creator" || stored === "conversion" || stored === "business") return stored;
  return "business";
}

function renderRestrictionBlock(restrictions: ActiveRestriction[]): React.ReactNode {
  if (restrictions.length === 0) return null;
  const types = restrictions.map((r) => r.type);
  if (types.includes("BANNED")) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-red-800">该账号已被封禁</h1>
          <p className="mt-3 text-sm leading-7 text-red-700">该账号因违反平台规则已被封禁，公开主页不可访问。</p>
        </section>
        <Link href="/" className="mt-4 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
      </main>
    );
  }
  if (types.includes("ADMIN_FREEZE")) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-amber-900">该主页暂不可访问</h1>
          <p className="mt-3 text-sm leading-7 text-amber-800">管理员已暂停该主页展示。</p>
        </section>
        <Link href="/" className="mt-4 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
      </main>
    );
  }
  if (types.includes("EMAIL_UNVERIFIED")) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#F3E7D1] text-[#8A6A2E]">
            <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#2B241E]">该主页未完成邮箱验证</h1>
          <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">注册超过 30 天仍未验证邮箱的主页，将暂时暂停公开展示。请用户本人登录后台后重新发起邮箱验证。</p>
          <Link href="/login" className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-sm">登录后台验证</Link>
        </section>
        <Link href="/" className="mt-6 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
      </main>
    );
  }
  return null;
}

function renderRestrictionErrorBlock(): React.ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
        <h1 className="mt-2 text-2xl font-black text-[#2B241E]">服务暂时不可用</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">系统暂时无法验证该主页状态，请稍后再试。</p>
        <Link href="/" className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-sm">返回 Link168</Link>
      </section>
      <Link href="/" className="mt-6 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
    </main>
  );
}

function renderPermanentlyReservedPage(username: string): React.ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
        <h1 className="mt-2 text-2xl font-black text-[#2B241E]">@ {username} 已被保留</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">该公开地址已被系统保留，不再作为普通主页展示。</p>
      </section>
      <Link href="/" className="mt-6 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
    </main>
  );
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  const query = searchParams ? await searchParams : {};
  const isPreview = query.preview === "1";

  const result = await resolveUsernameToProfile(username);

  if (result.type === "not-found") {
    notFound();
  }

  if (result.type === "reserved-redirect") {
    // 旧地址 90 天内重定向到新地址；Next.js permanentRedirect 为 308，仅对当前路径
    // 但 90 天不是永久，这里使用 meta-refresh 的软重定向，避免搜索引擎将旧地址视为永久已迁移
    // 同时提供 JS 跳转与手动点击按钮，满足安全与 SEO 平衡
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
          <h1 className="text-2xl font-black text-[#2B241E]">该主页地址已更新</h1>
          <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">该公开地址已更换为新地址，请访问新的主页。</p>
          <Link href={`/${result.newUsername}`} className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-sm break-all">前往 @{result.newUsername}</Link>
        </section>
        <Link href="/" className="mt-6 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
      </main>
    );
  }

  if (result.type === "permanently-reserved") {
    return renderPermanentlyReservedPage(username);
  }

  const profile = result.profile;

  // V2-002：同步邮箱冻结 + 读取全部有效限制 — 禁止失败静默放行
  let restrictions: ActiveRestriction[] = [];
  let restrictionQueryFailed = false;

  try {
    // 惰性同步邮箱验证冻结（超过 30 天未验证）
    const userBasic = await db.user.findUnique({
      where: { id: profile.userId },
      select: { emailVerified: true, createdAt: true },
    });
    if (userBasic && !userBasic.emailVerified) {
      try {
        await syncEmailVerificationRestriction(profile.userId);
      } catch (err) {
        if (!(err instanceof RestrictionQueryError)) {
          // 非限制服务错误（真实 DB 异常）：不中断，继续读取 getActiveRestrictions 以暴露状态
        }
        // 新表未迁移等情况：降级继续，不伪装成功
      }
    }
    restrictions = await getActiveRestrictions(profile.userId);
  } catch (err) {
    if (err instanceof RestrictionQueryError) {
      restrictionQueryFailed = true;
    } else {
      // 真实 DB 异常：不公开主页（安全原则：不确定时保守）
      restrictionQueryFailed = true;
    }
  }

  if (restrictionQueryFailed) {
    return renderRestrictionErrorBlock();
  }

  const { ok, blockedType } = canShowPublicProfile(restrictions);
  if (!ok) {
    // 若被 BANNED 则展示更明确的冻结页；EMAIL_UNVERIFIED 使用统一逻辑
    if (blockedType) {
      return renderRestrictionBlock(restrictions) || renderRestrictionErrorBlock();
    }
    return renderRestrictionBlock(restrictions) || renderRestrictionErrorBlock();
  }

  if (!profile.isPublic) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
          <h1 className="mt-3 text-2xl font-black text-[#2B241E]">该主页暂不可访问</h1>
          <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">该页面可能因隐私设置已暂停展示。</p>
          <Link href="/register" className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-sm">免费创建我的主页</Link>
        </section>
        <Link href="/" className="mt-6 text-xs text-[#7A6D5E] hover:opacity-80">由 Link168 提供</Link>
      </main>
    );
  }

  const profileWithTemplate = profile as PublicProfile & { template?: string | null };
  const themeName = profile.theme || "Link168 草木默认";
  const template = resolveTemplate(profileWithTemplate, query.template);
  const displayName = profile.displayName || `@${profile.username}`;
  const surfaceClass = getThemeClasses(themeName).surfaceClassName;

  const shareLinks = profile.links.map((item) => {
    const typedItem = item as unknown as {
      type?: string | null;
      payloadJson?: string | null;
      id: string;
      title: string;
      description?: string | null;
      url?: string | null;
      iconUrl?: string | null;
      iconValue?: string | null;
      iconType?: string | null;
    };
    return {
      id: typedItem.id,
      title: typedItem.title,
      description: typedItem.description || null,
      url: typedItem.url ? `/go/${typedItem.id}` : null,
      icon: typedItem.iconUrl || typedItem.iconValue || null,
      type: typedItem.iconType || null,
      componentType: typedItem.type || null,
      payload: typedItem.payloadJson || null,
    };
  });

  const reportUrl = `/report?url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}/${profile.username}`)}`;

  // 获取已激活产品列表
  let products: Array<{
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    priceText: string | null;
    coverImageUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  }> = [];
  try {
    const productsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}/api/${profile.username}/products`,
      { cache: "no-store" }
    );
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      if (productsData.success && Array.isArray(productsData.products)) {
        products = productsData.products;
      }
    }
  } catch {
    // 产品获取失败不影响主页展示
  }

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10 ${surfaceClass}`}>
      {isPreview ? (
        <Link href="/dashboard" className="mb-4 inline-flex w-fit items-center rounded-full bg-[#6F8F4E] px-4 py-2 text-sm font-black text-white shadow-sm">
          返回操作后台
        </Link>
      ) : null}
      <div className="w-full max-w-md mx-auto">
        <SharePageWithContact
          template={template}
          username={profile.username}
          displayName={displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl || null}
          links={shareLinks}
          themeName={themeName}
          showBrandFoot
          reportUrl={reportUrl}
          products={products}
        />
      </div>
    </main>
  );
}
