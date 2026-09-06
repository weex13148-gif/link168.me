import type { Metadata } from "next";
import { TeamJoin } from "@/components/current-team/team-join";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "团队邀请 · Link168", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TeamInvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const [query, user] = await Promise.all([searchParams, getCurrentUserFromCookies()]);
  return <TeamJoin token={typeof query.token === "string" ? query.token : ""} loggedIn={Boolean(user)} />;
}
