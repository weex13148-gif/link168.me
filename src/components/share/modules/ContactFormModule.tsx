import type { ContactFormPayload } from "@/features/profile-modules";
import { LeadCaptureModule } from "@/components/share/modules/LeadCaptureModule";

export function ContactFormModule({ payload, profileId, username }: {
  payload: ContactFormPayload;
  profileId?: string;
  username: string;
}) {
  return <LeadCaptureModule payload={payload} profileId={profileId} username={username} sourceComponent="contact_form" />;
}
