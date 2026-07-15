import type { QuotePayload } from "@/features/profile-modules";
import { LeadCaptureModule } from "@/components/share/modules/LeadCaptureModule";

export function QuoteModule({ payload, profileId, username }: {
  payload: QuotePayload;
  profileId?: string;
  username: string;
}) {
  return <LeadCaptureModule payload={payload} profileId={profileId} username={username} sourceComponent="quote" />;
}
