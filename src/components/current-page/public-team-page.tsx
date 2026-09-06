import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedFactsToRenderModel } from "@/components/current-page/adapters";
import { CurrentPageRenderer } from "@/components/current-page/renderer";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";

const repository = new PrismaCurrentPageRepository();

export function teamPublicIdentity(slug: string, username?: string) {
  const segments = [slug, ...(username ? [username] : [])].map((part) => part.trim().toLowerCase());
  if (segments.some((part) => !/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(part))) notFound();
  return `team/${segments.join("/")}`;
}

export async function teamPageMetadata(publicIdentity: string): Promise<Metadata> {
  const facts = await repository.readPublishedFactsByPublicIdentity(publicIdentity);
  if (!facts.ok) return { title: "Link168", robots: { index: false, follow: false } };
  return {
    title: `${facts.value.profile.displayName} · Link168`,
    description: facts.value.profile.bio || "团队与成员的商业主页",
  };
}

export async function PublicTeamPage({ publicIdentity }: { publicIdentity: string }) {
  const facts = await repository.readPublishedFactsByPublicIdentity(publicIdentity);
  if (!facts.ok) notFound();
  return (
    <main className="min-h-dvh w-full bg-[#F4EEE5] sm:px-4 sm:py-8">
      <CurrentPageRenderer model={publishedFactsToRenderModel(facts.value, publicIdentity)} />
    </main>
  );
}
