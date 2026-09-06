import { PublicTeamPage, teamPageMetadata, teamPublicIdentity } from "@/components/current-page/public-team-page";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string; username: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug, username } = await params;
  return teamPageMetadata(teamPublicIdentity(slug, username));
}

export default async function MemberPage({ params }: Props) {
  const { slug, username } = await params;
  return <PublicTeamPage publicIdentity={teamPublicIdentity(slug, username)} />;
}
