/**
 * 公开主页 SEO 辅助函数
 * 处理动态标题、描述、Open Graph、Twitter Card、Canonical URL
 */

import type { Metadata } from "next";

export interface PublicProfileSeoInput {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isPublic?: boolean;
  isIndexable?: boolean;
  updatedAt?: Date | null;
  pageUrl: string;
  appUrl: string;
}

export function buildPublicProfileMetadata(input: PublicProfileSeoInput): Metadata {
  const { username, displayName, bio, avatarUrl, isPublic, isIndexable, pageUrl, appUrl } = input;

  const title = displayName || `@${username}`;
  const description = bio || `访问 @${username} 的 Link168 公开主页，查看联系方式、产品服务和社交链接。`;
  const canonicalUrl = `${appUrl}/${username}`;

  const indexable = isPublic && isIndexable;

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: indexable,
      follow: indexable,
      nocache: !indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "profile",
      locale: "zh_CN",
      siteName: "Link168",
      title: `${title} | Link168`,
      description,
      url: canonicalUrl,
      ...(avatarUrl
        ? {
            images: [
              {
                url: avatarUrl,
                width: 400,
                height: 400,
                alt: `${title} 的头像`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: avatarUrl ? "summary" : "summary_large_image",
      title: `${title} | Link168`,
      description,
      ...(avatarUrl ? { images: [avatarUrl] } : {}),
    },
    other: {
      "profile:username": username,
    },
  };

  return metadata;
}

export function buildRestrictedProfileMetadata(username: string, appUrl: string): Metadata {
  return {
    title: `@${username}`,
    description: `访问 @${username} 的 Link168 公开主页。`,
    robots: { index: false, follow: false },
    alternates: { canonical: `${appUrl}/${username}` },
  };
}

export function buildNotFoundMetadata(username: string, appUrl: string): Metadata {
  return {
    title: `页面未找到 | Link168`,
    description: `抱歉，@${username} 的公开主页不存在或已被删除。`,
    robots: { index: false, follow: false },
    alternates: { canonical: `${appUrl}/${username}` },
  };
}
