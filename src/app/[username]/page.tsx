import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { publishedFactsToRenderModel } from "@/components/current-page/adapters";
import { CurrentPageRenderer } from "@/components/current-page/renderer";
import { CurrentPublicState } from "@/components/current-page/states";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";

export const dynamic = "force-dynamic";

type PublicPageProps = { params: Promise<{ username: string }> };
const repository = new PrismaCurrentPageRepository();

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  if (!username) return { title: "Link168" };
  const facts = await repository.readPublishedFactsByPublicIdentity(username);
  if (!facts.ok) return { title: `@${username} · Link168`, robots: { index: false, follow: false } };
  return {
    title: `${facts.value.profile.displayName || `@${username}`} · Link168`,
    description: facts.value.profile.bio || "Link168 Published Personal Page",
    robots: { index: true, follow: true },
  };
}

export default async function PublicPersonalPage({ params }: PublicPageProps) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  if (!username) notFound();

  const facts = await repository.readPublishedFactsByPublicIdentity(username);
  if (!facts.ok) {
    return <CurrentPublicState title="页面尚未发布" description="当前公开地址没有 Published boundary。Draft 不会直接出现在 Public 页面。" />;
  }

  const model = publishedFactsToRenderModel(facts.value, username);
  return (
    <main className="min-h-dvh w-full bg-[#F4EEE5] sm:px-4 sm:py-8">
      <CurrentPageRenderer model={model} />
    </main>
  );
}

