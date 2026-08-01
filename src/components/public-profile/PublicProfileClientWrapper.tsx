"use client";

import Link from "next/link";
import { SharePageWithContact } from "@/components/share/SharePageWithContact";
import { MobileOptimizer } from "./MobileOptimizer";
import type { SharePageTemplate } from "@/components/share/SharePageRenderer";
import type { ProductDto } from "@/components/share/PublicProductsSection";

interface PublicProfileClientWrapperProps {
  profileId: string;
  template: SharePageTemplate;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  links: Parameters<typeof SharePageWithContact>[0]["links"];
  themeName: string;
  customTheme?: string | null;
  showBrandFoot?: boolean;
  reportUrl?: string;
  products?: ProductDto[];
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  contactVisibility?: string;
  isPreview?: boolean;
}

export function PublicProfileClientWrapper(props: PublicProfileClientWrapperProps) {
  const {
    isPreview,
    ...sharePageProps
  } = props;

  return (
    <MobileOptimizer>
      {isPreview ? (
        <Link
          href="/console/card"
          className="mb-4 inline-flex w-fit items-center rounded-full bg-[#6F8F4E] px-4 py-2 text-sm font-black text-white shadow-sm"
        >
          返回操作后台
        </Link>
      ) : null}

      <div className="mx-auto w-full max-w-md">
        <SharePageWithContact
          {...sharePageProps}
          renderMode={isPreview ? "preview" : "public"}
        />
      </div>
    </MobileOptimizer>
  );
}
