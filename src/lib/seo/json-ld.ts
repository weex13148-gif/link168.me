/**
 * JSON-LD 结构化数据生成器
 * 遵循 Schema.org 规范，为公开主页生成富媒体搜索结果所需的结构化数据
 */

export interface PersonSchema {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  alternateName?: string;
  description?: string;
  image?: string;
  url: string;
  jobTitle?: string | null;
  worksFor?: {
    "@type": "Organization";
    name: string;
  } | null;
  email?: string | null;
  telephone?: string | null;
  address?: {
    "@type": "PostalAddress";
    addressLocality?: string;
    streetAddress?: string;
  } | null;
  sameAs?: string[];
}

export interface ProfilePageSchema {
  "@context": "https://schema.org";
  "@type": "ProfilePage";
  mainEntity: PersonSchema;
  dateModified?: string;
  datePublished?: string;
  url: string;
  breadcrumb?: BreadcrumbListSchema;
}

export interface BreadcrumbListSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export interface WebSiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

export interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export function generatePersonSchema(opts: {
  name: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  pageUrl: string;
  jobTitle?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string> | null;
}): PersonSchema {
  const sameAs: string[] = [];

  if (opts.website) sameAs.push(opts.website);
  if (opts.socialLinks) {
    Object.values(opts.socialLinks).forEach((url) => {
      if (typeof url === "string" && url.startsWith("http")) {
        sameAs.push(url);
      }
    });
  }

  const person: PersonSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    alternateName: `@${opts.username}`,
    url: opts.pageUrl,
  };

  if (opts.bio) person.description = opts.bio;
  if (opts.avatarUrl) person.image = opts.avatarUrl;
  if (opts.jobTitle) person.jobTitle = opts.jobTitle;
  if (opts.company) {
    person.worksFor = {
      "@type": "Organization",
      name: opts.company,
    };
  }
  if (opts.email) person.email = opts.email;
  if (opts.phone) person.telephone = opts.phone;
  if (opts.city || opts.address) {
    person.address = {
      "@type": "PostalAddress",
      ...(opts.city ? { addressLocality: opts.city } : {}),
      ...(opts.address ? { streetAddress: opts.address } : {}),
    };
  }
  if (sameAs.length > 0) person.sameAs = sameAs;

  return person;
}

export function generateProfilePageSchema(opts: {
  person: PersonSchema;
  pageUrl: string;
  updatedAt?: Date | null;
  createdAt?: Date | null;
}): ProfilePageSchema {
  const schema: ProfilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: opts.person,
    url: opts.pageUrl,
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Link168",
          item: opts.pageUrl.replace(/\/[^/]+$/, ""),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: opts.person.name,
          item: opts.pageUrl,
        },
      ],
    },
  };

  if (opts.updatedAt) schema.dateModified = opts.updatedAt.toISOString();
  if (opts.createdAt) schema.datePublished = opts.createdAt.toISOString();

  return schema;
}

export function generateWebSiteSchema(opts: {
  name?: string;
  url: string;
  description?: string;
}): WebSiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: opts.name || "Link168",
    url: opts.url,
    description: opts.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${opts.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateOrganizationSchema(opts: {
  name?: string;
  url: string;
  logo?: string;
  description?: string;
}): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name || "Link168",
    url: opts.url,
    logo: opts.logo,
    description: opts.description,
  };
}

export function serializeSchema(schema: unknown): string {
  return JSON.stringify(schema);
}
