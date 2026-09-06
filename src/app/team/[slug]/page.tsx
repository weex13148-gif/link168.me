import { PublicTeamPage, teamPageMetadata, teamPublicIdentity } from "@/components/current-page/public-team-page";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return teamPageMetadata(teamPublicIdentity((await params).slug));
}

export default async function TeamPage({ params }: Props) {
  return <PublicTeamPage publicIdentity={teamPublicIdentity((await params).slug)} />;
}
